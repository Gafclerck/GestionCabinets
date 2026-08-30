from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime, Boolean, ForeignKey, Integer, String, Text, func
from app.core.base import Base
from datetime import datetime


class Notification(Base):
    __tablename__ = "notification"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    destinataire_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    dossier_id: Mapped[int|None] = mapped_column(ForeignKey("dossier.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    contenu: Mapped[str] = mapped_column(Text, nullable=False)
    lue: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    destinataire: Mapped["User"] = relationship("User", back_populates="notifications")
    dossier: Mapped["Dossier"] = relationship("Dossier", back_populates="notifications")
    lien: Mapped[str | None]
