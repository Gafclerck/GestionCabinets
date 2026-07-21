from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MessageCreate(BaseModel):
    contenu: str = Field(..., min_length=1, max_length=5000)


class MessageRead(BaseModel):
    id: int
    discussion_id: int
    auteur_id: int
    contenu: str
    parent_message_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiscussionRead(BaseModel):
    id: int
    dossier_id: int
    created_by_id: int
    sujet: str
    created_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}
