from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import Integer, String, Text, ForeignKey
from app.core.base import Base
from typing import List
from datetime import datetime

class DiscussionParticipant(Base):
    __tablename__ = "discussion_participant"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    discussion_id: Mapped[int] = mapped_column(ForeignKey("discussion.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    last_read_at: Mapped[datetime]=mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    discussion: Mapped["Discussion"] = relationship("Discussion", back_populates="participants")
    user: Mapped["User"] = relationship("User", back_populates="discussions")
