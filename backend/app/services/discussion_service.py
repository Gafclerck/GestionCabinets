from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc

from app.models.Discussion import Discussion
from app.models.MessageDiscussion import MessageDiscussion
from app.models.Dossier import Dossier
from app.models.User import User, UserRole
from app.schemas.discussion import DiscussionRead, MessageRead


def _verify_user_access(user: User, dossier_id: int, db: Session) -> None:
    dossier = db.query(Dossier).filter(Dossier.id == dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouve")

    if user.role == UserRole.CHEF_CENTRAL:
        return

    if user.role == UserRole.CHEF_AGENCE:
        if dossier.agence_receptrice_id == user.agence_id or dossier.agence_assigne_id == user.agence_id:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acces refuse a ce dossier")

    # AVOCAT
    if dossier.avocat_en_chef_id == user.id or dossier.avocat_assigne_id == user.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acces refuse a ce dossier")


def get_or_create_discussion(dossier_id: int, user: User, db: Session) -> Discussion:
    _verify_user_access(user, dossier_id, db)

    discussion = (
        db.query(Discussion)
        .filter(Discussion.dossier_id == dossier_id)
        .order_by(Discussion.created_at.desc())
        .first()
    )
    if discussion:
        return discussion

    dossier = db.query(Dossier).filter(Dossier.id == dossier_id).first()
    discussion = Discussion(
        dossier_id=dossier_id,
        created_by_id=user.id,
        sujet=f"Discussion - {dossier.reference}", #à revoir il faut un vrai nom de la discussion
    )
    db.add(discussion)
    db.commit()
    db.refresh(discussion)
    return discussion


def get_discussions_by_dossier(dossier_id: int, user: User, db: Session) -> list[DiscussionRead]:
    _verify_user_access(user, dossier_id, db)
    discussions = (
        db.query(Discussion)
        .filter(Discussion.dossier_id == dossier_id)
        .order_by(Discussion.created_at.desc())
        .all()
    )

    result = []
    for d in discussions:
        count = db.query(sqlfunc.count(MessageDiscussion.id)).filter(MessageDiscussion.discussion_id == d.id).scalar()
        result.append(DiscussionRead(
            id=d.id,
            dossier_id=d.dossier_id,
            created_by_id=d.created_by_id,
            sujet=d.sujet,
            created_at=d.created_at,
            message_count=count,
        ))
    return result


def get_messages(discussion_id: int, user: User, db: Session, skip: int = 0, limit: int = 50) -> list[MessageRead]:
    discussion = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion non trouvee")

    _verify_user_access(user, discussion.dossier_id, db)

    messages = (
        db.query(MessageDiscussion)
        .filter(MessageDiscussion.discussion_id == discussion_id)
        .order_by(MessageDiscussion.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [MessageRead.model_validate(m) for m in messages]


def create_message(discussion_id: int, contenu: str, user: User, db: Session) -> MessageRead:
    discussion = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion non trouvee")

    _verify_user_access(user, discussion.dossier_id, db)

    message = MessageDiscussion(
        discussion_id=discussion_id,
        auteur_id=user.id,
        contenu=contenu,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return MessageRead.model_validate(message)
