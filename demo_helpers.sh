#!/usr/bin/env bash

DEMO_ENV_FILE="${UCONNECT_DEMO_ENV_FILE:-$HOME/.uconnect_demo_env}"

demo_load_env() {
  if [ -f "$DEMO_ENV_FILE" ]; then
    # shellcheck disable=SC1090
    . "$DEMO_ENV_FILE"
  fi
}

demo_require_vars() {
  local missing=0
  local var_name

  demo_load_env

  for var_name in "$@"; do
    if [ -z "${!var_name:-}" ]; then
      echo "missing environment variable: $var_name" >&2
      missing=1
    fi
  done

  return "$missing"
}

tool_ns() {
  demo_load_env
  printf '%s\n' "${TOOLS_NS:-${NS:-prod}}"
}

tool_pod_name() {
  printf '%s-%s\n' "$1" "$(date +%s%N)"
}

demo_check() {
  demo_load_env
  local required="kubectl curl grep head mktemp"
  local optional="redis-cli psql mongosh mc kcat kafkacat"
  local cmd

  echo "== commandes locales requises =="
  for cmd in $required; do
    if command -v "$cmd" >/dev/null 2>&1; then
      echo "[ok] $cmd"
    else
      echo "[missing] $cmd"
    fi
  done

  echo
  echo "== clients optionnels =="
  for cmd in $optional; do
    if command -v "$cmd" >/dev/null 2>&1; then
      echo "[ok] $cmd (local)"
    else
      echo "[fallback] $cmd via kubectl run"
    fi
  done

  echo
  if kubectl argo rollouts version >/dev/null 2>&1; then
    echo "[ok] kubectl argo rollouts"
  else
    echo "[missing] kubectl argo rollouts plugin"
  fi
}

kafka_bootstrap() {
  demo_load_env
  printf '%s\n' "${KAFKA_BOOTSTRAP_SERVERS:-172.31.252.118:9092,172.31.249.154:9092,172.31.252.44:9092}"
}

kafka_topic_prefix() {
  demo_load_env
  if [ -n "${KAFKA_TOPIC_PREFIX:-}" ]; then
    printf '%s\n' "$KAFKA_TOPIC_PREFIX"
    return
  fi

  case "${NS:-prod}" in
    prod) printf '%s\n' "" ;;
    *) printf '%s.\n' "${NS:-prod}" ;;
  esac
}

k_topic() {
  local base="$1"
  printf '%s%s\n' "$(kafka_topic_prefix)" "$base"
}

kcat_cli() {
  local bootstrap
  bootstrap="$(kafka_bootstrap)"

  if command -v kcat >/dev/null 2>&1; then
    kcat -b "$bootstrap" "$@"
    return
  fi

  if command -v kafkacat >/dev/null 2>&1; then
    kafkacat -b "$bootstrap" "$@"
    return
  fi

  kubectl run "$(tool_pod_name kcat-cli)" \
    -n "$(tool_ns)" \
    --rm -i --restart=Never \
    --image=edenhill/kcat:1.7.1 \
    --command -- kcat -b "$bootstrap" "$@"
}

kdemo_topics() {
  local base
  for base in keycloak-user-events friend.event group.event group.message group.resolved message.send message.persisted inapp.notification; do
    k_topic "$base"
  done
}

klist_topics() {
  local expected
  expected="$(mktemp)"
  kdemo_topics | sort -u > "$expected"
  kcat_cli -L 2>/dev/null | grep -E "^  topic \"" | sed -E 's/^  topic "([^"]+)".*/\1/' | sort -u | grep -Fx -f "$expected"
  rm -f "$expected"
}

kpeek() {
  local base="$1"
  local count="${2:-5}"
  local topic
  topic="$(k_topic "$base")"
  kcat_cli -C -t "$topic" -o "-$count" -e \
    -f $'-----\nTopic: %t\nPartition: %p Offset: %o\nKey: %k\nPayload: %s\n'
}

kfollow() {
  kfollow_many "$1"
}

kfollow_many() {
  local topics=()
  local base
  local group

  if [ "$#" -eq 0 ]; then
    echo "usage: kfollow_many <topic-base> [<topic-base> ...]" >&2
    return 1
  fi

  group="demo-follow-$(date +%s%N)"

  for base in "$@"; do
    topics+=("$(k_topic "$base")")
  done

  while true; do
    kcat_cli -G "$group" -q -X auto.offset.reset=latest \
      -f $'-----\nTopic: %t\nPartition: %p Offset: %o\nKey: %k\nPayload: %s\n' \
      "${topics[@]}" 2>/dev/null || true
    sleep 1
  done
}

