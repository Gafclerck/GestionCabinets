# Tests des modules user, client et agence : CRUD, permissions par role,
# unicites (email, telephone) et garde-fous de suppression.

import uuid

from app.models.Client import Client
from conftest import make_agence, make_dossier, make_type_affaire, make_user


def _user_payload(**overrides):
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "nom": "Diop",
        "prenom": "Awa",
        "email": f"awa.{suffix}@example.com",
        "password": "motdepasse123",
        "role": "avocat",
    }
    payload.update(overrides)
    return payload


def _client_payload(**overrides):
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "type_client": "physique",
        "nom": "Fall Mbaye",
        "telephone": f"+2217712345{suffix[:3]}",
        "email": f"client.{suffix}@example.com",
    }
    payload.update(overrides)
    return payload


def _agence_payload(**overrides):
    payload = {
        "nom": f"Agence {uuid.uuid4().hex[:6]}",
        "adresse": "12 Rue du Commerce",
        "ville": "Dakar",
        "telephone": "+221781112233",
        "est_siege": False,
    }
    payload.update(overrides)
    return payload


# --- Tests de creation d'utilisateur (POST /api/user) ---


def test_create_user_refuse_sans_token(client):
    response = client.post("/api/user", json=_user_payload())
    assert response.status_code == 401


def test_create_user_refuse_pour_avocat(client, avocat, headers):
    response = client.post("/api/user", json=_user_payload(), headers=headers(avocat))
    assert response.status_code == 403


def test_create_user_chef_central_peut_creer_chef_agence(client, chef_central, headers):
    payload = _user_payload(role="chef_agence")
    response = client.post("/api/user", json=payload, headers=headers(chef_central))
    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "chef_agence"
    assert body["actif"] is True
    assert "password" not in body


def test_create_user_chef_central_peut_creer_avocat(client, chef_central, headers):
    response = client.post("/api/user", json=_user_payload(), headers=headers(chef_central))
    assert response.status_code == 201
    assert response.json()["role"] == "avocat"


def test_create_user_chef_central_ne_peut_pas_creer_chef_central(client, chef_central, headers):
    payload = _user_payload(role="chef_central")
    response = client.post("/api/user", json=payload, headers=headers(chef_central))
    assert response.status_code == 403


def test_create_user_chef_agence_peut_creer_avocat(client, chef_agence, headers):
    response = client.post("/api/user", json=_user_payload(), headers=headers(chef_agence))
    assert response.status_code == 201
    assert response.json()["role"] == "avocat"


def test_create_user_chef_agence_ne_peut_pas_creer_chef_agence(client, chef_agence, headers):
    payload = _user_payload(role="chef_agence")
    response = client.post("/api/user", json=payload, headers=headers(chef_agence))
    assert response.status_code == 403


def test_create_user_chef_agence_ne_peut_pas_creer_chef_central(client, chef_agence, headers):
    payload = _user_payload(role="chef_central")
    response = client.post("/api/user", json=payload, headers=headers(chef_agence))
    assert response.status_code == 403


def test_create_user_email_duplique(client, chef_central, headers):
    payload = _user_payload(email="dup@example.com")
    assert client.post("/api/user", json=payload, headers=headers(chef_central)).status_code == 201
    assert client.post("/api/user", json=payload, headers=headers(chef_central)).status_code == 400


def test_create_user_mot_de_passe_trop_court(client, chef_central, headers):
    response = client.post("/api/user", json=_user_payload(password="court"), headers=headers(chef_central))
    assert response.status_code == 422


# --- Tests existants ---


def test_patch_me_modifie_le_profil(client, avocat, headers):
    response = client.patch("/api/user/me", json={"nom": "NouveauNom"}, headers=headers(avocat))
    assert response.status_code == 200
    assert response.json()["nom"] == "NouveauNom"


def test_patch_me_payload_vide_refuse(client, avocat, headers):
    response = client.patch("/api/user/me", json={}, headers=headers(avocat))
    assert response.status_code == 400


def test_patch_me_email_deja_pris(client, db, avocat, headers):
    autre = make_user(db)
    response = client.patch("/api/user/me", json={"email": autre.email}, headers=headers(avocat))
    assert response.status_code == 400


def test_user_all_liste_avec_pagination(client, db, headers):
    admin = make_user(db, role="CHEF_CENTRAL")
    for _ in range(4):
        make_user(db)
    response = client.get("/api/user/all", params={"skip": 0, "limit": 2}, headers=headers(admin))
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_user_reserve_au_chef_central(client, db, avocat, headers):
    cible = make_user(db)

    assert client.get(f"/api/user/{cible.id}", headers=headers(avocat)).status_code == 403

    admin = make_user(db, role="CHEF_CENTRAL")
    response = client.get(f"/api/user/{cible.id}", headers=headers(admin))
    assert response.status_code == 200
    assert response.json()["id"] == cible.id

    assert client.get("/api/user/999999", headers=headers(admin)).status_code == 404


