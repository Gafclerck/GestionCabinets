from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.schemas.user import UpdateProfileRequest, UserResponse, UserUpdateRequest
from app.models.User import User


def get_user_by_id(db: Session, user_id: int) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouve",
        )
    return UserResponse.model_validate(user)


def _check_email_available(db: Session, email: str, exclude_user_id: int) -> None:
    existing = db.query(User).filter(User.email == email, User.id != exclude_user_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est deja utilise",
        )


def update_user(db: Session, user_id: int, data: UserUpdateRequest) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouve",
        )
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun champ a modifier",
        )
    if "email" in update_data:
        _check_email_available(db, update_data["email"], user.id)
    password = update_data.pop("password", None)
    for field, value in update_data.items():
        setattr(user, field, value)
    if password:
        user.password_hash = hash_password(password)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


def update_me(db: Session, user: User, data: UpdateProfileRequest) -> UserResponse:
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun champ a modifier",
        )
    if "email" in update_data:
        _check_email_available(db, update_data["email"], user.id)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)