kdemo_private() {
  kfollow_many message.send message.persisted inapp.notification
}

kdemo_group_event() {
  kfollow_many group.event inapp.notification
}

kdemo_group_message() {
  kfollow_many group.message group.resolved message.persisted inapp.notification
}

kdemo_friend() {
  kfollow_many friend.event inapp.notification
}

pod() {
  kubectl get pods -n "$1" -l "app.kubernetes.io/name=$2" -o jsonpath='{.items[0].metadata.name}'
}

rcli() {
  demo_require_vars REDIS_HOST REDIS_PORT || return 1

  if command -v redis-cli >/dev/null 2>&1; then
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --raw "$@"
    return
  fi

  kubectl run "$(tool_pod_name redis-cli)" \
    -n "$(tool_ns)" \
    --rm -i --restart=Never \
    --image=redis:7-alpine \
    --command -- redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --raw "$@"
}

psql_cli() {
  demo_require_vars PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE || return 1

  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="$PGPASSWORD" psql \
      -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
      "$@"
    return
  fi

  kubectl run "$(tool_pod_name psql-cli)" \
    -n "$(tool_ns)" \
    --rm -i --restart=Never \
    --image=postgres:16-alpine \
    --env "PGPASSWORD=$PGPASSWORD" \
    --command -- psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" "$@"
}

mcli() {
  demo_require_vars MONGO_URI || return 1

  if command -v mongosh >/dev/null 2>&1; then
    mongosh "$MONGO_URI" "$@"
    return
  fi

  kubectl run "$(tool_pod_name mongosh-cli)" \
    -n "$(tool_ns)" \
    --rm -i --restart=Never \
    --image=mongo:7 \
    --command -- mongosh "$MONGO_URI" "$@"
}

mccli() {
  demo_require_vars MINIO_ENDPOINT MINIO_ACCESS_KEY MINIO_SECRET_KEY || return 1

  if command -v mc >/dev/null 2>&1; then
    mc alias set uconnect "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1 || true
    mc "$@"
    return
  fi

  kubectl run "$(tool_pod_name mc-cli)" \
    -n "$(tool_ns)" \
    --rm -i --restart=Never \
    --image=minio/mc \
    --env "MINIO_ENDPOINT=$MINIO_ENDPOINT" \
    --env "MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY" \
    --env "MINIO_SECRET_KEY=$MINIO_SECRET_KEY" \
    --command -- sh -lc 'mc alias set uconnect "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null && mc "$@"' sh "$@"
}

notifq() {
  psql_cli -x \
    -c "select notification_id, owner_user_id, target_id, category, decision_type, status, created_at from notifications order by created_at desc limit 10;"
}

show_presence() {
  local user_id="$1"
  echo "== presence =="
  rcli GET "ws:presence:user:$user_id"
  echo
  echo "== active context =="
  rcli GET "ws:context:user:$user_id"
  echo
  echo "== owner subscriptions =="
  rcli SMEMBERS "ws:presence:subs:owner:$user_id"
}

show_target_subs() {
  local user_id="$1"
  echo "== target subscribers =="
  rcli SMEMBERS "ws:presence:subs:target:$user_id"
}

show_user_cache() {
  local user_id="$1"
  rcli GET "directory:user:$user_id"
}

show_group_cache() {
  local group_id="$1"
  rcli GET "directory:group:$group_id"
}

follow_demo_logs() {
  local ns="$1"
  local app="$2"
  local pattern="$3"
  local pod_name="${4:-}"

  if [ -n "$pod_name" ]; then
    kubectl logs -f -n "$ns" "$pod_name" --since=10m | \
      grep --line-buffered -E "$pattern"
    return
  fi

  kubectl logs -f -n "$ns" -l "app.kubernetes.io/name=$app" --all-containers=true --max-log-requests=10 --prefix --since=10m | \
    grep --line-buffered -E "$pattern"
}

wsdemo_logs() {
  local ns="${1:-${NS:-prod}}"
  local pod_name="${2:-}"

  follow_demo_logs \
    "$ns" \
    "ws-manager" \
    'New WebSocket connection|Connection closed|FLOW ws\.inbound|FLOW ws\.route-(local|remote|received|received-not-delivered)|FLOW ws\.deliver-local' \
    "$pod_name"
}

wsdemo_logs_pod() {
  local ns="${1:-${NS:-prod}}"
  local pod_name="${2:-$(pod "$ns" ws-manager)}"
  wsdemo_logs "$ns" "$pod_name"
}

