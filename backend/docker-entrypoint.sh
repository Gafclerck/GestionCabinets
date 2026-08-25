#!/bin/bash
set -e

# Si une commande est passee au conteneur (ex: seed via docker compose),
# on l'execute telle quelle. Sinon, demarrage serveur par defaut.
if [ "$#" -gt 0 ]; then
    exec "$@"
fi

echo "[entrypoint] Application des migrations Alembic..."
alembic upgrade head

echo "[entrypoint] Verification du super admin..."
python -m app.initial_data

echo "[entrypoint] Demarrage d'uvicorn sur le port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
