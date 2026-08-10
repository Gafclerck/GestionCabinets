from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.HistoriqueAction import HistoriqueAction
from app.models.User import User
from app.schemas.historique import HistoriqueActionPage, HistoriqueActionRead
from app.services.access import get_dossier_or_404, verify_dossier_access


def get_historique_by_dossier_id(dossier_id: int, user: User, db: Session, skip: int = 0, limit: int = 50) -> HistoriqueActionPage:
    dossier = get_dossier_or_404(dossier_id, db)
    verify_dossier_access(dossier, user)
    total = (
        db.query(func.count(HistoriqueAction.id))
        .filter(HistoriqueAction.dossier_id == dossier_id)
        .scalar()
    )
    historiques = (
        db.query(HistoriqueAction)
        .filter(HistoriqueAction.dossier_id == dossier_id)
        .order_by(HistoriqueAction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return HistoriqueActionPage(
        items=[HistoriqueActionRead.model_validate(h) for h in historiques],
        total=total or 0,
    )
