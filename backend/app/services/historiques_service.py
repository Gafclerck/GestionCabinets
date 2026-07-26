from sqlalchemy.orm import Session
from app.models.HistoriqueAction import HistoriqueAction
from app.models.User import User
from typing import List


def get_historique_by_dossier_id(dossier_id: int, user: User, db: Session) -> List[HistoriqueAction]:
    historiques = (
        db.query(HistoriqueAction)
        .filter(HistoriqueAction.dossier_id == dossier_id)
        .order_by(HistoriqueAction.created_at.desc())
        .all()
    )
    return historiques
