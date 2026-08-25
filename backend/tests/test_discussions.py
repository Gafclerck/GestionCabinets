# Tests du module discussion (REST) : salons get-or-create (global, agence,
# direct), salle de dossier avec ACL, et pagination des messages.

from conftest import make_agence, make_client, make_dossier, make_type_affaire, make_user


def _setup(db):
    agence_obj = make_agence(db)
    chef = make_user(db, agence=agence_obj, role="CHEF_AGENCE")
    avocat_ = make_user(db, agence=agence_obj, role="AVOCAT")
    return agence_obj, chef, avocat_


def test_global_get_or_create_idempotent(db, client, headers):
    alice = make_user(db, role="CHEF_CENTRAL")
    bob = make_user(db, agence=make_agence(db), role="AVOCAT")

    first = client.get("/api/discussion/global", headers=headers(alice))
    second = client.get("/api/discussion/global", headers=headers(bob))

    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["type_discussion"] == "global"
    assert first.json()["id"] == second.json()["id"]


def test_salon_agence_acces_et_idempotence(db, client, headers):
    agence_a, chef_a, avocat_a = _setup(db)
    agence_b = make_agence(db)
    chef_central = make_user(db, role="CHEF_CENTRAL")

    first = client.get(f"/api/discussion/agence/{agence_a.id}", headers=headers(chef_a))
    assert first.status_code == 200
    assert first.json()["type_discussion"] == "agence"

    # Un autre membre de l'agence retombe sur le meme salon (get-or-create).
    second = client.get(f"/api/discussion/agence/{agence_a.id}", headers=headers(avocat_a))
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]

    outsider = client.get(f"/api/discussion/agence/{agence_a.id}", headers=headers(make_user(db, agence=make_agence(db), role="AVOCAT")))
    assert outsider.status_code == 403

    central = client.get(f"/api/discussion/agence/{agence_b.id}", headers=headers(chef_central))
    assert central.status_code == 200

    inconnue = client.get("/api/discussion/agence/999999", headers=headers(chef_central))
    assert inconnue.status_code == 404


def test_direct_discussion_regles_et_idempotence(db, client, headers):
    _, chef, avocat_ = _setup(db)
    autre_avocat = make_user(db, agence=make_agence(db), role="AVOCAT")

    self_chat = client.post("/api/discussion/direct", json={"destinataire_id": chef.id}, headers=headers(chef))
    assert self_chat.status_code == 400

    inconnu = client.post("/api/discussion/direct", json={"destinataire_id": 999999}, headers=headers(chef))
    assert inconnu.status_code == 404

    desactive = client.post(
        "/api/discussion/direct",
        json={"destinataire_id": make_user(db, agence=None, actif=False).id},
        headers=headers(chef),
    )
    assert desactive.status_code == 404

    ouverte = client.post("/api/discussion/direct", json={"destinataire_id": avocat_.id}, headers=headers(chef))
    rouverte = client.post("/api/discussion/direct", json={"destinataire_id": chef.id}, headers=headers(avocat_))
    # La route POST /direct n'impose pas 201 : creation et reouverture repondent 200.
    assert ouverte.status_code == 200 and rouverte.status_code == 200
    assert ouverte.json()["id"] == rouverte.json()["id"]
    assert ouverte.json()["interlocuteur_id"] == avocat_.id
    assert rouverte.json()["interlocuteur_id"] == chef.id

    tiers = client.get(f"/api/discussion/{ouverte.json()['id']}", headers=headers(autre_avocat))
    assert tiers.status_code == 403


def test_salle_dossier_null_puis_creee_avec_acl(db, client, headers):
    agence_obj = make_agence(db)
    chef = make_user(db, agence=agence_obj, role="CHEF_AGENCE")
    avocat_assigne = make_user(db, agence=agence_obj, role="AVOCAT")
    type_affaire = make_type_affaire(db)
    client_obj = make_client(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire, avocat=avocat_assigne)

    absente = client.get(f"/api/discussion/dossier/{dossier.id}", headers=headers(chef))
    assert absente.status_code == 200
    assert absente.json() is None

    creee = client.post(
        "/api/discussion",
        json={"sujet": "Echanges dossier", "dossier_id": dossier.id},
        headers=headers(chef),
    )
    assert creee.status_code == 201
    assert creee.json()["type_discussion"] == "dossier"
    assert creee.json()["dossier_id"] == dossier.id

    retrouvee = client.get(f"/api/discussion/dossier/{dossier.id}", headers=headers(avocat_assigne))
    assert retrouvee.status_code == 200
    assert retrouvee.json()["id"] == creee.json()["id"]

    # Un avocat hors du dossier n'a acces ni a la salle ni a son detail.
    externe = make_user(db, agence=make_agence(db), role="AVOCAT")
    assert client.get(f"/api/discussion/dossier/{dossier.id}", headers=headers(externe)).status_code == 403
    assert client.get(f"/api/discussion/{creee.json()['id']}", headers=headers(externe)).status_code == 403


def test_messages_ordre_total_et_cap_pagination(db, client, headers):
    _, chef, avocat_ = _setup(db)
    salle = client.post("/api/discussion/direct", json={"destinataire_id": avocat_.id}, headers=headers(chef)).json()

    for i in range(1, 4):
        sent = client.post(
            f"/api/discussion/{salle['id']}/messages",
            json={"contenu": f"message {i}"},
            headers=headers(chef),
        )
        assert sent.status_code == 201
        assert sent.json()["auteur_nom"].endswith(chef.nom)
        assert sent.json()["discussion_id"] == salle["id"]

    liste = client.get(f"/api/discussion/{salle['id']}/messages", headers=headers(chef))
    assert liste.status_code == 200
    body = liste.json()
    assert body["total"] == 3
    assert [m["contenu"] for m in body["items"]] == ["message 1", "message 2", "message 3"]
    assert all(m["auteur_id"] == chef.id for m in body["items"])

    cap = client.get(f"/api/discussion/{salle['id']}/messages", params={"limit": 201}, headers=headers(chef))
    assert cap.status_code == 422

    vide = client.get(f"/api/discussion/{salle['id']}/messages", headers=headers(avocat_))
    assert vide.status_code == 200  # participant direct : lecture autorisee


def test_message_contenu_vide_refuse(db, client, headers):
    _, chef, avocat_ = _setup(db)
    salle = client.post("/api/discussion/direct", json={"destinataire_id": avocat_.id}, headers=headers(chef)).json()

    vide = client.post(f"/api/discussion/{salle['id']}/messages", json={"contenu": ""}, headers=headers(chef))
    assert vide.status_code == 422
