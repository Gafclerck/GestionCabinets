from fastapi import APIRouter, Query, status

from app.core.deps import SessionDep, CurrentUser, RequireChefAgence, RequireChefCentral, RequireChef
from app.schemas.dossier import DossierCreate, DossierAffectation, DossierStatutUpdate, DossierRead, DossierTransfer, DossierUpdateRequest
from app.services.dossier_service import (
    create_dossier,
    list_dossiers,
    get_dossier_by_id,
    affecter_dossier,
    update_dossier,
    update_statut,
    transfer_dossier,
    delete_dossier,
)

router = APIRouter()


@router.post("/create", status_code=status.HTTP_201_CREATED)
def create(dossier: DossierCreate, db: SessionDep, current_user: RequireChef) -> DossierRead:
    return create_dossier(dossier, current_user, db)


@router.get("/all")
def read_all(
    db: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[DossierRead]:
    return list_dossiers(current_user, db, skip=skip, limit=limit)


@router.get("/{dossier_id}")
def read_one(dossier_id: int, db: SessionDep, current_user: CurrentUser) -> DossierRead:
    return get_dossier_by_id(dossier_id, current_user, db)


@router.patch("/{dossier_id}")
def patch(dossier_id: int, data: DossierUpdateRequest, db: SessionDep, current_user: RequireChef) -> DossierRead:
    return update_dossier(dossier_id, data, current_user, db)


@router.patch("/{dossier_id}/affecter")
def affecter(dossier_id: int, data: DossierAffectation, db: SessionDep, current_user: RequireChef) -> DossierRead:
    return affecter_dossier(dossier_id, data, db,current_user)


@router.patch("/{dossier_id}/statut")
def changer_statut(dossier_id: int, data: DossierStatutUpdate, db: SessionDep, current_user: RequireChef) -> DossierRead:
    return update_statut(dossier_id, data, db, current_user)


@router.delete("/{dossier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(dossier_id: int, db: SessionDep, current_user: RequireChef) -> None:
    delete_dossier(dossier_id, db,current_user)


@router.patch("/{dossier_id}/transfer")
def transfer(dossier_id: int, data: DossierTransfer, db: SessionDep, current_user: RequireChef) -> DossierRead:
    return transfer_dossier(dossier_id, data.motif, current_user, db)
