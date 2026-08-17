from fastapi import APIRouter, Query, status

from app.core.deps import SessionDep, CurrentUser
from app.schemas.client import ClientCreate, ClientUpdate, ClientRead
from app.services.clients_service import (
    create_client,
    list_clients,
    get_client_by_id,
    update_client,
    delete_client,
)

router = APIRouter()


@router.post("/create", status_code=status.HTTP_201_CREATED)
def create(client: ClientCreate, db: SessionDep, current_user: CurrentUser) -> ClientRead:
    return create_client(client, db)


@router.get("/all")
def read_all(
    db: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[ClientRead]:
    return list_clients(skip=skip, limit=limit, db=db)

@router.get("/{client_id}")
def read_one(client_id: int, db: SessionDep, current_user: CurrentUser) -> ClientRead:
    return get_client_by_id(client_id, db)


@router.put("/{client_id}")
def update(client_id: int, data: ClientUpdate, db: SessionDep, current_user: CurrentUser) -> ClientRead:
    return update_client(client_id, data, db)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(client_id: int, db: SessionDep, current_user: CurrentUser) -> None:
    delete_client(client_id, db)
