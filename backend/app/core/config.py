from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    DATABASE_URL_DEV: str
    DATABASE_URL_TEST: str
    API_STR: str = "/api"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ALLOWED_ORIGINS: list[str] = ["*"]
    DEBUG: bool = False
    TESTING_MODE: bool = True
    PRODUCTION_MODE: bool = False
    DEVEL_MODE: bool = False

    SUPER_USER_EMAIL: str
    SUPER_USER_PASSWORD: str

    class Config:
        env_file = ".env"

settings = Settings()