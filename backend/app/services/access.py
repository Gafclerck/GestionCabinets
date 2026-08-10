from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.Dossier import Dossier
from app.models.User import User, UserRole


def get_dossier_or_404(dossier_id: int, db: Session) -> Dossier:
    dossier = db.query(Dossier).filter(Dossier.id == dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouve")
    return dossier


def verify_dossier_access(dossier: Dossier, user: User) -> None:
    if user.role == UserRole.CHEF_CENTRAL:
        return
    if user.role == UserRole.CHEF_AGENCE:
        if dossier.agence_receptrice_id == user.agence_id or dossier.agence_assigne_id == user.agence_id:
            return
    else:
        if dossier.avocat_en_chef_id == user.id or dossier.avocat_assigne_id == user.id:
            return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acces non autorise a ce dossier")
