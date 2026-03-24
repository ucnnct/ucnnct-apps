# UConnect Demo Runbook

Ce README est un support de demo operatoire.
Il est pense pour une demo `prod` sur `https://uconnect.cc`, avec les commandes a taper, les effets attendus dans l'UI, les preuves en terminal, et les logs a surveiller.

Il couvre :
- connexion / deconnexion utilisateur
- message prive
- creation de groupe
- ajout dans un groupe
- message de groupe
- envoi de fichier
- notifications in-app
- notifications email
- preuves Redis
- preuves notification-service / PostgreSQL
- preuves chat-service / MongoDB
- preuves media-service / MinIO

## 1. Hypotheses de demo

- tu fais la demo depuis `wsl`, puis `ssh rayleigh`
- tu utilises deux comptes demo :
  - `USER_A` = emetteur principal
  - `USER_B` = destinataire principal
- tu ouvres deux navigateurs :
  - fenetre normale pour `USER_A`
  - fenetre privee pour `USER_B`
- tu fais la demo en `prod`

Si tu veux faire la meme chose en `staging`, remplace simplement les variables de namespace, URL et ports.

## 2. Variables a preparer

Depuis `wsl`, puis `ssh rayleigh`, prepare ces variables :

```bash
export NS=prod
export TOOLS_NS=prod
export APP_URL="https://uconnect.cc"

export REDIS_HOST="172.31.250.151"
export REDIS_PORT="6379"

export PGHOST="172.31.255.240"
export PGPORT="5432"
export PGUSER="notificationservice"
export PGPASSWORD="password"
export PGDATABASE="notificationdb_prod"

export MONGO_URI="mongodb://172.31.249.124:27017,172.31.252.5:27017,172.31.249.24:27017/chatdb_prod?replicaSet=rs0"

export MINIO_ENDPOINT="http://172.31.250.151:9000"
export MINIO_BUCKET="uconnect-media"
export MINIO_ACCESS_KEY="minioadmin"
export MINIO_SECRET_KEY="minioadmin"
```

Tu peux ensuite charger les helpers depuis le fichier :

```bash
source ./demo_helpers.sh
```

Verifie ensuite que ton bastion est pret :

```bash
demo_check
```

Si tu veux lire le contenu des helpers avant de les sourcer :

```bash
sed -n '1,240p' ./demo_helpers.sh
```

Avant la demo, remplis :

```bash
export USER_A_ID="<user-a-id>"
export USER_B_ID="<user-b-id>"
export GROUP_ID="<group-id-apres-creation>"
```

Si tu dois retrouver un user id dans Redis :

```bash
rcli --scan --pattern 'directory:user:*'
rcli GET "directory:user:<USER_ID>"
```

## 3. Terminaux a ouvrir

Ouvre au minimum 8 terminaux / onglets.

### T1 - ws-manager

```bash
kubectl logs -f -n "$NS" "$(pod "$NS" ws-manager)" --since=10m | \
grep --line-buffered -E 'New WebSocket connection|Connection closed|FLOW ws\.inbound|FLOW kafka\.consume topic=inapp.notification|FLOW ws\.route'
```

Ce terminal prouve :
- connexion / deconnexion WebSocket
- reception des actions WS
- routage des messages
- routage des notifications in-app

### T2 - chat-service

```bash
kubectl logs -f -n "$NS" "$(pod "$NS" chat-service)" --since=10m | \
grep --line-buffered -E 'FLOW kafka\.consume topic=message.send|FLOW message\.persisted|FLOW kafka\.consume topic=message.status.update'
```

Ce terminal prouve :
- consommation Kafka de `message.send`
- persistence Mongo
- mise a jour des statuts

### T3 - notification-service

```bash
kubectl logs -f -n "$NS" "$(pod "$NS" notification-service)" --since=10m | \
grep --line-buffered -E 'FLOW kafka\.consume|FLOW notification\.dispatch-start|FLOW notification\.handler-selected|FLOW notification\.sent|FLOW notification\.handled'
```

Ce terminal prouve :
- consommation des evenements message / friend / group
- choix de handler
- canal final choisi : `IN_APP` ou `EMAIL`

### T4 - group-service

