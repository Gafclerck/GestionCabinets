from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class HistoriqueActionRead(BaseModel):
    id:int
    dossier_id : int
    user_id: int
    action: str
    ancienne_valeur: dict
    nouvelle_valeur: dict
    commentaire: Optional[str] = Field(default=None)
    created_at: datetime

    model_config = {"from_attributes": True}