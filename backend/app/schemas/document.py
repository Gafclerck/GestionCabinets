from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DocumentRead(BaseModel):
    id: int
    dossier_id: int
    uploaded_by_id: int
    nom_fichier: str
    type_mime: Optional[str] = None
    taille_octets: Optional[int] = None
    description: Optional[str] = None
    confidentiel: bool = False
    url_acces: str
    created_at: datetime

    model_config = {"from_attributes": True}