```bash
kubectl logs -f -n "$NS" "$(pod "$NS" group-service)" --since=10m | \
grep --line-buffered -E 'Group created|Member added|Group deleted|FLOW kafka\.publish topic=.*group\.event'
```

Ce terminal prouve :
- creation de groupe
- ajout d'un membre
- suppression de groupe
- emission Kafka des evenements de groupe

### T5 - user-service

```bash
kubectl logs -f -n "$NS" "$(pod "$NS" user-service)" --since=10m | \
grep --line-buffered -E 'Friend request sent|Friend request accepted|Friend request rejected|Friend removed|FLOW kafka\.publish topic=.*friend\.event'
```

Ce terminal prouve :
- demande d'ami
- acceptation
- rejet
- suppression d'ami
- emission Kafka des evenements amis

### T6 - media-service

```bash
kubectl logs -f -n "$NS" "$(pod "$NS" media-service)" --since=10m | \
grep --line-buffered -E 'File uploaded|File deleted|Prepared download URL|Switching to public media URL'
```

Ce terminal prouve :
- upload effectif du fichier
- creation d'un `objectKey`
- preparation de l'URL de telechargement

### T7 - Redis

Ce terminal sert a relancer ponctuellement :

```bash
show_presence "$USER_A_ID"
show_presence "$USER_B_ID"
show_target_subs "$USER_A_ID"
show_target_subs "$USER_B_ID"
show_user_cache "$USER_A_ID"
show_user_cache "$USER_B_ID"
show_group_cache "$GROUP_ID"
```

### T8 - Notifications PostgreSQL

Relance cette commande apres chaque action qui doit produire une notification :

```bash
notifq
```

Lecture :
- `category` = type fonctionnel de notification
- `decision_type` = canal reel (`IN_APP` ou `EMAIL`)
- `status` = `UNREAD` ou `READ`

### T9 - MongoDB chat (optionnel mais tres utile)

Le helper `mcli` utilise `mongosh` local s'il existe, sinon un pod outil temporaire :

```bash
mcli --eval 'db.messages.find({}, {conversationId:1, type:1, senderId:1, receiversId:1, groupId:1, content:1, objectKey:1, createdAt:1}).sort({createdAt:-1}).limit(10).pretty()'
```

Ce terminal prouve :
- le message est bien stocke en base
- le `objectKey` du fichier est bien persiste

### T10 - MinIO (optionnel)

Le helper `mccli` utilise `mc` local s'il existe, sinon un pod outil temporaire :

```bash
mccli ls --recursive "uconnect/$MINIO_BUCKET"
```

Puis, apres un upload de fichier :

```bash
mccli find "uconnect/$MINIO_BUCKET" --name '*<nom-du-fichier>*'
```

Ce terminal prouve :
- l'objet existe bien dans le bucket `uconnect-media`

## 4. Matrice de notification a annoncer pendant la demo

| Cas | Etat du destinataire | Contexte actif | Decision attendue | Preuve |
| --- | --- | --- | --- | --- |
| Message prive | en ligne | hors conversation | `IN_APP` | log notif + ligne PostgreSQL |
| Message prive | en ligne | dans la conversation privee | `SKIP` | pas de nouvelle notif, pas de nouvelle ligne en DB |
| Message prive | hors ligne | n/a | `EMAIL` | log notif `channel=EMAIL` + DB |
| Message groupe | en ligne | hors conversation de groupe | `IN_APP` | log notif + DB |
| Message groupe | en ligne | dans la meme conversation de groupe | `SKIP` | pas de nouvelle notif, pas de nouvelle ligne en DB |
| Message groupe | hors ligne | n/a | `EMAIL` | log notif `channel=EMAIL` + DB |
| Ajout dans un groupe | en ligne | hors conversation du groupe | `IN_APP` | log notif + DB |
| Ajout dans un groupe | en ligne | conversation du groupe deja ouverte | `SKIP` | pas de nouvelle notif, pas de nouvelle ligne en DB |
| Ajout dans un groupe | hors ligne | n/a | `EMAIL` | log notif `channel=EMAIL` + DB |
| Groupe supprime | en ligne | n/a | `IN_APP` | log notif + DB |
| Groupe supprime | hors ligne | n/a | `EMAIL` | log notif `channel=EMAIL` + DB |
| Friend request / accepted / rejected / removed | en ligne | n/a | `IN_APP` | log notif + DB |
| Friend request / accepted / rejected / removed | hors ligne | n/a | `EMAIL` | log notif `channel=EMAIL` + DB |

