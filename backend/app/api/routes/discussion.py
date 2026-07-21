from fastapi import APIRouter, Query, status

from app.core.deps import SessionDep, CurrentUser
from app.schemas.discussion import DiscussionRead, MessageRead, MessageCreate
from app.services.discussion_service import (
    get_discussions_by_dossier,
    get_messages,
    create_message,
)

router = APIRouter()

@router.get("/dossier/{dossier_id}")
def list_discussions(dossier_id: int, db: SessionDep, current_user: CurrentUser) -> list[DiscussionRead]:
    return get_discussions_by_dossier(dossier_id, current_user, db)

@router.get("/{discussion_id}/messages")
def list_messages(
    discussion_id: int,
    db: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> list[MessageRead]:
    return get_messages(discussion_id, current_user, db, skip=skip, limit=limit)

@router.post("/{dossier_id}/messages", status_code=status.HTTP_201_CREATED)
def send_message(dossier_id: int, data: MessageCreate, db: SessionDep, current_user: CurrentUser) -> MessageRead:
    from app.services.discussion_service import get_or_create_discussion
    discussion = get_or_create_discussion(dossier_id, current_user, db)
    return create_message(discussion.id, data.contenu, current_user, db)
