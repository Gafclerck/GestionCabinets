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

    S3_ACCESS_KEY : str
    S3_SECRET_KEY : str
    S3_ENDPOINT_URL : str
    S3_BUCKET_NAME : str
    S3_REGION : str = "auto"

    class Config:
        env_file = ".env"

settings = Settings()