Note importante :
- les cas `SKIP` ne sont pas facilement visibles dans les logs actuels car ils sont traces en `DEBUG`
- la vraie preuve d'un `SKIP` est : pas de nouvelle ligne dans `notifications`, et aucun `FLOW notification.sent`

## 5. Demo 1 - Connexion / deconnexion utilisateur

### Action UI

1. connecte `USER_A`
2. connecte `USER_B`
3. ferme ensuite la session de `USER_B` ou deconnecte-la

### Commandes terminal

```bash
show_presence "$USER_A_ID"
show_presence "$USER_B_ID"
show_target_subs "$USER_A_ID"
show_target_subs "$USER_B_ID"
```

### Resultat attendu

- quand l'utilisateur est connecte :
  - `ws:presence:user:<USER_ID>` contient un `instanceId`
  - `ws:context:user:<USER_ID>` contient un JSON avec `page` et eventuellement `conversationId`
- quand l'utilisateur se deconnecte :
  - `ws:presence:user:<USER_ID>` disparait
  - `ws:context:user:<USER_ID>` disparait
  - les subscriptions de presence sont nettoyees

### Logs attendus

Dans `ws-manager` :

```text
New WebSocket connection: sessionId=<...> userId=<USER_ID>
Connection closed: sessionId=<...> userId=<USER_ID> signal=<...>
```

## 6. Demo 2 - Message prive

### Cas A - destinataire en ligne, hors conversation

#### Preparation

- `USER_B` est connecte
- `USER_B` reste sur `/` ou une page autre que `/messages`

Controle rapide :

```bash
show_presence "$USER_B_ID"
```

Le `context` attendu doit ressembler a :

```json
{"page":"/", ...}
```

#### Action UI

- `USER_A` ouvre la conversation privee avec `USER_B`
- `USER_A` envoie un message texte simple

#### Resultat attendu

- `USER_B` recoit le message en temps reel
- `notification-service` choisit `IN_APP`
- une ligne apparait dans PostgreSQL avec :
  - `category=PRIVATE_MESSAGE_IN_APP`
  - `decision_type=IN_APP`

#### Commande de preuve

```bash
notifq
```

#### Logs attendus

Dans `ws-manager` :

```text
FLOW ws.inbound action=SEND_PRIVATE_MESSAGE senderId=<USER_A_ID> messageId=<...> receiversCount=1 step=ws.receive-private
```

Dans `chat-service` :

```text
FLOW kafka.consume topic=message.send messageId=<...> senderId=<USER_A_ID> type=PRIVATE groupId=null step=chat.consume-send
FLOW message.persisted messageId=<...> conversationId=<...> type=PRIVATE step=chat.persisted-db
```

Dans `notification-service` :

```text
FLOW kafka.consume topic=message.persisted messageId=<...> senderId=<USER_A_ID> step=notification.consume-message
FLOW notification.dispatch-start messageId=<...> senderId=<USER_A_ID> targetsCount=1 step=notification.dispatch
FLOW notification.sent channel=IN_APP targetUserId=<USER_B_ID> messageId=<...> notificationId=<...> step=notification.dispatch
```

### Cas B - destinataire en ligne, deja dans la conversation

#### Preparation

- `USER_B` ouvre la conversation avec `USER_A`

Controle rapide :

```bash
show_presence "$USER_B_ID"
```

Le `context` attendu doit ressembler a :

```json
{"page":"CONVERSATION","conversationId":"<USER_A_ID>", ...}
```

#### Action UI

- `USER_A` envoie un second message prive

#### Resultat attendu

- `USER_B` voit le message directement dans la conversation
- aucune notification supplementaire n'est creee
- `notifq` ne montre pas de nouvelle ligne pour ce message
- pas de `FLOW notification.sent` pour ce message dans `notification-service`

### Cas C - destinataire hors ligne

#### Preparation

- deconnecte `USER_B`

#### Action UI

- `USER_A` envoie un nouveau message prive

#### Resultat attendu

- le message est persiste
- `notification-service` choisit `EMAIL`
- une ligne apparait avec :
  - `category=PRIVATE_MESSAGE_IN_APP`
  - `decision_type=EMAIL`

