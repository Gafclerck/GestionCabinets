# Hackathon ISM Groupe Special

## Présentation

Description courte du projet.

---

# Structure du projet

```text
project/
│
├── frontend/        # Application cliente React
├── backend/         # API FastAPI
├── docs/            # Documentation du projet
└── README.md
```

---

# Documentation

Chaque partie possède sa propre documentation :

| Partie   | Documentation        |
| -------- | -------------------- |
| Frontend | `frontend/README.md` |
| Backend  | `backend/README.md`  |

---

# Prérequis

- Git
- Node.js (v18+)
- Python 3.12+
- PostgreSQL
- npm

Verification :

```bash
git --version
node --version
python --version
psql --version
```

---

# Récupération du projet

Cloner le dépôt :

```bash
git clone https://github.com/Gafclerck/Hackaton.git
cd Hackaton
```

---

# Lancement de l'application

## Option A : Docker Compose (tout-en-un)

Lance la stack complete : Postgres + backend + frontend. Les migrations Alembic
et la creation du super admin sont automatiques au demarrage du backend.

Prerequis : Docker Desktop (ou docker engine + plugin compose).

### 1. Configurer les variables

```bash
cp .env.example .env
```

Ouvrir `.env` a la racine et remplir au minimum `SECRET_KEY`,
`SUPER_USER_EMAIL` et `SUPER_USER_PASSWORD`.

### 2. Demarrer la stack

```bash
docker compose up -d --build
```

- Frontend : http://localhost:5173
- Swagger : http://localhost:8000/docs

### 3. (Optionnel) Charger des donnees de demo

```bash
docker compose --profile seed up seed
```

La base persiste dans le volume Docker `pgdata` : les donnees survivent a un
`docker compose down`. Pour tout effacer : `docker compose down -v`.

---

## Option B : Installation manuelle

## 1. Créer la base de données PostgreSQL

Se connecter a PostgreSQL et creer la base :

```bash
psql -U postgres
```

```sql
CREATE DATABASE hackaton_dev;
\q
```

Ou directement en ligne de commande :

```bash
createdb -U postgres hackaton_dev
```

> Remplacer `postgres` par votre utilisateur PostgreSQL si necessaire.

---

## 2. Configurer le backend

### Copier le fichier d'environnement

```bash
cd backend
cp .env.example .env
```

Ouvrir `.env` et remplir les valeurs :

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/hackaton_dev
DATABASE_URL_DEV=postgresql://postgres:password@localhost:5432/hackaton_dev
SECRET_KEY=votre-cle-secrete-ici
```

> `SECRET_KEY` doit etre une cle aleatoire. Generer une cle rapide :

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Créer l'environnement virtuel et installer les dépendances

Le backend utilise **uv** (https://docs.astral.sh/uv/). L'installer une seule fois :

```bash
pip install uv
```

Puis, depuis `backend/`, creer le venv et installer les dependances verrouillees :

```bash
uv sync
```

### Lancer les migrations Alembic

Appliquer toutes les migrations pour creer les tables :

```bash
uv run alembic upgrade head
```

### Lancer le backend

```bash
uv run uvicorn app.main:app --reload
```

Le backend est accessible sur :

```
http://localhost:8000
```

Swagger (documentation API) :

```
http://localhost:8000/docs
```

---

## 3. Configurer le frontend

Retourner a la racine du projet :

```bash
cd ../frontend
```

### Installer les dépendances

```bash
npm install
```

### (Optionnel) Configurer l'URL du backend

Par defaut, le frontend appelle `http://localhost:8000`. Si besoin de changer :

```bash
# Creer un fichier .env (optionnel)
echo "VITE_API_URL=http://localhost:8000" > .env
```

### Lancer le frontend

```bash
npm run dev
```

Le frontend est accessible sur :

```
http://localhost:5173
```

---

## 4. Tester l'application

1. Ouvrir `http://localhost:5173` dans le navigateur
2. Se connecter avec un compte demo (boutons sur la page de login)
3. Verifier la documentation API sur `http://localhost:8000/docs`

---

## Récapitulatif des commandes

```bash
# 1. Base de donnees
createdb -U postgres hackaton_dev

# 2. Backend
cd backend
cp .env.example .env          # puis remplir les valeurs
uv sync                       # cree .venv et installe uv.lock
uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# 3. Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev
```

---

# Workflow Git

## Branches principales

### main

Branche de production.

Règles :

- Aucun développement direct.
- Aucun commit direct.
- Aucun push direct.

---

### develop

Branche d'intégration.

Toutes les fonctionnalités validées sont fusionnées dans cette branche avant d'arriver sur `main`.

---

## Création d'une branche

Toujours partir de `develop`.

```bash
git checkout develop
git pull origin develop

git checkout -b feature/nom-fonctionnalite
```

Exemples :

```bash
git checkout -b feature/authentication
git checkout -b feature/dashboard
git checkout -b feature/user-management
```

---

## Développement

Vérifier les modifications :

```bash
git status
```

---

## Commit

Ajouter les fichiers :

```bash
git add .
```

Créer un commit :

```bash
git commit -m "feat(auth): add login endpoint"
```

---

## Push

```bash
git push origin feature/authentication
```

---

## Pull Request

Créer une Pull Request :

```text
feature/*
        ↓
develop
```

Les Pull Requests vers `main` sont interdites sauf validation du projet.

---

# Convention de commits

## Nouvelle fonctionnalité

```text
feat: add login feature
```

## Correction

```text
fix: resolve authentication bug
```

## Documentation

```text
docs: update README
```

## Refactoring

```text
refactor: simplify service layer
```

## Tests

```text
test: add authentication tests
```

---

# Ce qu'il ne faut PAS faire

❌ Commit directement sur `main`

❌ Développer directement sur `develop`

❌ Push du code non testé

❌ Modifier le travail d'un autre membre sans concertation

❌ Committer les fichiers suivants :

```text
.env
node_modules/
dist/
.venv/
__pycache__/
```

❌ Utiliser des messages de commit non explicites :

```text
update
test
aaa
modification
```

---

# Erreurs fréquentes à éviter

## Oublier de synchroniser sa branche

Toujours commencer par :

```bash
git checkout develop
git pull origin develop
```

---

## Travailler plusieurs jours sans pull

Synchroniser régulièrement avec `develop`.

---

## Faire des commits trop volumineux

Préférer plusieurs petits commits cohérents.

---

## Mélanger plusieurs fonctionnalités

Une branche = une fonctionnalité.

---

## Ignorer les conflits Git

Comprendre les conflits avant de les résoudre.

Ne jamais exécuter de commandes de résolution automatique sans comprendre leur impact.

---

# Bonnes pratiques

- Faire des commits fréquents.
- Tester avant chaque push.
- Garder les branches courtes.
- Documenter les décisions importantes.
- Relire son code avant une Pull Request.
- Prévenir l'équipe lorsqu'une modification impacte plusieurs modules.

---

# Support

Pour les détails techniques :

- Voir `frontend/README.md`
- Voir `backend/README.md`
