from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func as sqlfunc
from sqlalchemy.exc import IntegrityError

from app.models.Discussion import Discussion
from app.models.MessageDiscussion import MessageDiscussion
from app.models.Dossier import Dossier
from app.models.User import User
from app.schemas.discussion import DiscussionCreate, DiscussionRead, MessageRead
from app.services.access import get_dossier_or_404, verify_dossier_access


def _get_discussion_or_404(discussion_id: int, db: Session) -> Discussion:
    discussion = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion non trouvee")
    return discussion


def verify_and_get_discussion(discussion_id: int, user: User, db: Session) -> Discussion:
    # Helper public pour le endpoint WebSocket : verifie l'acces et renvoie la
    # salle (ou leve HTTPException, convertie en fermeture du socket).
    discussion = _get_discussion_or_404(discussion_id, db)
    _verify_discussion_access(discussion, user, db)
    return discussion


def _verify_discussion_access(discussion: Discussion, user: User, db: Session) -> None:
    # Aujourd'hui toute salle est rattachee a un dossier : l'acces se resout
    # via le dossier. Les futures salles autonomes (groupes, DM) auront leur
    # propre controle base sur une table d'appartenance.
    if discussion.dossier_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acces refuse a cette discussion")
    dossier = db.query(Dossier).filter(Dossier.id == discussion.dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouve")
    verify_dossier_access(dossier, user)


def _to_message_read(message: MessageDiscussion) -> MessageRead:
    return MessageRead(
        id=message.id,
        discussion_id=message.discussion_id,
        auteur_id=message.auteur_id,
        auteur_nom=f"{message.auteur.prenom} {message.auteur.nom}",
        contenu=message.contenu,
        parent_message_id=message.parent_message_id,
        created_at=message.created_at,
        updated_at=message.updated_at,
    )


def create_discussion(data: DiscussionCreate, user: User, db: Session) -> DiscussionRead:
    dossier = None
    if data.dossier_id is not None:
        dossier = get_dossier_or_404(data.dossier_id, db)
        verify_dossier_access(dossier, user)

    discussion = Discussion(
        dossier_id=data.dossier_id,
        created_by_id=user.id,
        sujet=data.sujet.strip(),
        description=data.description,
    )
    db.add(discussion)
    try:
        db.commit()
    except IntegrityError:
        # Une salle existe deja pour ce dossier : on la renvoie plutot que
        # d'echouer (course entre deux ouvertures simultanees).
        db.rollback()
        existing = (
            db.query(Discussion)
            .filter(Discussion.dossier_id == data.dossier_id)
            .first()
        )
        if existing:
            return _to_discussion_read(existing, db)
        raise
    db.refresh(discussion)
    return _to_discussion_read(discussion, db)


def get_or_create_discussion_by_dossier(dossier_id: int, user: User, db: Session, sujet: str) -> DiscussionRead:
    dossier = get_dossier_or_404(dossier_id, db)
    verify_dossier_access(dossier, user)

    existing = (
        db.query(Discussion)
        .filter(Discussion.dossier_id == dossier_id)
        .first()
    )
    if existing:
        return _to_discussion_read(existing, db)
    return create_discussion(
        DiscussionCreate(sujet=sujet, dossier_id=dossier_id),
        user,
        db,
    )


def _to_discussion_read(discussion: Discussion, db: Session) -> DiscussionRead:
    count = (
        db.query(sqlfunc.count(MessageDiscussion.id))
        .filter(MessageDiscussion.discussion_id == discussion.id)
        .scalar()
    )
    return DiscussionRead(
        id=discussion.id,
        dossier_id=discussion.dossier_id,
        created_by_id=discussion.created_by_id,
        sujet=discussion.sujet,
        description=discussion.description,
        created_at=discussion.created_at,
        message_count=count or 0,
    )


def get_discussion_by_dossier(dossier_id: int, user: User, db: Session) -> DiscussionRead | None:
    dossier = get_dossier_or_404(dossier_id, db)
    verify_dossier_access(dossier, user)

    discussion = (
        db.query(Discussion)
        .filter(Discussion.dossier_id == dossier_id)
        .first()
    )
    if not discussion:
        return None
    return _to_discussion_read(discussion, db)


def get_messages(discussion_id: int, user: User, db: Session, skip: int = 0, limit: int = 50) -> dict:
    discussion = _get_discussion_or_404(discussion_id, db)
    _verify_discussion_access(discussion, user, db)

    total = (
        db.query(sqlfunc.count(MessageDiscussion.id))
        .filter(MessageDiscussion.discussion_id == discussion_id)
        .scalar()
    )
    messages = (
        db.query(MessageDiscussion)
        .options(joinedload(MessageDiscussion.auteur))
        .filter(MessageDiscussion.discussion_id == discussion_id)
        .order_by(MessageDiscussion.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"items": [_to_message_read(m) for m in messages], "total": total or 0}


def create_message(discussion_id: int, contenu: str, user: User, db: Session) -> MessageRead:
    discussion = _get_discussion_or_404(discussion_id, db)
    _verify_discussion_access(discussion, user, db)

    message = MessageDiscussion(
        discussion_id=discussion_id,
        auteur_id=user.id,
        contenu=contenu,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    # refresh ne charge pas la relation auteur : on la recharge explicitement
    # pour renseigner auteur_nom sans requete supplementaire dans le schema.
    message = (
        db.query(MessageDiscussion)
        .options(joinedload(MessageDiscussion.auteur))
        .filter(MessageDiscussion.id == message.id)
        .first()
    )
    return _to_message_read(message)
