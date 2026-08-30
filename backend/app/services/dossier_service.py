from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from app.models.Dossier import Dossier, StatutDossier
from app.models.User import User, UserRole
from app.models.Client import Client
from app.models.Agence import Agence
from app.models.TypeAffaire import TypeAffaire
from app.models.HistoriqueAction import HistoriqueAction
from app.schemas.dossier import DossierCreate, DossierAffectation, DossierStatutUpdate, DossierRead, DossierUpdateRequest
from app.services.notification_service import create_notification

# Transitions de statut autorisees
TRANSITIONS_VALIDES = {
    StatutDossier.EN_ATTENTE: {StatutDossier.EN_ATTENTE_AFFECTATION, StatutDossier.EN_COURS, StatutDossier.ARCHIVE},
    StatutDossier.EN_ATTENTE_AFFECTATION: {StatutDossier.EN_COURS},
    StatutDossier.EN_COURS: {StatutDossier.TERMINE, StatutDossier.ARCHIVE},
    StatutDossier.TERMINE: {StatutDossier.ARCHIVE},
    StatutDossier.ARCHIVE: set(),
}

# A revoir au lieu ed filtrer et prendre les champs specifque on renvoi des models imbriques le front
# se chargera d'afficher ce qu'il veux
# Probleme de  dette version : du verfitting avec le front ce qui n'est pas bien
def _to_read(d: Dossier, motif_transfert: Optional[str] = None) -> DossierRead:
    return DossierRead(
        id=d.id,
        reference=d.reference,
        titre=d.titre,
        description_initiale=d.description_initiale,
        statut=d.statut,
        priorite=d.priorite,
        client_id=d.client_id,
        client_nom=d.client.nom if d.client else None,
        agence_receptrice_id=d.agence_receptrice_id,
        agence_receptrice_nom=d.agence_receptrice.nom if d.agence_receptrice else None,
        avocat_en_chef_id=d.avocat_en_chef_id,
        avocat_en_chef_nom=f"{d.avocat_en_chef.prenom} {d.avocat_en_chef.nom}" if d.avocat_en_chef else None,
        agence_assigne_id=d.agence_assigne_id,
        agence_assigne_nom=d.agence_assigne.nom if d.agence_assigne else None,
        avocat_assigne_id=d.avocat_assigne_id,
        avocat_assigne_nom=f"{d.avocat_assigne.prenom} {d.avocat_assigne.nom}" if d.avocat_assigne else None,
        type_affaire_id=d.type_affaire_id,
        type_affaire_libelle=d.type_affaire.libelle if d.type_affaire else None,
        date_reception=d.date_reception,
        date_affectation=d.date_affectation,
        date_cloture=d.date_cloture,
        motif_transfert=motif_transfert,
    )


# Motif du dernier transfert d'un dossier. Le motif n'est pas une colonne du dossier :
# il est historique dans HistoriqueAction (action="transfert", commentaire=motif).
# Le calculer depuis l'historique evite une migration et conserve le dernier motif connu.
def _latest_transfert_motif(db: Session, dossier_id: int) -> Optional[str]:
    histo = (
        db.query(HistoriqueAction)
        .filter(HistoriqueAction.dossier_id == dossier_id, HistoriqueAction.action == "transfert")
        .order_by(HistoriqueAction.created_at.desc())
        .first()
    )
    return histo.commentaire if histo else None


# Version groupee pour la liste : une seule requete pour tous les dossiers de la page (pas de N+1).
def _transfert_motifs_for(db: Session, dossier_ids: list[int]) -> dict[int, str]:
    if not dossier_ids:
        return {}
    rows = (
        db.query(HistoriqueAction.dossier_id, HistoriqueAction.commentaire)
        .filter(
            HistoriqueAction.dossier_id.in_(dossier_ids),
            HistoriqueAction.action == "transfert",
        )
        .order_by(HistoriqueAction.created_at.desc())
        .all()
    )
    motifs: dict[int, str] = {}
    for dossier_id, commentaire in rows:
        if dossier_id not in motifs:
            motifs[dossier_id] = commentaire
    return motifs

# A renforcer plus tard 
def _generate_reference(db: Session) -> str:
    annee = datetime.now(timezone.utc).year
    prefixe = f"DG-{annee}-"
    last = (
        db.query(Dossier)
        .filter(Dossier.reference.like(f"{prefixe}%"))
        .order_by(Dossier.reference.desc())
        .first()
    )
    if last:
        num = int(last.reference.split("-")[-1]) + 1
    else:
        num = 1
    return f"{prefixe}{num:05d}"


