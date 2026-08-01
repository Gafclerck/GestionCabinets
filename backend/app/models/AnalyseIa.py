from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, func, Float, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.base import Base
from typing import Optional


class AnalyseIA(Base):
    __tablename__ = "analyse_ia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dossier_id: Mapped[int] = mapped_column(ForeignKey("dossier.id"), nullable=False)
    resume_genere: Mapped[str] = mapped_column(Text, nullable=False)
    type_detecte: Mapped[str] = mapped_column(String(100), nullable=False)
    mots_cles: Mapped[dict] = mapped_column(JSON, nullable=False)
    agence_suggeree_id: Mapped[int | None] = mapped_column(ForeignKey("agence.id"))
    avocat_suggere_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"))
    score_confiance: Mapped[float] = mapped_column(Float, nullable=False)
    modele_ia: Mapped[str] = mapped_column(String(100), nullable=False)
    validee: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    validee_par: Mapped[int | None] = mapped_column(ForeignKey("user.id"))
    validee_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    dossier: Mapped["Dossier"] = relationship("Dossier", back_populates="analyse_ia")
    agence_suggeree: Mapped[Optional["Agence"]] = relationship("Agence", foreign_keys=[agence_suggeree_id])
    avocat_suggere: Mapped[Optional["User"]] = relationship("User", foreign_keys=[avocat_suggere_id], back_populates="analyses_suggerees")
    validee_par_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[validee_par], back_populates="analyses_validees")
