from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, func, JSON
from app.core.base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class HistoriqueAction(Base):
    __tablename__ = "historique_action"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dossier_id: Mapped[int] = mapped_column(ForeignKey("dossier.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)

    action: Mapped[str] = mapped_column(String(100), nullable=False)
    ancienne_valeur: Mapped[dict | None] = mapped_column(JSON)
    nouvelle_valeur: Mapped[dict | None] = mapped_column(JSON)
    commentaire: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    dossier: Mapped["Dossier"] = relationship("Dossier", back_populates="historiques")
    user: Mapped["User"] = relationship("User")
