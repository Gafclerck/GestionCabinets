import uuid
from pathlib import Path
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.Document import Document
from app.models.User import User
from app.models.HistoriqueAction import HistoriqueAction
from app.schemas.document import DocumentRead
from app.core.storage import UPLOAD_DIR
from app.services.access import get_dossier_or_404, verify_dossier_access


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
    dossier_dir = UPLOAD_DIR / str(dossier_id)
    dossier_dir.mkdir(parents=True, exist_ok=True)
    file_path = dossier_dir / unique_name

    with open(file_path, "wb") as f:
        f.write(content)

    document = Document(
        dossier_id=dossier_id,
        uploaded_by_id=user.id,
        nom_fichier=nom_fichier or "unnamed",
        chemin_stockage=str(file_path),
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
    documents = (
        db.query(Document)
        .filter(Document.dossier_id == dossier_id, Document.supprime_le.is_(None))
        .order_by(Document.created_at.desc())
        .all()
    )
    return [_to_read(doc) for doc in documents]


def get_document(doc_id: int, user: User, db: Session) -> DocumentRead:
    document = get_document_or_404(doc_id, db)
    dossier = get_dossier_or_404(document.dossier_id, db)
    verify_dossier_access(dossier, user)
    return _to_read(document)


def get_file_for_download(doc_id: int, user: User, db: Session) -> tuple[Path, str]:
    document = get_document_or_404(doc_id, db)
    dossier = get_dossier_or_404(document.dossier_id, db)
    verify_dossier_access(dossier, user)
    file_path = Path(document.chemin_stockage)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier physique non trouve")
    return file_path, document.nom_fichier


# Soft delete : on garde le fichier et la ligne, on date la suppression.
def delete_document(doc_id: int, user: User, db: Session) -> None:
    document = get_document_or_404(doc_id, db)
    dossier = get_dossier_or_404(document.dossier_id, db)
    verify_dossier_access(dossier, user)

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
