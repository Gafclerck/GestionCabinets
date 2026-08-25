from pydantic_settings import BaseSettings
from pydantic import model_validator

# Cle de dev connue : pratique pour cloner et demarrer sans .env, mais le
# validateur interdit de l'utiliser en production.
DEV_SECRET_KEY = "dev-secret-key-change-me-in-production-0123456789abcdef"


class Settings(BaseSettings):
    # Environnement d'execution : development (defaut) ou production.
    ENVIRONMENT: str = "development"

    # Source unique de verite pour la base : l'environnement du process la
    # fournit (.env local, docker compose, plateforme cloud). Le defaut SQLite
    # rend un clone fraichement installe fonctionnel sans aucune config.
    DATABASE_URL: str = "sqlite:///./dev.db"

    API_STR: str = "/api"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    SECRET_KEY: str = DEV_SECRET_KEY
    ALGORITHM: str = "HS256"
    ALLOWED_ORIGINS: list[str] = ["*"]
    DEBUG: bool = False

    SUPER_USER_EMAIL: str = "admin@example.com"
    SUPER_USER_PASSWORD: str = "admin-changeme"

    S3_ACCESS_KEY: str = "placeholder"
    S3_SECRET_KEY: str = "placeholder"
    S3_ENDPOINT_URL: str = "https://placeholder.r2.cloudflarestorage.com"
    S3_BUCKET_NAME: str = "placeholder"
    S3_REGION: str = "auto"

    @model_validator(mode="after")
    def check_production_safety(self):
        # Garde-fou anti-drift : on refuse un deploiement production mal
        # configure plutot que de demarrer sur des fondations jetables.
        if self.ENVIRONMENT == "production":
            if self.DATABASE_URL.startswith("sqlite"):
                raise RuntimeError("Refus: ENVIRONMENT=production avec une base SQLite")
            if self.SECRET_KEY == DEV_SECRET_KEY:
                raise RuntimeError("Refus: SECRET_KEY par defaut interdite en production")
        return self

    class Config:
        env_file = ".env"
        # Tolerant aux cles inconnues dans un .env partage ou obsolete :
        # une variable superflue ne doit jamais empecher le demarrage.
        extra = "ignore"

settings = Settings()

if settings.SECRET_KEY == DEV_SECRET_KEY and settings.ENVIRONMENT != "production":
    print("[config] ATTENTION: SECRET_KEY par defaut utilisee - a changer avant tout deploiement")
