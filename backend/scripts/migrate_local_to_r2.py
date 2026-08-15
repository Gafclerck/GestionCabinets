import argparse
import logging
from pathlib import Path

from botocore.exceptions import ClientError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import engine
from app.core.storage import s3_client, OBJECT_KEY_PREFIX
from app.models.Document import Document

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def migrate(session: Session, delete_local: bool) -> None:
    documents = session.query(Document).order_by(Document.id).all()
    if not documents:
        logger.info("Aucun document en base, rien a migrer")
        return

    uploaded = 0
    failed = 0
    already = 0

    for doc in documents:
        local_path = Path(doc.chemin_stockage)
        if OBJECT_KEY_PREFIX in doc.chemin_stockage:
            already += 1
            logger.info("[%d] deja migre (cle R2) : %s", doc.id, doc.chemin_stockage)
            continue
        if not local_path.exists():
            failed += 1
            logger.error("[%d] fichier local introuvable : %s", doc.id, local_path)
            continue

        object_key = f"{OBJECT_KEY_PREFIX}/{doc.dossier_id}/{local_path.name}"
        try:
            with local_path.open("rb") as f:
                s3_client.put_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=object_key,
                    Body=f.read(),
                    ContentType=doc.type_mime,
                )
        except ClientError as e:
            failed += 1
            logger.error("[%d] echec upload R2 (%s) : %s", doc.id, local_path, e)
            continue

        doc.chemin_stockage = object_key
        if delete_local:
            local_path.unlink(missing_ok=True)
        uploaded += 1
        logger.info("[%d] migre -> %s%s", doc.id, object_key, " (local supprime)" if delete_local else "")

    session.commit()
    logger.info("Migration terminee : %d migres, %d deja migres, %d en echec", uploaded, already, failed)


def main() -> None:
    parser = argparse.ArgumentParser(description="Migre les documents du disque local vers Cloudflare R2")
    parser.add_argument("--delete-local", action="store_true",
                        help="Supprime le fichier local apres un upload R2 reussi (defaut: conserve)")
    args = parser.parse_args()

    with Session(engine) as session:
        migrate(session, args.delete_local)


if __name__ == "__main__":
    main()