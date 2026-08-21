# Architecture Decisions - Infrastructure / Docker

## Vue d'ensemble de la stack

Trois services dans `docker-compose.yml` a la racine :

- `db` : Postgres 17 (alpine), volume nomme `pgdata` pour la persistance, non expose sur l'hote.
- `backend` : image construite depuis `backend/Dockerfile`, port 8000 publie (acces Swagger).
- `frontend` : build Vite multi-stage servi par nginx, port 5173 publie.

Un quatrieme service `seed` existe sous le profil compose `seed` : one-shot qui
peuple la base avec les donnees de demo (`python -m scripts.seed_data`). Il
depend du backend healthy car le seed suppose le schema migre.

## Postgres 17 et pas plus recent

Le volume est monte sur `/var/lib/postgresql/data`. A partir de postgres:18,
l'image officielle a deplace le datadir vers `/var/lib/postgresql/docker` :
monter le chemin historique donnerait un volume silencieusement vide a chaque
recreeation. Rester sur la 17 evite ce piege sans changer quoi que ce soit.

## Orchestration par healthchecks, pas par attente active

L'ordre de demarrage repose sur `depends_on` + `condition: service_healthy` :

```
db (pg_isready) -> backend (GET /docs) -> frontend
```

Pas de boucle "wait-for-it" ni de sleep dans l'entrypoint : docker compose ne
demarre le backend que quand Postgres accepte les connexions. Le healthcheck
backend utilise `urllib` (present dans python-slim) plutot que curl/wget pour
eviter d'installer des paquets supplementaires.

## Entrypoint backend : migrations + superuser automatiques

`backend/docker-entrypoint.sh` enchaine :

1. `alembic upgrade head` : applique les migrations pendantes. Idempotent par
   conception (Alembic suit la version courante dans `alembic_version`).
2. `python -m app.initial_data` : cree le super admin si absent. Le code existant
   (`app/core/db.py:init_db`) verifie deja l'email avant insertion, donc aucun
   changement n'a ete necessaire.
3. `exec uvicorn` : remplace le shell par uvicorn (PID 1 recoit bien les signaux,
   arret propre via SIGTERM).

`set -e` garantit que le conteneur echoue visiblement si une migration casse,
plutot que de demarrer un serveur sur un schema incomplet.

Le script shell impose LF strict : `.gitattributes` a la racine force
`*.sh text eol=lf`, sinon un checkout Windows en CRLF produit
`\r: command not found` dans bash sous Linux.

## Choix du slot DEVEL_MODE pour la BDD conteneurisee

La config existante resout l'URL par priorite TESTING > DEVEL > PRODUCTION.
Plutot que d'ajouter un mode DOCKER (refonte de config.py, db.py et alembic/env.py),
la stack reutilise `DEVEL_MODE=True` + `DATABASE_URL_DEV` pointant vers le
service `db`. Semantiquement coherent : la base conteneurisee EST un Postgres
local de developpement. Aucune ligne de code Python modifiee pour la connexion.

## Reverse proxy nginx : single origin

Le conteneur frontend fait deux choses :

1. Sert les fichiers statiques du build Vite (`dist/`) avec fallback SPA
   (`try_files ... /index.html`) pour que React Router gere les deep links.
2. Proxifie `/api/` vers `http://backend:8000`.

Consequences :

- Le navigateur ne voit qu'une seule origine (`localhost:5173`) : plus besoin de
  CORS pour cette stack, et l'URL du backend n'est jamais exposee.
- Les WebSockets de la messagerie (`/api/ws/discussion/{id}`) passent par le
  meme bloc `location` grace aux headers `Upgrade` / `Connection`.
- `client_max_body_size 15m` : la limite par defaut de nginx est de 1 Mo, ce qui
  rejetterait en 413 les uploads jusqu'a 10 Mo acceptes par l'API.

## VITE_API_URL="/" au build et patch WS cote client

Les variables `VITE_*` sont inlinées dans le bundle JS au moment du build, pas
a l'execution. Le build Docker passe donc `VITE_API_URL=/` (build arg) pour que
axios utilise des URLs relatives contre l'origine nginx.

Seule exception : la construction de l'URL WebSocket dans `useDiscussion.js`,
qui faisait un simple `.replace(/^http/, "ws")` invalide sur une URL relative.
`buildWsUrl` distingue maintenant trois cas :

- `VITE_API_URL` relative -> derive `ws(s)://<origine courante>` depuis
  `window.location` ;
- `VITE_API_URL` absolue http(s) -> comportement historique (replace en ws/wss) ;
- absente -> fallback `http://localhost:8000` (dev local hors Docker, inchangé).

Le dev hors Docker (npm run dev + uvicorn) reste donc exactement comme avant.

## Variables partagees entre services : ancre YAML

`x-backend-env` definit une fois l'environnement backend, reference ensuite par
les services `backend` et `seed`. Sans cela, toute nouvelle variable devrait etre
ajoutee a deux endroits, avec risque de divergence.

## Placeholders S3 sans crash au boot

`Settings` exige les champs `S3_*`, mais `boto3.client(...)` ne se connecte pas a
la creation : il ne valide rien avant le premier appel API. Des placeholders
fournis via `.env` permettent donc a la stack de demarrer sans compte Cloudflare
R2 ; seule la fonctionnalite upload de documents echouera a l'usage. Un defaut
n'a pas ete ajoute dans `config.py` pour garder la config explicite en local.

## Ce que la stack ne couvre volontairement pas

- Pas de TLS / domaine : sujet de deploiement, pas de demo locale.
- Pas de gunicorn + workers uvicorn : un process uvicorn suffit a l'echelle du
  hackathon.
- La persistance des documents reste dans R2 (pas de volume local) : c'est deja
  la conception du projet, le proxy backend ne stocke rien sur disque.
