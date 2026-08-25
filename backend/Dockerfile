# Build : dependances verrouillees par uv.lock, installees avec le cache
# BuildKit. Runtime : python-slim nu, on ne copie que le venv pret a l'emploi.

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Seuls pyproject + lock sont copies ici : la couche n'est invalidee que si
# les dependances changent, pas quand le code applicatif bouge.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev

FROM python:3.13-slim

RUN addgroup --system app && adduser --system --ingroup app app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv

COPY . .

RUN chown -R app:app /app && chmod +x docker-entrypoint.sh

EXPOSE 8000

USER app

ENTRYPOINT ["./docker-entrypoint.sh"]