#### Logs attendus

Dans `notification-service` :

```text
FLOW notification.sent channel=EMAIL targetUserId=<USER_B_ID> messageId=<...> email=<...> step=notification.dispatch
```

## 7. Demo 3 - Creation de groupe et ajout d'un membre

Note importante :
- `createGroup` cree le groupe
- la notification de groupe apparait surtout lors du `MEMBER_ADDED`

### Action UI

1. `USER_A` cree un groupe prive, par exemple `Demo Runbook`
2. releve le `GROUP_ID` depuis `group-service` ou Redis
3. `USER_A` ajoute `USER_B` au groupe

### Commandes de preuve

```bash
show_group_cache "$GROUP_ID"
notifq
```

### Resultat attendu

- `group-service` logue la creation du groupe
- la cle Redis `directory:group:<GROUP_ID>` est creee
- l'ajout du membre emet un event Kafka `MEMBER_ADDED`
- selon l'etat de `USER_B` :
  - en ligne hors conversation du groupe => `IN_APP`
  - deja dans la conversation du groupe => `SKIP`
  - hors ligne => `EMAIL`

### Logs attendus

Dans `group-service` :

```text
Group created groupId=<GROUP_ID> name='Demo Runbook' type=PRIVATE ownerId=<USER_A_ID>
Member added groupId=<GROUP_ID> userId=<USER_B_ID> role=MEMBER by=<USER_A_ID>
FLOW kafka.publish topic=group.event eventType=MEMBER_ADDED eventId=<...> recipientUserId=<USER_B_ID> groupId=<GROUP_ID> step=group.event
```

Dans `notification-service` :

```text
FLOW kafka.consume topic=group.event eventId=<...> eventType=MEMBER_ADDED recipientUserId=<USER_B_ID> groupId=<GROUP_ID> step=notification.consume-group
FLOW notification.handled eventId=<...> eventType=MEMBER_ADDED step=notification.group
```

## 8. Demo 4 - Message de groupe

### Cas A - destinataire en ligne, hors conversation de groupe

#### Preparation

- `USER_B` est connecte
- `USER_B` n'est pas sur la conversation du groupe

#### Action UI

- `USER_A` envoie un message dans le groupe

#### Resultat attendu

- `chat-service` persiste le message avec `type=GROUP`
- `notification-service` cree une notification `GROUP_MESSAGE_IN_APP`
- `decision_type=IN_APP`

#### Logs attendus

Dans `ws-manager` :

```text
FLOW ws.inbound action=SEND_GROUP_MESSAGE senderId=<USER_A_ID> messageId=<...> groupId=<GROUP_ID> step=ws.receive-group
```

Dans `chat-service` :

```text
FLOW kafka.consume topic=message.send messageId=<...> senderId=<USER_A_ID> type=GROUP groupId=<GROUP_ID> step=chat.consume-send
FLOW message.persisted messageId=<...> conversationId=<...> type=GROUP step=chat.persisted-db
```

Dans `notification-service` :

```text
FLOW notification.sent channel=IN_APP targetUserId=<USER_B_ID> messageId=<...> notificationId=<...> step=notification.dispatch
```

### Cas B - destinataire en ligne, deja dans la conversation de groupe

#### Preparation

- `USER_B` ouvre la conversation du groupe

Controle rapide :

```bash
show_presence "$USER_B_ID"
```

Le `context` attendu doit ressembler a :

```json
{"page":"CONVERSATION","conversationId":"<GROUP_ID>", ...}
```

#### Action UI

- `USER_A` renvoie un message dans le groupe

#### Resultat attendu

- pas de nouvelle notification
- pas de nouvelle ligne `notifications`
- pas de `FLOW notification.sent`

### Cas C - destinataire hors ligne

#### Preparation

- deconnecte `USER_B`

#### Action UI

- `USER_A` envoie un nouveau message de groupe

#### Resultat attendu

- `decision_type=EMAIL`
- log `channel=EMAIL`

## 9. Demo 5 - Envoi de fichier

### Recommandation

Pour eviter un echec de taille ou de type MIME :
- utilise un petit fichier `.png` ou `.pdf`
- garde le fichier sous `5 MB`

