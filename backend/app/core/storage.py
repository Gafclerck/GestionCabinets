import boto3
from botocore.client import Config
from .config import settings

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 Mo

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
}

# Prefixe de la cle des objets R2 : documents/{dossier_id}/{uuid}{ext}.
OBJECT_KEY_PREFIX = "documents"

# Client S3-compatible (Cloudflare R2). L'API S3 est identique, seule la
# config change : endpoint R2, region "auto" (ignoree par R2, requise par
# la signature v4 de boto3).
s3_client = boto3.client(
    "s3",
    endpoint_url=settings.S3_ENDPOINT_URL,
    aws_access_key_id=settings.S3_ACCESS_KEY,
    aws_secret_access_key=settings.S3_SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name=settings.S3_REGION,
)