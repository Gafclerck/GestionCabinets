from app.core.base import Base
from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    CHEF_CENTRAL = "chef_central"
    CHEF_AGENCE = "chef_agence"
    AVOCAT = "avocat"


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    agence_id: Mapped[int | None] = mapped_column(ForeignKey("agence.id"), nullable=True)

    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole, native_enum=False, length=50), nullable=False)

    actif: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ATTRIBUTS DE RELATION
    agence: Mapped[Optional["Agence"]] = relationship(back_populates="users", foreign_keys=[agence_id])
    specialites: Mapped[List["UserSpecialite"]] = relationship(back_populates="user")

    dossiers_assignes: Mapped[List["Dossier"]] = relationship(
        back_populates="avocat_assigne", foreign_keys="Dossier.avocat_assigne_id"
    )
    dossiers_supervises: Mapped[List["Dossier"]] = relationship(
        back_populates="avocat_en_chef", foreign_keys="Dossier.avocat_en_chef_id"
    )

    documents_uploades: Mapped[List["Document"]] = relationship(back_populates="uploaded_by")
    messages_envoyes: Mapped[List["MessageDiscussion"]] = relationship(back_populates="auteur")
    notifications: Mapped[List["Notification"]] = relationship(back_populates="destinataire")
    discussions_crees: Mapped[List["Discussion"]] = relationship(back_populates="created_by")
    discussions: Mapped[List["DiscussionParticipant"]] = relationship(back_populates="user")

    analyses_suggerees: Mapped[List["AnalyseIA"]] = relationship(
        back_populates="avocat_suggere", foreign_keys="AnalyseIA.avocat_suggere_id"
    )
    analyses_validees: Mapped[List["AnalyseIA"]] = relationship(
        back_populates="validee_par_user", foreign_keys="AnalyseIA.validee_par"
    )
