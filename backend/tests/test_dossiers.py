# Tests du module dossier : creation avec auto-affectation, filtrage par
# role, machine a etats des statuts, affectation, transfert et archivage.

import re
import uuid

from conftest import make_agence, make_client, make_dossier, make_type_affaire, make_user


def _payload(client_obj, type_affaire, **overrides):
    payload = {
        "client_id": client_obj.id,
        "type_affaire_id": type_affaire.id,
        "titre": f"Dossier {uuid.uuid4().hex[:6]}",
        "description_initiale": "Description de test",
        "priorite": 2,
    }
    payload.update(overrides)
    return payload


def _setup_agence(db):
    agence_obj = make_agence(db)
    chef = make_user(db, agence=agence_obj, role="CHEF_AGENCE")
    avocat_ = make_user(db, agence=agence_obj, role="AVOCAT")
    client_obj = make_client(db)
    type_affaire = make_type_affaire(db)
    return agence_obj, chef, avocat_, client_obj, type_affaire


def test_create_par_chef_agence_auto_affecte(db, client, headers):
    agence_obj, chef, _, client_obj, type_affaire = _setup_agence(db)

    response = client.post(
        "/api/dossier/create",
        json=_payload(client_obj, type_affaire),
        headers=headers(chef),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["agence_receptrice_id"] == agence_obj.id
    assert body["avocat_en_chef_id"] == chef.id
    assert body["statut"] == "en_attente"
    assert re.fullmatch(rf"DG-\d{{4}}-\d{{5}}", body["reference"]), body["reference"]
    assert body["agence_assigne_id"] is None


def test_create_sans_agence_refuse(db, client, headers):
    _, _, _, client_obj, type_affaire = _setup_agence(db)
    sans_agence = make_user(db, role="CHEF_CENTRAL")

    response = client.post(
        "/api/dossier/create", json=_payload(client_obj, type_affaire), headers=headers(sans_agence)
    )
    assert response.status_code == 400


def test_create_fk_inconnue_404(db, client, headers):
    agence_obj, chef, _, client_obj, type_affaire = _setup_agence(db)

    mauvais_client = _payload(client_obj, type_affaire, client_id=999999)
    assert client.post("/api/dossier/create", json=mauvais_client, headers=headers(chef)).status_code == 404

    mauvais_type = _payload(client_obj, type_affaire, type_affaire_id=999999)
    assert client.post("/api/dossier/create", json=mauvais_type, headers=headers(chef)).status_code == 404


def test_list_all_filtree_par_role(db, client, headers):
    agence_a, chef_a, avocat_a, client_a, type_a = _setup_agence(db)
    agence_b, chef_b, avocat_b, client_b, type_b = _setup_agence(db)

    dossier_a = make_dossier(db, agence_a, chef_a, client_a, type_a, avocat=avocat_a)
    dossier_b = make_dossier(db, agence_b, chef_b, client_b, type_b, avocat=avocat_b)

    central = make_user(db, role="CHEF_CENTRAL")

    vue_central = {d["id"] for d in client.get("/api/dossier/all", headers=headers(central)).json()}
    assert {dossier_a.id, dossier_b.id} <= vue_central

    vue_chef_a = {d["id"] for d in client.get("/api/dossier/all", headers=headers(chef_a)).json()}
    assert dossier_a.id in vue_chef_a
    assert dossier_b.id not in vue_chef_a

    vue_avocat_a = {d["id"] for d in client.get("/api/dossier/all", headers=headers(avocat_a)).json()}
    assert dossier_a.id in vue_avocat_a
    assert dossier_b.id not in vue_avocat_a


def test_detail_hors_perimetre_invisible_404(db, client, headers):
    agence_a, chef_a, avocat_a, client_a, type_a = _setup_agence(db)
    _, _, avocat_b, _, _ = _setup_agence(db)
    dossier = make_dossier(db, agence_a, chef_a, client_a, type_a, avocat=avocat_a)

    assert client.get(f"/api/dossier/{dossier.id}", headers=headers(avocat_a)).status_code == 200
    # Le filtrage par role rend le dossier invisible (404), il ne leak pas son existence.
    assert client.get(f"/api/dossier/{dossier.id}", headers=headers(avocat_b)).status_code == 404


def test_update_dossier(db, client, headers):
    agence_obj, chef, _, client_obj, type_affaire = _setup_agence(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire)

    vide = client.patch(f"/api/dossier/{dossier.id}", json={}, headers=headers(chef))
    assert vide.status_code == 400

    updated = client.patch(
        f"/api/dossier/{dossier.id}",
        json={"titre": "Titre modifie", "priorite": 5},
        headers=headers(chef),
    )
    assert updated.status_code == 200
    assert updated.json()["titre"] == "Titre modifie"
    assert updated.json()["priorite"] == 5


def test_affecter_passe_en_cours_et_notifie(db, client, headers):
    agence_obj, chef, avocat_, client_obj, type_affaire = _setup_agence(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire, statut="EN_ATTENTE")

    response = client.patch(
        f"/api/dossier/{dossier.id}/affecter",
        json={"agence_assigne_id": agence_obj.id, "avocat_assigne_id": avocat_.id},
        headers=headers(chef),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["statut"] == "en_cours"
    assert body["avocat_assigne_id"] == avocat_.id
    assert body["date_affectation"] is not None

    from app.models.Notification import Notification
    lignes = db.query(Notification).filter(Notification.destinataire_id == avocat_.id).all()
    assert any("affecte" in n.contenu for n in lignes)


def test_affecter_statut_invalide_et_avocat_inconnu(db, client, headers):
    agence_obj, chef, avocat_, client_obj, type_affaire = _setup_agence(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire, statut="EN_COURS")

    refuse = client.patch(
        f"/api/dossier/{dossier.id}/affecter",
        json={"agence_assigne_id": agence_obj.id, "avocat_assigne_id": avocat_.id},
        headers=headers(chef),
    )
    assert refuse.status_code == 400

    dossier_en_attente = make_dossier(db, agence_obj, chef, client_obj, type_affaire, statut="EN_ATTENTE")
    inexistant = client.patch(
        f"/api/dossier/{dossier_en_attente.id}/affecter",
        json={"agence_assigne_id": agence_obj.id, "avocat_assigne_id": 999999},
        headers=headers(chef),
    )
    assert inexistant.status_code == 404


def test_machine_a_etats_statut(db, client, headers):
    agence_obj, chef, _, client_obj, type_affaire = _setup_agence(db)

    # EN_ATTENTE -> TERMINE est interdit.
    attente = make_dossier(db, agence_obj, chef, client_obj, type_affaire, statut="EN_ATTENTE")
    illegal = client.patch(
        f"/api/dossier/{attente.id}/statut", json={"statut": "termine"}, headers=headers(chef)
    )
    assert illegal.status_code == 400

    # EN_COURS -> TERMINE autorise et date la cloture.
    cours = make_dossier(db, agence_obj, chef, client_obj, type_affaire, statut="EN_COURS")
    termine = client.patch(
        f"/api/dossier/{cours.id}/statut", json={"statut": "termine"}, headers=headers(chef)
    )
    assert termine.status_code == 200
    assert termine.json()["statut"] == "termine"
    assert termine.json()["date_cloture"] is not None

    # ARCHIVE est un puits : plus aucune transition.
    archive = make_dossier(db, agence_obj, chef, client_obj, type_affaire, statut="ARCHIVE")
    puits = client.patch(
        f"/api/dossier/{archive.id}/statut", json={"statut": "en_cours"}, headers=headers(chef)
    )
    assert puits.status_code == 400

    # Un avocat ne peut pas changer un statut (RequireChef).
    cours2 = make_dossier(db, agence_obj, chef, client_obj, type_affaire, statut="EN_COURS")
    simple_avocat = make_user(db, agence=agence_obj, role="AVOCAT")
    assert client.patch(
        f"/api/dossier/{cours2.id}/statut", json={"statut": "archive"}, headers=headers(simple_avocat)
    ).status_code == 403


def test_transfert_remet_en_file_et_garde_le_motif(db, client, headers):
    agence_obj, chef, avocat_, client_obj, type_affaire = _setup_agence(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire, avocat=avocat_, statut="EN_COURS")

    response = client.patch(
        f"/api/dossier/{dossier.id}/transfer",
        json={"motif": "Conflit d'interet detecte"},
        headers=headers(chef),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["statut"] == "en_attente_affectation"
    assert body["avocat_assigne_id"] is None
    assert body["agence_assigne_id"] is None
    assert body["motif_transfert"] == "Conflit d'interet detecte"


def test_transfert_archive_refuse(db, client, headers):
    agence_obj, chef, _, client_obj, type_affaire = _setup_agence(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire, statut="ARCHIVE")

    response = client.patch(
        f"/api/dossier/{dossier.id}/transfer",
        json={"motif": "Trop tard"},
        headers=headers(chef),
    )
    assert response.status_code == 400


def test_delete_soft_archive(db, client, headers):
    agence_obj, chef, _, client_obj, type_affaire = _setup_agence(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire)

    deleted = client.delete(f"/api/dossier/{dossier.id}", headers=headers(chef))
    assert deleted.status_code == 204

    db.expire_all()
    from app.models.Dossier import Dossier as DossierModel
    ligne = db.get(DossierModel, dossier.id)
    assert ligne.statut.value == "archive"
    assert ligne.date_cloture is not None

    redondant = client.delete(f"/api/dossier/{dossier.id}", headers=headers(chef))
    assert redondant.status_code == 400
