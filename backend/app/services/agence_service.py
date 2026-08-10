from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.agence import AgenceCreate, AgenceUpdate, AgenceResponse
from app.models.Agence import Agence

def create_agence(db: Session, agence_data: AgenceCreate) -> AgenceResponse:
    existing = db.query(Agence).filter(Agence.nom == agence_data.nom).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agence deja existante",
        )
    agence = Agence(**agence_data.model_dump())
    db.add(agence)
    db.commit()
    db.refresh(agence)
    return agence


def list_agences(db: Session, skip: int = 0, limit: int = 20) -> list[AgenceResponse]:
    return db.query(Agence).offset(skip).limit(limit).all()


def get_agence_by_id(db: Session, agence_id: int) -> AgenceResponse:
    agence = db.query(Agence).filter(Agence.id == agence_id).first()
    if not agence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agence non trouvee",
        )
    return agence


def update_agence(db: Session, agence_id: int, agence_data: AgenceUpdate) -> AgenceResponse:
    agence = db.query(Agence).filter(Agence.id == agence_id).first()
    if not agence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agence non trouvee",
        )
    update_data = agence_data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun champ a modifier",
        )
    if "nom" in update_data:
        duplicate = db.query(Agence).filter(
            Agence.nom == update_data["nom"], Agence.id != agence_id
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agence deja existante",
            )
    for field, value in update_data.items():
        setattr(agence, field, value)
    db.commit()
    db.refresh(agence)
    return agence
