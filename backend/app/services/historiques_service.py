from sqlalchemy.orm import Session
from app.models.HistoriqueAction import HistoriqueAction
from app.models.User import User
from app.services.access import get_dossier_or_404, verify_dossier_access
from typing import List


def get_historique_by_dossier_id(dossier_id: int, user: User, db: Session) -> List[HistoriqueAction]:
    dossier = get_dossier_or_404(dossier_id, db)
    verify_dossier_access(dossier, user)
    historiques = (
        db.query(HistoriqueAction)
        .filter(HistoriqueAction.dossier_id == dossier_id)
        .order_by(HistoriqueAction.created_at.desc())
        .all()
    )
    return historiques