### Action UI

- ouvre une conversation privee ou de groupe
- clique sur le trombone
- envoie un fichier

### Resultat attendu

- `media-service` uploade le fichier dans MinIO
- `chat-service` persiste un message avec :
  - `content=<nom-du-fichier>`
  - `objectKey=chat/<USER_A_ID>/...`
- l'objet existe dans le bucket `uconnect-media`

### Logs attendus

Dans `media-service` :

```text
File uploaded key=chat/<USER_A_ID>/<yyyy>/<MM>/<dd>/<uuid>-<nom-du-fichier> ownerId=<USER_A_ID>
```

Dans `ws-manager` :

```text
FLOW ws.inbound action=SEND_FILE_MESSAGE senderId=<USER_A_ID> messageId=<...> type=<...> groupId=<...> step=ws.receive-file
```

Dans `chat-service` :

```text
FLOW kafka.consume topic=message.send messageId=<...> senderId=<USER_A_ID> type=<PRIVATE|GROUP> groupId=<...> step=chat.consume-send
FLOW message.persisted messageId=<...> conversationId=<...> type=<PRIVATE|GROUP> step=chat.persisted-db
```

### Preuves complementaires

MongoDB :

```bash
mcli --eval 'db.messages.find({objectKey: {$exists: true, $ne: null}}, {conversationId:1, type:1, senderId:1, content:1, objectKey:1, createdAt:1}).sort({createdAt:-1}).limit(5).pretty()'
```

MinIO :

```bash
mccli find "uconnect/$MINIO_BUCKET" --name '*<nom-du-fichier>*'
```

Message a dire pendant la demo :
- `media-service` prouve le traitement HTTP et l'upload
- Mongo prouve la persistence metier du message
- MinIO prouve la presence physique de l'objet

## 10. Demo 6 - Notifications amis

Les evenements disponibles sont :
- `FRIEND_REQUEST_SENT`
- `FRIEND_REQUEST_ACCEPTED`
- `FRIEND_REQUEST_REJECTED`
- `FRIEND_REMOVED`

Particularite importante :
- pour ces 4 cas, si le destinataire est en ligne, la decision est toujours `IN_APP`
- si le destinataire est hors ligne, la decision est `EMAIL`
- il n'y a pas de `SKIP` utile a montrer pour ces evenements actuellement

### Cas A - demande d'ami

#### Action UI

- `USER_A` envoie une demande d'ami a `USER_B`

#### Logs attendus

Dans `user-service` :

```text
Friend request sent requesterId=<USER_A_ID> receiverId=<USER_B_ID>
FLOW kafka.publish topic=friend.event eventType=FRIEND_REQUEST_SENT eventId=<...> recipientUserId=<USER_B_ID> step=user.friend-event
```

Dans `notification-service` :

```text
FLOW kafka.consume topic=friend.event eventId=<...> eventType=FRIEND_REQUEST_SENT recipientUserId=<USER_B_ID> step=notification.consume-friend
FLOW notification.handled eventId=<...> eventType=FRIEND_REQUEST_SENT step=notification.friend
```

Si `USER_B` est en ligne :

```text
FLOW notification.sent channel=IN_APP targetUserId=<USER_B_ID> ...
```

Si `USER_B` est hors ligne :

```text
FLOW notification.sent channel=EMAIL targetUserId=<USER_B_ID> ...
```

### Cas B - acceptation

Action UI :
- `USER_B` accepte la demande

Logs attendus dans `user-service` :

```text
Friend request accepted requesterId=<USER_A_ID> receiverId=<USER_B_ID>
FLOW kafka.publish topic=friend.event eventType=FRIEND_REQUEST_ACCEPTED eventId=<...> recipientUserId=<USER_A_ID> step=user.friend-event
```

### Cas C - rejet

Action UI :
- recree une demande
- `USER_B` la rejette

Logs attendus dans `user-service` :

```text
Friend request rejected requesterId=<USER_A_ID> receiverId=<USER_B_ID>
FLOW kafka.publish topic=friend.event eventType=FRIEND_REQUEST_REJECTED eventId=<...> recipientUserId=<USER_A_ID> step=user.friend-event
```

### Cas D - suppression d'ami

Action UI :
- une fois amis, `USER_A` ou `USER_B` supprime l'amitie

