from fastapi import Depends, Request, status, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated
from app.schemas.user import (
    ChangePasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.core.deps import SessionDep, CurrentUser, TokenDep, limiter
from app.services.auth_service import login_user, refresh_access_token, change_password

router = APIRouter()


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