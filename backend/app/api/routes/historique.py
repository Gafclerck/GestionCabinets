from fastapi import APIRouter, Query
from app.services.historiques_service import get_historique_by_dossier_id
from app.core.deps import CurrentUser, SessionDep
from app.schemas.historique import HistoriqueActionPage

router = APIRouter()


@router.get("/dossier/{dossier_id}")
def read_historique(
    dossier_id: int,
    user: CurrentUser,
    db: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> HistoriqueActionPage:
    return get_historique_by_dossier_id(dossier_id, user, db, skip=skip, limit=limit)
