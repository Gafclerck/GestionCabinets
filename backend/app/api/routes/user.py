from fastapi import APIRouter, Query, status

from app.core.deps import SessionDep, CurrentUser, RequireChefCentral
from app.schemas.user import UpdateProfileRequest, UserResponse, UserUpdateRequest
from app.services.users_service import get_user_by_id, update_me, update_user

router = APIRouter()


@router.patch("/me")
def patch_me(data: UpdateProfileRequest, db: SessionDep, current_user: CurrentUser) -> UserResponse:
    return update_me(db, current_user, data)


@router.get("/all")
def list_users(
    db: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[UserResponse]:
    from app.models.User import User

    users = db.query(User).filter(User.actif == True).offset(skip).limit(limit).all()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/{user_id}")
def read_user(user_id: int, db: SessionDep, current_user: RequireChefCentral) -> UserResponse:
    return get_user_by_id(db, user_id)


@router.patch("/{user_id}")
def patch_user(
    user_id: int, data: UserUpdateRequest, db: SessionDep, current_user: RequireChefCentral
) -> UserResponse:
    return update_user(db, user_id, data)
