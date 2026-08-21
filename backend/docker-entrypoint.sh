#!/bin/bash
set -e

echo "[entrypoint] Application des migrations Alembic..."
alembic upgrade head

echo "[entrypoint] Verification du super admin..."
python -m app.initial_data

echo "[entrypoint] Demarrage d'uvicorn sur le port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
