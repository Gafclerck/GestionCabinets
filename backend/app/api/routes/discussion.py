from fastapi import APIRouter, Query, status

from app.core.deps import SessionDep, CurrentUser
from app.schemas.discussion import DiscussionCreate, DiscussionRead, MessageCreate, MessageRead
from app.services.discussion_service import (
    create_discussion,
    get_discussion_by_dossier,
    get_messages,
    create_message,
)

router = APIRouter()


@router.get("/dossier/{dossier_id}")
def read_discussion_by_dossier(dossier_id: int, db: SessionDep, current_user: CurrentUser) -> DiscussionRead | None:
    return get_discussion_by_dossier(dossier_id, current_user, db)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_room(data: DiscussionCreate, db: SessionDep, current_user: CurrentUser) -> DiscussionRead:
    return create_discussion(data, current_user, db)


@router.get("/{discussion_id}/messages")
def list_messages(
    discussion_id: int,
    db: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    return get_messages(discussion_id, current_user, db, skip=skip, limit=limit)


@router.post("/{discussion_id}/messages", status_code=status.HTTP_201_CREATED)
def send_message(discussion_id: int, data: MessageCreate, db: SessionDep, current_user: CurrentUser) -> MessageRead:
    return create_message(discussion_id, data.contenu, current_user, db)
