from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MessageCreate(BaseModel):
    contenu: str = Field(..., min_length=1, max_length=5000)


class MessageRead(BaseModel):
    id: int
    discussion_id: int
    auteur_id: int
    auteur_nom: str
    contenu: str
    parent_message_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiscussionCreate(BaseModel):
    sujet: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    # Absent pour une salle autonome (futurs echanges hors dossier).
    dossier_id: Optional[int] = Field(default=None)


class DiscussionRead(BaseModel):
    id: int
    dossier_id: Optional[int] = None
    created_by_id: int
    sujet: str
    description: Optional[str] = None
    created_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}
