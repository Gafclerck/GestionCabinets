from fastapi import APIRouter
from app.services.historiques_service import get_historique_by_dossier_id
from app.core.deps import CurrentUser, SessionDep
from app.schemas.historique import HistoriqueActionRead

router = APIRouter()


@router.get("/dossier/{dossier_id}")
def read_historique(dossier_id: int, user: CurrentUser, db: SessionDep) -> list[HistoriqueActionRead]:
    return get_historique_by_dossier_id(dossier_id, user, db)