Logs attendus dans `user-service` :

```text
Friend removed userId=<USER_A_ID> friendId=<USER_B_ID>
FLOW kafka.publish topic=friend.event eventType=FRIEND_REMOVED eventId=<...> recipientUserId=<USER_B_ID> step=user.friend-event
```

## 11. Commandes "preuve rapide" a relancer pendant la demo

### Presence / contexte

```bash
show_presence "$USER_A_ID"
show_presence "$USER_B_ID"
```

### Subscriptions de presence

```bash
show_target_subs "$USER_A_ID"
show_target_subs "$USER_B_ID"
```

### Cache user / group

```bash
show_user_cache "$USER_A_ID"
show_user_cache "$USER_B_ID"
show_group_cache "$GROUP_ID"
```

### Inbox notifications

```bash
notifq
```

### Derniers messages en Mongo

```bash
mcli --eval 'db.messages.find({}, {conversationId:1, senderId:1, type:1, content:1, objectKey:1, createdAt:1}).sort({createdAt:-1}).limit(5).pretty()'
```

### Objets dans MinIO

```bash
mccli ls --recursive "uconnect/$MINIO_BUCKET"
```

## 12. Ce qu'il faut dire a l'oral

- `ws-manager` prouve le temps reel, la presence, et le routage utilisateur
- `chat-service` prouve la persistence metier des messages dans MongoDB
- `group-service` prouve la vie du groupe et l'emission des evenements de groupe
- `user-service` prouve la vie de l'amitie et l'emission des evenements amis
- `notification-service` prouve le choix `IN_APP` / `EMAIL` selon presence et contexte
- Redis prouve l'etat temps reel : connecte, page active, abonnements de presence
- PostgreSQL prouve la persistence des notifications
- `media-service` + MinIO prouvent la chaine complete fichier -> objet -> message

## 13. Points d'attention

- les cas `SKIP` sont silencieux a l'ecran car traces en `DEBUG`
- la vraie preuve d'un `SKIP` est l'absence de nouvelle ligne dans `notifications`
- l'ajout dans un groupe notifie ; la simple creation du groupe ne suffit pas
- pour une demo fichier sereine, utilise un petit `png` ou `pdf`
- `demo_helpers.sh` sait utiliser `kubectl run` si `redis-cli`, `psql`, `mongosh` ou `mc` manquent sur le bastion
- le fallback par pod outil suppose que tu peux creer un pod temporaire dans `TOOLS_NS`

## 14. Demo Argo Rollouts en CLI

Objectif :
- montrer le `blueGreen` du front `staging`
- montrer le `canary` du front `prod`
- prouver la coexistence des versions `1.4.3` et `1.5.0`
- tout montrer en CLI

Important :
- pour cette demo, la version de depart doit etre `1.4.3`
- la preuve de version la plus fiable en CLI est l'image du pod selectionne par le service
- la preuve de trafic la plus simple est le hash de l'asset JS servi par l'HTML
- ne base pas ta demo sur `APP_VERSION` dans `config.js`, car cette valeur peut ne pas refleter l'image active

## 15. Demo Argo - staging blueGreen

### 15.1 Etat de depart attendu

Le front actif de `staging` doit etre en `1.4.3`.

Commandes :

```bash
kubectl argo rollouts get rollout web-frontend -n staging
svc_hash staging web-frontend-active
svc_hash staging web-frontend-preview
svc_pod staging web-frontend-active
svc_image staging web-frontend-active
staging_active_asset
staging_preview_asset
```

Resultat attendu :
- `web-frontend-active` pointe vers le ReplicaSet actif
- l'image de `web-frontend-active` est `ghcr.io/ucnnct/uconnect-web-frontend:1.4.3`
- `staging_active_asset` retourne un asset JS stable

### 15.2 Lancer le preview 1.5.0

Commande :

```bash
kubectl argo rollouts set image web-frontend web-frontend=ghcr.io/ucnnct/uconnect-web-frontend:1.5.0 -n staging
rollout_watch staging web-frontend
```

Pendant que le rollout se prepare, montre :

```bash
svc_image staging web-frontend-active
svc_image staging web-frontend-preview
staging_active_asset
staging_preview_asset
```

