from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import SessionDep, CurrentUser, RequireChef, RequireChefCentral
from app.models.User import UserRole
from app.schemas.user import CreateUserRequest, UpdateProfileRequest, UserResponse, UserUpdateRequest
from app.services.auth_service import register_user
from app.services.users_service import get_user_by_id, update_me, update_user

router = APIRouter()

# Matrice de permissions : quel role chaque createur peut assigner.
ALLOWED_ROLES = {
    UserRole.CHEF_CENTRAL: {UserRole.CHEF_AGENCE, UserRole.AVOCAT},
    UserRole.CHEF_AGENCE: {UserRole.AVOCAT},
}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(
    data: CreateUserRequest,
    db: SessionDep,
    current_user: RequireChef,
) -> UserResponse:
    if data.role not in ALLOWED_ROLES[current_user.role]:
        allowed = [r.value for r in ALLOWED_ROLES[current_user.role]]
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Vous ne pouvez creer que des comptes : {', '.join(allowed)}",
        )
    return register_user(data, db, role=data.role)


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
