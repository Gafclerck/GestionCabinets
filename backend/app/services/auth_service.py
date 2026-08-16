from fastapi.security import OAuth2PasswordRequestForm
from pydantic import ValidationError
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from jwt.exceptions import InvalidTokenError
import jwt

from app.models.User import User, UserRole
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, DUMPMY_HASH
from app.core.config import settings
from app.schemas.user import BaseRegistrationRequest, TokenResponse


def authenticate_user(email: str, password: str, db: Session) -> User | None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        verify_password(password, DUMPMY_HASH)
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def register_user(user_in: BaseRegistrationRequest, db: Session, role: UserRole = UserRole.AVOCAT) -> User:
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    user = User(**user_in.model_dump(exclude={"password"}))
    user.role = role
    user.password_hash = hash_password(user_in.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, form_data: OAuth2PasswordRequestForm) -> TokenResponse:
    user = authenticate_user(form_data.username, form_data.password, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not Authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user.email, "role": user.role.value}
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def refresh_access_token(db: Session, token: str) -> TokenResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expire",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise credentials_exception
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
    except (InvalidTokenError, ValidationError):
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.actif:
        raise credentials_exception
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user.email, "role": user.role.value}
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def get_user_from_token(db: Session, token: str) -> User | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            return None
        username = payload.get("sub")
        if username is None:
            return None
    except (InvalidTokenError, ValidationError):
        return None
    user = db.query(User).filter(User.email == username).first()
    return user


def change_password(db: Session, user: User, ancien_mot_de_passe: str, nouveau_mot_de_passe: str) -> None:
    if not verify_password(ancien_mot_de_passe, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="L'ancien mot de passe est incorrect",
        )
    user.password_hash = hash_password(nouveau_mot_de_passe)
    db.commit()