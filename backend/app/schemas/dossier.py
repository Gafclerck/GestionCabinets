from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

from app.models.Dossier import StatutDossier

class DossierCreate(BaseModel):
    client_id: int
    agence_receptrice_id: Optional[int] = None
    avocat_en_chef_id: Optional[int] = None
    type_affaire_id: int
    titre: str = Field(..., min_length=1, max_length=255)
    description_initiale: Optional[str] = None
    priorite: int = Field(1, ge=1, le=5)

    model_config = {"from_attributes": True}


class DossierAffectation(BaseModel):
    agence_assigne_id: int
    avocat_assigne_id: int

    model_config = {"from_attributes": True}


class DossierUpdateRequest(BaseModel):
    # Edition generique du dossier : champs optionnels, non fourni = non modifie.
    # Le statut et l'affectation passent par leurs endpoints dedies (/statut, /affecter).
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    description_initiale: Optional[str] = None
    priorite: Optional[int] = Field(None, ge=1, le=5)
    type_affaire_id: Optional[int] = None
    client_id: Optional[int] = None

    model_config = {"from_attributes": True}


class DossierStatutUpdate(BaseModel):
    statut: StatutDossier

    model_config = {"from_attributes": True}


class DossierTransfer(BaseModel):
    motif: str = Field(..., min_length=1, max_length=500)

    model_config = {"from_attributes": True}


class DossierRead(BaseModel):
    id: int
    reference: str
    titre: str
    description_initiale: Optional[str] = None
    statut: StatutDossier
    priorite: int

    client_id: int
    client_nom: Optional[str] = None

    agence_receptrice_id: int
    agence_receptrice_nom: Optional[str] = None

    avocat_en_chef_id: int
    avocat_en_chef_nom: Optional[str] = None

    agence_assigne_id: Optional[int] = None
    agence_assigne_nom: Optional[str] = None

    avocat_assigne_id: Optional[int] = None
    avocat_assigne_nom: Optional[str] = None

    type_affaire_id: int
    type_affaire_libelle: Optional[str] = None

    date_reception: datetime
    date_affectation: Optional[datetime] = None
    date_cloture: Optional[datetime] = None

    model_config = {"from_attributes": True}
