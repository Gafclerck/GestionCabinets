from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import Integer, String, ForeignKey, Boolean, Text, DateTime
from app.core.base import Base
from typing import Optional
from datetime import datetime


class Document(Base):
    __tablename__ = "document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dossier_id: Mapped[int] = mapped_column(ForeignKey("dossier.id"), nullable=False)
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)

    nom_fichier: Mapped[str] = mapped_column(String(255), nullable=False)
    chemin_stockage: Mapped[str] = mapped_column(String(500), nullable=False)
    type_mime: Mapped[Optional[str]] = mapped_column(String(100))
    taille_octets: Mapped[Optional[int]] = mapped_column(Integer)
    description: Mapped[Optional[str]] = mapped_column(Text)
    confidentiel: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    supprime_le: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    dossier: Mapped["Dossier"] = relationship("Dossier", back_populates="documents")
    uploaded_by: Mapped["User"] = relationship("User", back_populates="documents_uploades")
