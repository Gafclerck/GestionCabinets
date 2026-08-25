from fastapi import Depends, Request, status, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated
from app.schemas.user import (
    RegistrationRequest,
    ChefCentralRegisterRequest,
    ChefAgenceRegisterRequest,
    ChangePasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.core.deps import SessionDep, CurrentUser, TokenDep, RequireChefCentral, RequireChefAgence, limiter
from app.services.auth_service import register_user, login_user, refresh_access_token, change_password
from app.models.User import UserRole

router = APIRouter()


@router.post("/register")
def register(user: RegistrationRequest, db: SessionDep) -> UserResponse:
    return register_user(user, db, role=user.role)


@router.post("/chef_central/register")
def register_by_chef_central(
    user: ChefCentralRegisterRequest,
    db: SessionDep,
    current_user: RequireChefCentral,
) -> UserResponse:
    return register_user(user, db, role=user.role)


@router.post("/chef_agence/register")
def register_by_chef_agence(
    user: ChefAgenceRegisterRequest,
    db: SessionDep,
    current_user: RequireChefAgence,
) -> UserResponse:
    return register_user(user, db, role=UserRole.AVOCAT)


@router.post("/login")
@limiter.limit("5/minute")
def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: SessionDep,
) -> TokenResponse:
    return login_user(db, form_data)


@router.post("/refresh")
@limiter.limit("10/minute")
def refresh(
    request: Request,
    token: TokenDep,
    db: SessionDep,
) -> TokenResponse:
    return refresh_access_token(db, token)


@router.get("/me")
def get_user(user: CurrentUser) -> UserResponse:
    return user


@router.post("/change-password")
def change_user_password(
    data: ChangePasswordRequest,
    db: SessionDep,
    current_user: CurrentUser,
) -> dict:
    change_password(db, current_user, data.ancien_mot_de_passe, data.nouveau_mot_de_passe)
    return {"detail": "Mot de passe modifie avec succes"}