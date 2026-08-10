from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import Integer, String, Text, ForeignKey
from app.core.base import Base
from typing import List
from datetime import datetime


class Discussion(Base):
    __tablename__ = "discussion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Une discussion est une "salle" generique : elle peut etre rattachee a un
    # dossier (une seule par dossier, d'ou le unique) ou exister seule (NULL)
    # pour de futurs echanges hors dossier (groupes, discussions directes).
    dossier_id: Mapped[int | None] = mapped_column(ForeignKey("dossier.id"), nullable=True, unique=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)

    sujet: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    dossier: Mapped["Dossier"] = relationship("Dossier", back_populates="discussions")
    created_by: Mapped["User"] = relationship("User", back_populates="discussions_crees")
    messages: Mapped[List["MessageDiscussion"]] = relationship("MessageDiscussion", back_populates="discussion")