from datetime import datetime
from sqlalchemy import String, DateTime, Index, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.base import Base
from typing import List
from enum import Enum


class ClientType(str, Enum):
    PHYSIQUE = "physique"
    MORAL = "moral"

class Client(Base):
    __tablename__ = "client"
    __table_args__ = (
        Index("ix_client_telephone", "telephone"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    type_client: Mapped[ClientType] = mapped_column(SAEnum(ClientType, native_enum=False, length=50), nullable=False)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    telephone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    nin: Mapped[str] = mapped_column(String(50), nullable=True)
    rccm: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # ATTRIBUT DE RELATION
    dossiers: Mapped[List["Dossier"]] = relationship(back_populates="client")
