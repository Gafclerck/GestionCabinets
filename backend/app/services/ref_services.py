from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.Specialite import Specialite
from app.models.TypeAffaire import TypeAffaire
from app.models.Dossier import Dossier
from app.models.UserSpecialite import UserSpecialite
from app.schemas.referentiel import (
    TypeAffaireRead,
    TypeAffaireCreate,
    TypeAffaireUpdate,
    SpecialiteRead,
    SpecialiteCreate,
    SpecialiteUpdate,
)


def generate_code(libelle: str) -> str:
    words = libelle.strip().split()
    code = "".join(w[0] for w in words if w).upper()
    return code[:4]


def create_type_affaire(data: TypeAffaireCreate, db: Session) -> TypeAffaireRead:
    data.libelle = data.libelle.upper().strip()
    existing = db.query(TypeAffaire).filter_by(libelle=data.libelle).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Un type d'affaire avec le libelle '{data.libelle}' existe deja.",
        )
    code = generate_code(data.libelle)
    existing_code = db.query(TypeAffaire).filter_by(code=code).first()
    if existing_code:
        existing_count = db.query(TypeAffaire).filter(TypeAffaire.code.like(f"{code}%")).count()
        code = f"{code}{existing_count + 1}"
    type_affaire = TypeAffaire(**data.model_dump())
    type_affaire.code = code
    db.add(type_affaire)
    db.commit()
    db.refresh(type_affaire)
    return type_affaire


def get_type_affaire_by_id(type_affaire_id: int, db: Session) -> TypeAffaireRead:
    ta = db.query(TypeAffaire).filter(TypeAffaire.id == type_affaire_id).first()
    if not ta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TypeAffaire non trouve",
        )
    return ta


def update_type_affaire(type_affaire_id: int, data: TypeAffaireUpdate, db: Session) -> TypeAffaireRead:
    ta = db.query(TypeAffaire).filter(TypeAffaire.id == type_affaire_id).first()
    if not ta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TypeAffaire non trouve",
        )
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun champ a modifier",
        )
    if "libelle" in update_data:
        new_libelle = update_data["libelle"].upper().strip()
        duplicate = db.query(TypeAffaire).filter(
            TypeAffaire.libelle == new_libelle, TypeAffaire.id != type_affaire_id
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Un type d'affaire avec le libelle '{new_libelle}' existe deja.",
            )
        update_data["libelle"] = new_libelle
    for field, value in update_data.items():
        setattr(ta, field, value)
    db.commit()
    db.refresh(ta)
    return ta


# --- Specialite ---

def create_specialite(data: SpecialiteCreate, db: Session) -> SpecialiteRead:
    data.libelle = data.libelle.upper().strip()
    existing = db.query(Specialite).filter_by(libelle=data.libelle).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Une specialite avec le libelle '{data.libelle}' existe deja.",
        )
    specialite = Specialite(**data.model_dump())
    db.add(specialite)
    db.commit()
    db.refresh(specialite)
    return specialite


def get_specialite_by_id(specialite_id: int, db: Session) -> SpecialiteRead:
    sp = db.query(Specialite).filter(Specialite.id == specialite_id).first()
    if not sp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specialite non trouvee",
        )
    return sp


def update_specialite(specialite_id: int, data: SpecialiteUpdate, db: Session) -> SpecialiteRead:
    sp = db.query(Specialite).filter(Specialite.id == specialite_id).first()
    if not sp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specialite non trouvee",
        )
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun champ a modifier",
        )
    if "libelle" in update_data:
        new_libelle = update_data["libelle"].upper().strip()
        duplicate = db.query(Specialite).filter(
            Specialite.libelle == new_libelle, Specialite.id != specialite_id
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Une specialite avec le libelle '{new_libelle}' existe deja.",
            )
        update_data["libelle"] = new_libelle
    for field, value in update_data.items():
        setattr(sp, field, value)
    db.commit()
    db.refresh(sp)
    return sp


def delete_type_affaire(type_affaire_id: int, db: Session) -> None:
    ta = db.query(TypeAffaire).filter(TypeAffaire.id == type_affaire_id).first()
    if not ta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TypeAffaire non trouve",
        )
    nb_dossiers = db.query(Dossier).filter(Dossier.type_affaire_id == type_affaire_id).count()
    if nb_dossiers > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de supprimer : ce type d'affaire est lie a {nb_dossiers} dossier(s)",
        )
    db.delete(ta)
    db.commit()


def delete_specialite(specialite_id: int, db: Session) -> None:
    sp = db.query(Specialite).filter(Specialite.id == specialite_id).first()
    if not sp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specialite non trouvee",
        )
    nb_avocats = db.query(UserSpecialite).filter(UserSpecialite.specialite_id == specialite_id).count()
    if nb_avocats > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de supprimer : cette specialite est attribuee a {nb_avocats} avocat(s)",
        )
    db.delete(sp)
    db.commit()