# le dossier doit etre lie a un client, à une agence(au moins celle qui la soumis) et ausssi un avocat en chef 
# (celui qui a soumis le dossier ou celui qui est le chef de l'agence)
# le type d'affaire aussi est obligatoire
def _verify_foreign_keys(data: DossierCreate, db: Session, agence_receptrice_id: int, avocat_en_chef_id: int) -> None:
    if not db.query(Client).filter(Client.id == data.client_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouve")
    if not db.query(Agence).filter(Agence.id == agence_receptrice_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agence receptrice non trouvee")
    if not db.query(User).filter(User.id == avocat_en_chef_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avocat en chef non trouve")
    if not db.query(TypeAffaire).filter(TypeAffaire.id == data.type_affaire_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Type d'affaire non trouve")


def create_dossier(data: DossierCreate, user: User, db: Session) -> DossierRead:
    agence_receptrice_id = user.agence_id
    if not agence_receptrice_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'utilisateur n'est lie a aucune agence",
        )
    
    if data.avocat_en_chef_id:
        avocat_en_chef_id = data.avocat_en_chef_id
    elif user.role == UserRole.CHEF_AGENCE or user.role == UserRole.CHEF_CENTRAL:
        avocat_en_chef_id = user.id
    else:
        chef = (
            db.query(User)
            .filter(User.agence_id == agence_receptrice_id, User.role == UserRole.CHEF_AGENCE, User.actif == True)
            .first()
        )
        if not chef:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aucun chef d'agence trouve pour cette agence",
            )
        avocat_en_chef_id = chef.id

    _verify_foreign_keys(data, db, agence_receptrice_id, avocat_en_chef_id)
    reference = _generate_reference(db)
    dossier = Dossier(
        client_id=data.client_id,
        agence_receptrice_id=agence_receptrice_id,
        avocat_en_chef_id=avocat_en_chef_id,
        type_affaire_id=data.type_affaire_id,
        reference=reference,
        titre=data.titre,
        description_initiale=data.description_initiale,
        statut=StatutDossier.EN_ATTENTE,
        priorite=data.priorite,
    )
    db.add(dossier)
    db.flush()
    histo = HistoriqueAction(
        dossier_id=dossier.id,
        user_id=user.id,
        action="creation",
        ancienne_valeur=None,
        nouvelle_valeur=DossierRead.model_validate(dossier).model_dump(mode="json"),
        commentaire="",
        created_at=datetime.now(timezone.utc),
    )
    db.add(histo)
    db.commit()
    db.refresh(dossier)
    return _to_read(dossier)


def _apply_role_filter(query, user: User):
    if user.role == UserRole.CHEF_CENTRAL:
        return query
    if user.role == UserRole.CHEF_AGENCE:
        return query.filter(
            (Dossier.agence_receptrice_id == user.agence_id)
            | (Dossier.agence_assigne_id == user.agence_id)
        )
    # AVOCAT
    return query.filter(
        (Dossier.avocat_en_chef_id == user.id)
        | (Dossier.avocat_assigne_id == user.id)
    )


def list_dossiers(user: User, db: Session, skip: int = 0, limit: int = 20) -> list[DossierRead]:
    query = db.query(Dossier)
    query = _apply_role_filter(query, user)
    dossiers = query.order_by(Dossier.date_reception.desc()).offset(skip).limit(limit).all()
    motifs = _transfert_motifs_for(db, [d.id for d in dossiers])
    return [_to_read(d, motifs.get(d.id)) for d in dossiers]


def get_dossier_by_id(dossier_id: int, user: User, db: Session) -> DossierRead:
    query = db.query(Dossier).filter(Dossier.id == dossier_id)
    query = _apply_role_filter(query, user)
    dossier = query.first()
    if not dossier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouve")
    return _to_read(dossier, _latest_transfert_motif(db, dossier.id))


def affecter_dossier(dossier_id: int, data: DossierAffectation, db: Session,user: User) -> DossierRead:
    dossier = db.query(Dossier).filter(Dossier.id == dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouve")
    if dossier.statut not in {StatutDossier.EN_ATTENTE, StatutDossier.EN_ATTENTE_AFFECTATION}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible d'affecter un dossier avec le statut '{dossier.statut.value}'",
        )
    if not db.query(User).filter(User.id == data.avocat_assigne_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avocat assigne non trouve")
    if not db.query(Agence).filter(Agence.id == data.agence_assigne_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agence assignee non trouvee")

    ancienne_valeur = DossierRead.model_validate(dossier).model_dump(mode="json")
    dossier.agence_assigne_id = data.agence_assigne_id
    dossier.avocat_assigne_id = data.avocat_assigne_id
    dossier.date_affectation = datetime.now(timezone.utc)
    if dossier.statut == StatutDossier.EN_ATTENTE:
        dossier.statut = StatutDossier.EN_COURS
    elif dossier.statut == StatutDossier.EN_ATTENTE_AFFECTATION:
        dossier.statut = StatutDossier.EN_COURS

    nouvelle_valeur = DossierRead.model_validate(dossier).model_dump(mode="json")
    histo = HistoriqueAction(
        dossier_id=dossier.id,
        user_id=user.id,
        action="affectation",
        ancienne_valeur=ancienne_valeur,
        nouvelle_valeur=nouvelle_valeur,
        commentaire="",
        created_at=datetime.now(timezone.utc),
    )
    db.add(histo)
    db.commit()

    db.refresh(dossier)
    create_notification(user.id,"affectation","affectation du dossier")
    return _to_read(dossier, _latest_transfert_motif(db, dossier.id))




def update_dossier(dossier_id: int, data: DossierUpdateRequest, user: User, db: Session) -> DossierRead:
    query = db.query(Dossier).filter(Dossier.id == dossier_id)
    query = _apply_role_filter(query, user)
    dossier = query.first()
    if not dossier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouve")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aucun champ a modifier")
    if "client_id" in update_data and not db.query(Client).filter(Client.id == update_data["client_id"]).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouve")
    if "type_affaire_id" in update_data and not db.query(TypeAffaire).filter(TypeAffaire.id == update_data["type_affaire_id"]).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Type d'affaire non trouve")

    ancienne_valeur = DossierRead.model_validate(dossier).model_dump(mode="json")
    for field, value in update_data.items():
        setattr(dossier, field, value)

    nouvelle_valeur = DossierRead.model_validate(dossier).model_dump(mode="json")
    histo = HistoriqueAction(
        dossier_id=dossier.id,
        user_id=user.id,
        action="modification_dossier",
        ancienne_valeur=ancienne_valeur,
        nouvelle_valeur=nouvelle_valeur,
        commentaire="",
        created_at=datetime.now(timezone.utc),
    )
    db.add(histo)
    db.commit()
    db.refresh(dossier)
    return _to_read(dossier, _latest_transfert_motif(db, dossier.id))


def update_statut(dossier_id: int, data: DossierStatutUpdate, db: Session,user: User) -> DossierRead:
    dossier = db.query(Dossier).filter(Dossier.id == dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouve")

    transitions = TRANSITIONS_VALIDES.get(dossier.statut, set())
    if data.statut not in transitions:
        statuts_valides = ", ".join(s.value for s in transitions) or "aucun"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transition '{dossier.statut.value}' -> '{data.statut.value}' non autorisee. Statuts valides : {statuts_valides}",
        )

    ancienne_valeur = DossierRead.model_validate(dossier).model_dump(mode="json")
    dossier.statut = data.statut
    if data.statut == StatutDossier.TERMINE:
        dossier.date_cloture = datetime.now(timezone.utc)

    nouvelle_valeur = DossierRead.model_validate(dossier).model_dump(mode="json")
    histo = HistoriqueAction(
        dossier_id=dossier.id,
        user_id=user.id,
        action="changement_statut",
        ancienne_valeur=ancienne_valeur,
        nouvelle_valeur=nouvelle_valeur,
        commentaire="",
        created_at=datetime.now(timezone.utc),
    )
    db.add(histo)
    db.commit()
    db.refresh(dossier)
    return _to_read(dossier, _latest_transfert_motif(db, dossier.id))


def transfer_dossier(dossier_id: int, motif: str, user: User, db: Session) -> DossierRead:
    dossier = db.query(Dossier).filter(Dossier.id == dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouve")
    if dossier.statut == StatutDossier.ARCHIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Impossible de transferer un dossier archive")

    ancienne_valeur = DossierRead.model_validate(dossier).model_dump(mode="json")

    dossier.statut = StatutDossier.EN_ATTENTE_AFFECTATION
    dossier.agence_assigne_id = None
    dossier.avocat_assigne_id = None
    dossier.date_affectation = None

    nouvelle_valeur = DossierRead.model_validate(dossier).model_dump(mode="json")
    histo = HistoriqueAction(
        dossier_id=dossier.id,
        user_id=user.id,
        action="transfert",
        ancienne_valeur=ancienne_valeur,
        nouvelle_valeur=nouvelle_valeur,
        commentaire=motif,
        created_at=datetime.now(timezone.utc),
    )
    db.add(histo)
    db.commit()
    db.refresh(dossier)
    create_notification(user.id,"transfert","transfert du dossier")

    return _to_read(dossier, motif)


def delete_dossier(dossier_id: int, db: Session, user: User) -> None:
    dossier = db.query(Dossier).filter(Dossier.id == dossier_id).first()
    if not dossier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouve")
    if dossier.statut == StatutDossier.ARCHIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dossier deja archive")

    ancienne_valeur = DossierRead.model_validate(dossier).model_dump(mode="json")
    dossier.statut = StatutDossier.ARCHIVE
    dossier.date_cloture = datetime.now(timezone.utc)
    nouvelle_valeur = DossierRead.model_validate(dossier).model_dump(mode="json")
    histo = HistoriqueAction(
        dossier_id=dossier_id,
        user_id=user.id,
        action="suppression",
        ancienne_valeur=ancienne_valeur,
        nouvelle_valeur=nouvelle_valeur,
        commentaire="",
        created_at=datetime.now(timezone.utc),
    )
    db.add(histo)
    db.commit()