def test_patch_user_par_chef_central(client, db, avocat, headers):
    admin = make_user(db, role="CHEF_CENTRAL")
    response = client.patch(
        f"/api/user/{avocat.id}",
        json={"actif": False, "role": "chef_agence"},
        headers=headers(admin),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["actif"] is False
    assert body["role"] == "chef_agence"

    # Un compte desactive est coupe avant le check de role (400, pas 403).
    desactive = client.get(f"/api/user/{avocat.id}", headers=headers(avocat))
    assert desactive.status_code == 400


def test_client_create_liste_get(client, avocat, headers):
    payload = _client_payload()
    created = client.post("/api/client/create", json=payload, headers=headers(avocat))
    assert created.status_code == 201
    body = created.json()
    assert body["nom"] == payload["nom"]
    assert body["type_client"] == "physique"

    liste = client.get("/api/client/all", headers=headers(avocat))
    assert liste.status_code == 200
    assert any(c["id"] == body["id"] for c in liste.json())

    detail = client.get(f"/api/client/{body['id']}", headers=headers(avocat))
    assert detail.status_code == 200

    assert client.get("/api/client/999999", headers=headers(avocat)).status_code == 404


def test_client_duplique_telephone_ou_email(client, avocat, headers):
    payload = _client_payload()
    assert client.post("/api/client/create", json=payload, headers=headers(avocat)).status_code == 201

    meme_telephone = _client_payload(email=f"autre.{uuid.uuid4().hex[:6]}@example.com", telephone=payload["telephone"])
    meme_email = _client_payload(email=payload["email"])

    assert client.post("/api/client/create", json=meme_telephone, headers=headers(avocat)).status_code == 400
    assert client.post("/api/client/create", json=meme_email, headers=headers(avocat)).status_code == 400


def test_client_update_et_suppression(client, db, avocat, headers):
    created = client.post("/api/client/create", json=_client_payload(), headers=headers(avocat)).json()

    updated = client.put(f"/api/client/{created['id']}", json={"nom": "Fall Modifie"}, headers=headers(avocat))
    assert updated.status_code == 200
    assert updated.json()["nom"] == "Fall Modifie"

    vide = client.put(f"/api/client/{created['id']}", json={}, headers=headers(avocat))
    assert vide.status_code == 400

    # Un client lie a un dossier ne peut pas etre supprime.
    agence_obj = make_agence(db)
    chef = make_user(db, agence=agence_obj, role="CHEF_AGENCE")
    type_affaire = make_type_affaire(db)
    client_lie = db.get(Client, created["id"])
    make_dossier(db, agence_obj, chef, client_lie, type_affaire)

    refuse = client.delete(f"/api/client/{created['id']}", headers=headers(avocat))
    assert refuse.status_code == 400

    libre = client.post("/api/client/create", json=_client_payload(), headers=headers(avocat)).json()
    assert client.delete(f"/api/client/{libre['id']}", headers=headers(avocat)).status_code == 204
    assert client.get(f"/api/client/{libre['id']}", headers=headers(avocat)).status_code == 404


def test_agence_create_reservee_au_chef_central(client, avocat, chef_central, headers):
    assert client.post("/api/agence/create", json=_agence_payload(), headers=headers(avocat)).status_code == 403

    response = client.post("/api/agence/create", json=_agence_payload(), headers=headers(chef_central))
    assert response.status_code == 201
    assert response.json()["actif"] is True


def test_agence_nom_duplique(client, chef_central, headers):
    payload = _agence_payload()
    assert client.post("/api/agence/create", json=payload, headers=headers(chef_central)).status_code == 201
    assert client.post("/api/agence/create", json=payload, headers=headers(chef_central)).status_code == 400


def test_agence_detail_update_et_users(client, db, chef_central, headers):
    agence_obj = make_agence(db)
    membre = make_user(db, agence=agence_obj)

    detail = client.get(f"/api/agence/{agence_obj.id}", headers=headers(membre))
    assert detail.status_code == 200

    assert client.get("/api/agence/999999", headers=headers(membre)).status_code == 404

    updated = client.patch(
        f"/api/agence/{agence_obj.id}",
        json={"ville": "Thies"},
        headers=headers(chef_central),
    )
    assert updated.status_code == 200
    assert updated.json()["ville"] == "Thies"

    users = client.get(f"/api/agence/{agence_obj.id}/users", headers=headers(membre))
    assert users.status_code == 200
    ids = [u["id"] for u in users.json()]
    assert membre.id in ids