Resultat attendu :
- `web-frontend-active` reste en `1.4.3`
- `web-frontend-preview` passe en `1.5.0`
- l'asset JS de `staging_active_asset` et `staging_preview_asset` doit etre different
- la version `1.4.3` sert encore l'actif, la `1.5.0` sert le preview

Message a dire :
- en `blueGreen`, l'actif ne bouge pas tant qu'on ne promote pas
- le preview existe en parallele, avec sa propre image et son propre service

### 15.3 Promotion du preview

Commande :

```bash
kubectl argo rollouts promote web-frontend -n staging
rollout_watch staging web-frontend
```

Preuves a relancer :

```bash
svc_image staging web-frontend-active
svc_image staging web-frontend-preview
staging_active_asset
staging_preview_asset
```

Resultat attendu :
- `web-frontend-active` pointe maintenant sur `1.5.0`
- le preview peut rester temporairement present selon l'etat du rollout, mais l'actif a bascule

## 16. Demo Argo - prod canary

### 16.1 Ce que tu veux montrer

En `canary`, tu ne montres pas un switch net comme en `blueGreen`.
Tu montres :
- un `stable` encore en `1.4.3`
- un `canary` en `1.5.0`
- une repartition progressive du trafic

### 16.2 Etat de depart attendu

Avant la demo, il faut que :
- `web-frontend-stable` serve `1.4.3`
- `web-frontend-canary` serve `1.5.0`

Commandes de preuve :

```bash
kubectl argo rollouts get rollout web-frontend -n prod
svc_hash prod web-frontend-stable
svc_hash prod web-frontend-canary
svc_pod prod web-frontend-stable
svc_pod prod web-frontend-canary
svc_image prod web-frontend-stable
svc_image prod web-frontend-canary
prod_stable_asset
prod_canary_asset
```

Resultat attendu :
- `web-frontend-stable` -> `ghcr.io/ucnnct/uconnect-web-frontend:1.4.3`
- `web-frontend-canary` -> `ghcr.io/ucnnct/uconnect-web-frontend:1.5.0`
- `prod_stable_asset` et `prod_canary_asset` renvoient deux assets JS differents

### 16.3 Lancer ou observer le canary

Si le rollout `1.4.3 -> 1.5.0` est deja prepare, contente-toi de l'observer :

```bash
rollout_watch prod web-frontend
```

Si tu veux avancer plus vite pendant une pause :

```bash
kubectl argo rollouts promote web-frontend -n prod
```

Le rollout actuel est defini avec des paliers :

- `10%`
- `25%`
- `50%`
- `100%`

Message a dire :
- le `stable` et le `canary` existent en meme temps
- Argo change seulement la proportion de trafic
- les deux versions restent observables separement via leurs services dedies

### 16.4 Prouver le split sans UI

Preuve 1 - services dedies :

```bash
svc_image prod web-frontend-stable
svc_image prod web-frontend-canary
prod_stable_asset
prod_canary_asset
```

Preuve 2 - trafic public sur sessions fraiches :

```bash
for i in $(seq 1 10); do
  echo -n "$i -> "
  prod_public_asset_fresh_session
done
```

Lecture :
- si le canary est actif et le poids non nul, tu dois voir apparaitre parfois l'asset du `stable`, parfois celui du `canary`
- chaque appel ci-dessus recree une session fraiche, ce qui evite d'etre colle a une seule version a cause du sticky cookie

### 16.5 Ce qu'il faut dire a l'oral

Pour `staging` :
- `blueGreen` = actif et preview sont separes
- on verifie les images par service
- on promote quand on decide

Pour `prod` :
- `canary` = stable et canary coexistent
- on verifie les images par service
- on observe la repartition progressive
- on peut montrer les deux assets distincts et le trafic public sur sessions fraiches

## 17. Helpers Argo a memoriser

```bash
svc_hash staging web-frontend-active
svc_image staging web-frontend-active
svc_image staging web-frontend-preview

svc_hash prod web-frontend-stable
svc_hash prod web-frontend-canary
svc_image prod web-frontend-stable
svc_image prod web-frontend-canary

staging_active_asset
staging_preview_asset
prod_stable_asset
prod_canary_asset
prod_public_asset_fresh_session

rollout_watch staging web-frontend
rollout_watch prod web-frontend
```
