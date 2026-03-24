#!/usr/bin/env bash

tool_ns() {
  printf '%s\n' "${TOOLS_NS:-${NS:-prod}}"
}

tool_pod_name() {
  printf '%s-%s\n' "$1" "$(date +%s%N)"
}

demo_check() {
  local required="kubectl curl grep head mktemp"
  local optional="redis-cli psql mongosh mc"
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

pod() {
  kubectl get pods -n "$1" -l "app.kubernetes.io/name=$2" -o jsonpath='{.items[0].metadata.name}'
}

rcli() {
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