clog() {
  local ns="${1:-${NS:-prod}}"
  local pod_name="${2:-}"
  follow_demo_logs \
    "$ns" \
    "chat-service" \
    'FLOW kafka\.consume topic=message.send|FLOW message\.persisted|FLOW kafka\.consume topic=message.status.update' \
    "$pod_name"
}

nlog() {
  local ns="${1:-${NS:-prod}}"
  local pod_name="${2:-}"
  follow_demo_logs \
    "$ns" \
    "notification-service" \
    'FLOW kafka\.consume|FLOW notification\.dispatch-start|FLOW notification\.handler-selected|FLOW notification\.sent|FLOW notification\.handled' \
    "$pod_name"
}

glog() {
  local ns="${1:-${NS:-prod}}"
  local pod_name="${2:-}"
  follow_demo_logs \
    "$ns" \
    "group-service" \
    'Group created|Member added|Group deleted|FLOW kafka\.publish topic=.*group\.event' \
    "$pod_name"
}

mlog() {
  local ns="${1:-${NS:-prod}}"
  local pod_name="${2:-}"
  follow_demo_logs \
    "$ns" \
    "media-service" \
    'File uploaded|File deleted|Prepared download URL|Switching to public media URL' \
    "$pod_name"
}

ulog() {
  local ns="${1:-${NS:-prod}}"
  local pod_name="${2:-}"
  follow_demo_logs \
    "$ns" \
    "user-service" \
    'Friend request sent|Friend request accepted|Friend request rejected|Friend removed|FLOW kafka\.publish topic=.*friend\.event' \
    "$pod_name"
}

chatlog() {
  clog "$@"
}

notiflog() {
  nlog "$@"
}

grouplog() {
  glog "$@"
}

medialog() {
  mlog "$@"
}

userlog() {
  ulog "$@"
}

alias ws-manager='wsdemo_logs "${NS:-prod}"'
alias chat-service='clog "${NS:-prod}"'
alias notification-service='nlog "${NS:-prod}"'
alias group-service='glog "${NS:-prod}"'
alias media-service='mlog "${NS:-prod}"'
alias user-service='ulog "${NS:-prod}"'

rollout_watch() {
  local ns="$1"
  local name="$2"
  kubectl argo rollouts get rollout "$name" -n "$ns" --watch
}

svc_hash() {
  local ns="$1"
  local svc="$2"
  kubectl get svc -n "$ns" "$svc" -o jsonpath='{.spec.selector.rollouts-pod-template-hash}'
  echo
}

svc_pod() {
  local ns="$1"
  local svc="$2"
  local hash
  hash="$(svc_hash "$ns" "$svc")"
  kubectl get pods -n "$ns" -l "rollouts-pod-template-hash=$hash" -o jsonpath='{.items[0].metadata.name}'
  echo
}

svc_image() {
  local ns="$1"
  local svc="$2"
  kubectl get pod -n "$ns" "$(svc_pod "$ns" "$svc")" -o jsonpath='{.spec.containers[0].image}'
  echo
}

asset_from_html() {
  local url="$1"
  curl -ks "$url" | grep -o '/assets/index-[^"]*\.js[^"]*' | head -n 1
}

staging_active_asset() {
  asset_from_html "http://172.31.253.170:30081/"
}

staging_preview_asset() {
  asset_from_html "http://172.31.253.170:30084/"
}

prod_stable_asset() {
  asset_from_html "http://172.31.253.170:30082/"
}

prod_canary_asset() {
  asset_from_html "http://172.31.253.170:30083/"
}

prod_public_asset_fresh_session() {
  local jar
  jar="$(mktemp)"
  curl -ks -c "$jar" -b "$jar" "https://uconnect.cc/" | grep -o '/assets/index-[^"]*\.js[^"]*' | head -n 1
  rm -f "$jar"
}

verwatch() {
  local url="${1:-http://172.31.253.170:30082/__meta/version}"
  local interval="${2:-0.5}"

  echo "# watching ${url} every ${interval}s" >&2

  while true; do
    printf '%s ' "$(date '+%H:%M:%S.%3N')"
    curl -s "${url}?ts=$(date +%s%N)"
    printf '\n'
    sleep "$interval"
  done
}

verstable() {
  verwatch "http://172.31.253.170:30082/__meta/version" "${1:-0.5}"
}

vercanary() {
  verwatch "http://172.31.253.170:30083/__meta/version" "${1:-0.5}"
}

verpublic() {
  verwatch "https://uconnect.cc/__meta/version" "${1:-0.5}"
}

demo_load_env
