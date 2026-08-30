from pydantic import BaseModel, Field
from datetime import datetime

class NotificationRead(BaseModel):
    id:int
    destinataire_id:int
    dossier_id:int
    type:str
    contenu:str
    lien:str 
    lue:bool
    created_at:datetime

class NotificationStats(BaseModel): 
    total_non_lues:int
