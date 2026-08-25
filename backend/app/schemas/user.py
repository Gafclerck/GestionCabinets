from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from app.models.User import UserRole
from typing import Optional


class BaseRegistrationRequest(BaseModel):
    nom: str = Field(..., min_length=1, max_length=100)
    prenom: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    agence_id: Optional[int] = Field(None, gt=0)

    # @field_validator("password")
    # @classmethod
    # def validate_password(cls, v):
    #     if not re.search(r"[A-Z]", v):
    #         raise ValueError("Le mot de passe doit contenir au moins une majuscule")
    #     if not re.search(r"[0-9]", v):
    #         raise ValueError("Le mot de passe doit contenir au moins un chiffre")
    #     return v


class CreateUserRequest(BaseRegistrationRequest):
    role: UserRole = Field(...)


class UserResponse(BaseModel):
    id: int
    nom: str
    prenom: str
    email: str
    role: UserRole
    agence_id: Optional[int] = None
    actif: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    prenom: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    actif: Optional[bool] = None
    role: Optional[UserRole] = None
    agence_id: Optional[int] = Field(None, gt=0)


class UpdateProfileRequest(BaseModel):
    # Profil autonome : l'utilisateur ne peut PAS modifier role / agence / actif.
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    prenom: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None


class ChangePasswordRequest(BaseModel):
    ancien_mot_de_passe: str = Field(..., min_length=1, max_length=100)
    nouveau_mot_de_passe: str = Field(..., min_length=8, max_length=100)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"