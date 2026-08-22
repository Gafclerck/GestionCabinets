from urllib.parse import quote

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse

from app.core.deps import SessionDep, CurrentUser
from app.core.storage import MAX_FILE_SIZE, ALLOWED_MIME_TYPES
from app.schemas.document import DocumentUpdateRequest
from app.services.document_service import (
    upload_document,
    list_documents,
    get_document,
    get_file_stream,
    delete_document,
    update_document,
)

router = APIRouter()

@router.post("/dossier/{dossier_id}", status_code=201)
async def upload(
    dossier_id: int,
    db: SessionDep,
    current_user: CurrentUser,
    fichier: UploadFile = File(...),
    description: str = Form(""),
    confidentiel: bool = Form(False),
):
    if fichier.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "Type de fichier non supporte")
    # On lit au maximum MAX_FILE_SIZE + 1 octets : un fichier plus gros est
    # refuse sans jamais charger l'integralite en memoire.
    content = await fichier.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "Fichier trop volumineux (max 10 Mo)")
    return upload_document(dossier_id, fichier.filename, fichier.content_type, content, description, confidentiel, current_user, db)


@router.get("/dossier/{dossier_id}")
def list_all(dossier_id: int, db: SessionDep, current_user: CurrentUser):
    return list_documents(dossier_id, current_user, db)


@router.get("/{doc_id}")
def get_one(doc_id: int, db: SessionDep, current_user: CurrentUser):
    return get_document(doc_id, current_user, db)


@router.get("/{doc_id}/fichier")
def download(doc_id: int, db: SessionDep, current_user: CurrentUser):
    chunks, nom_fichier, type_mime = get_file_stream(doc_id, current_user, db)
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{quote(nom_fichier)}"}
    return StreamingResponse(chunks, media_type=type_mime or "application/octet-stream", headers=headers)


@router.patch("/{doc_id}")
def update(doc_id: int, payload: DocumentUpdateRequest, db: SessionDep, current_user: CurrentUser):
    return update_document(doc_id, payload, current_user, db)


@router.delete("/{doc_id}", status_code=204)
def delete(doc_id: int, db: SessionDep, current_user: CurrentUser):
    delete_document(doc_id, current_user, db)