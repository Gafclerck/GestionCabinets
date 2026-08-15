import uuid
from pathlib import Path
from typing import Iterator
from fastapi import HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from botocore.exceptions import ClientError

from app.core.storage import s3_client, OBJECT_KEY_PREFIX
from app.models.Document import Document
from app.models.User import User
from app.models.HistoriqueAction import HistoriqueAction
from app.schemas.document import DocumentRead
from app.core.config import settings
from app.services.access import (
    get_dossier_or_404,
    verify_dossier_access,
    verify_document_access,
    can_see_confidential,
)

def _to_read(doc: Document) -> DocumentRead:
    return DocumentRead(
        id=doc.id,
        dossier_id=doc.dossier_id,
        uploaded_by_id=doc.uploaded_by_id,
        nom_fichier=doc.nom_fichier,
        type_mime=doc.type_mime,
        taille_octets=doc.taille_octets,
        description=doc.description,
        confidentiel=doc.confidentiel,
        url_acces=f"/api/document/{doc.id}/fichier",
        created_at=doc.created_at,
    )


def get_document_or_404(doc_id: int, db: Session) -> Document:
    document = db.query(Document).filter(Document.id == doc_id).first()
    if not document or document.supprime_le is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document non trouve")
    return document


def upload_document(dossier_id: int, nom_fichier: str, content_type: str | None, content: bytes, description: str, confidentiel: bool, user: User, db: Session) -> DocumentRead:
    dossier = get_dossier_or_404(dossier_id, db)
    verify_dossier_access(dossier, user)

    unique_name = f"{uuid.uuid4()}{Path(nom_fichier).suffix if nom_fichier else ''}"
    object_key = f"{OBJECT_KEY_PREFIX}/{dossier_id}/{unique_name}"

    try:
        s3_client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=object_key,
            Body=content,
            ContentType=content_type,
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))

    document = Document(
        dossier_id=dossier_id,
        uploaded_by_id=user.id,
        nom_fichier=nom_fichier or "unnamed",
        chemin_stockage=object_key,
        type_mime=content_type,
        taille_octets=len(content),
        description=description,
        confidentiel=confidentiel,
    )
    db.add(document)
    db.flush()

    histo = HistoriqueAction(
        dossier_id=dossier_id,
        user_id=user.id,
        action="ajout_document",
        ancienne_valeur=None,
        nouvelle_valeur={"document_id": document.id, "nom_fichier": document.nom_fichier},
        commentaire=description,
    )
    db.add(histo)
    db.commit()
    db.refresh(document)
    return _to_read(document)


def list_documents(dossier_id: int, user: User, db: Session) -> list[DocumentRead]:
    dossier = get_dossier_or_404(dossier_id, db)
    verify_dossier_access(dossier, user)
    query = db.query(Document).filter(Document.dossier_id == dossier_id, Document.supprime_le.is_(None))
    if not can_see_confidential(dossier, user):
        query = query.filter(Document.confidentiel.is_(False))
    documents = query.order_by(Document.created_at.desc()).all()
    return [_to_read(doc) for doc in documents]


def get_document(doc_id: int, user: User, db: Session) -> DocumentRead:
    document = get_document_or_404(doc_id, db)
    dossier = get_dossier_or_404(document.dossier_id, db)
    verify_document_access(document, dossier, user)
    return _to_read(document)


def get_file_stream(doc_id: int, user: User, db: Session) -> tuple[Iterator[bytes], str, str | None]:
    document = get_document_or_404(doc_id, db)
    dossier = get_dossier_or_404(document.dossier_id, db)
    verify_document_access(document, dossier, user)
    try:
        response = s3_client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=document.chemin_stockage)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("NoSuchKey", "404"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier physique non trouve")
        raise HTTPException(status_code=500, detail="Erreur de lecture du fichier")
    body = response["Body"]

    def _iter() -> Iterator[bytes]:
        try:
            yield from body.iter_chunks()
        finally:
            body.close()

    return _iter(), document.nom_fichier, document.type_mime


# Soft delete : on garde le fichier et la ligne, on date la suppression.
def delete_document(doc_id: int, user: User, db: Session) -> None:
    document = get_document_or_404(doc_id, db)
    dossier = get_dossier_or_404(document.dossier_id, db)
    verify_document_access(document, dossier, user)

    document.supprime_le = func.now()

    histo = HistoriqueAction(
        dossier_id=document.dossier_id,
        user_id=user.id,
        action="suppression_document",
        ancienne_valeur={"document_id": document.id, "nom_fichier": document.nom_fichier},
        nouvelle_valeur=None,
    )
    db.add(histo)
    db.commit()