# Tests du module auth : enregistrement (public et protege), login,
# refresh, profil me, changement de mot de passe, compte desactive,
# rate-limiting du login.

import uuid

def _register_payload(**overrides):
    payload = {
        "nom": "Diop",
        "prenom": "Awa",
        "email": f"awa.{uuid.uuid4().hex[:8]}@example.com",
        "password": "motdepasse123",
        "role": "avocat",
    }
    payload.update(overrides)
    return payload


def _login(client, email, password):
    return client.post("/api/auth/login", data={"username": email, "password": password})


def test_register_public_ok(client):
    response = client.post("/api/auth/register", json=_register_payload(role="chef_central"))
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "chef_central"
    assert body["actif"] is True
    assert "password" not in body


def test_register_email_duplique(client):
    payload = _register_payload()
    assert client.post("/api/auth/register", json=payload).status_code == 200
    assert client.post("/api/auth/register", json=payload).status_code == 400


def test_register_mot_de_passe_trop_court(client):
    response = client.post("/api/auth/register", json=_register_payload(password="court"))
    assert response.status_code == 422


def test_register_chef_central_refuse_sans_token(client):
    response = client.post("/api/auth/chef_central/register", json=_register_payload())
    assert response.status_code == 401


def test_register_chef_central_refuse_pour_un_avocat(client, avocat, headers):
    response = client.post(
        "/api/auth/chef_central/register", json=_register_payload(), headers=headers(avocat)
    )
    assert response.status_code == 403


def test_register_chef_central_peut_assigner_nimporte_quel_role(client, chef_central, headers):
    response = client.post(
        "/api/auth/chef_central/register",
        json=_register_payload(role="chef_agence"),
        headers=headers(chef_central),
    )
    assert response.status_code == 200
    assert response.json()["role"] == "chef_agence"


def test_register_chef_agence_force_le_role_avocat(client, chef_agence, headers):
    # Le schema n'expose pas "role" : meme envoye dans le payload il est ignore.
    response = client.post(
        "/api/auth/chef_agence/register",
        json=_register_payload(role="chef_central"),
        headers=headers(chef_agence),
    )
    assert response.status_code == 200
    assert response.json()["role"] == "avocat"


def test_login_ok_et_me(client):
    payload = _register_payload()
    client.post("/api/auth/register", json=payload)

    response = _login(client, payload["email"], payload["password"])
    assert response.status_code == 200
    tokens = response.json()
    assert tokens["token_type"] == "bearer"
    assert tokens["access_token"] and tokens["refresh_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == payload["email"]


def test_login_mauvais_mot_de_passe(client):
    payload = _register_payload()
    client.post("/api/auth/register", json=payload)
    assert _login(client, payload["email"], "mauvais-mot-de-passe").status_code == 401


def test_login_email_inconnu(client):
    response = _login(client, "inconnu@example.com", "motdepasse123")
    assert response.status_code == 401


def test_me_refuse_le_refresh_token(client):
    payload = _register_payload()
    client.post("/api/auth/register", json=payload)
    tokens = _login(client, payload["email"], payload["password"]).json()
    response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"}
    )
    assert response.status_code == 401


def test_refresh_renouvelle_les_tokens(client):
    payload = _register_payload()
    client.post("/api/auth/register", json=payload)
    tokens = _login(client, payload["email"], payload["password"]).json()

    refreshed = client.post(
        "/api/auth/refresh", headers={"Authorization": f"Bearer {tokens['refresh_token']}"}
    )
    assert refreshed.status_code == 200
    nouveaux = refreshed.json()

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {nouveaux['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == payload["email"]


def test_refresh_refuse_le_access_token(client):
    payload = _register_payload()
    client.post("/api/auth/register", json=payload)
    tokens = _login(client, payload["email"], payload["password"]).json()
    response = client.post(
        "/api/auth/refresh", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert response.status_code == 401


def test_change_password_ok(client):
    payload = _register_payload()
    client.post("/api/auth/register", json=payload)
    tokens = _login(client, payload["email"], payload["password"]).json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    response = client.post(
        "/api/auth/change-password",
        json={"ancien_mot_de_passe": payload["password"], "nouveau_mot_de_passe": "nouveaupasse456"},
        headers=headers,
    )
    assert response.status_code == 200

    assert _login(client, payload["email"], payload["password"]).status_code == 401
    assert _login(client, payload["email"], "nouveaupasse456").status_code == 200


def test_change_password_ancien_incorrect(client, avocat, headers):
    response = client.post(
        "/api/auth/change-password",
        json={"ancien_mot_de_passe": "faux", "nouveau_mot_de_passe": "nouveaupasse456"},
        headers=headers(avocat),
    )
    assert response.status_code == 403


def test_user_desactive_est_rejete_en_400(client, db, avocat, headers):
    avocat.actif = False
    db.commit()
    response = client.get("/api/auth/me", headers=headers(avocat))
    assert response.status_code == 400


def test_rate_limit_login_429_apres_5_tentatives(client):
    payload = _register_payload()
    client.post("/api/auth/register", json=payload)

    statuts = [_login(client, payload["email"], payload["password"]).status_code for _ in range(6)]
    assert statuts[:5] == [200] * 5
    assert statuts[5] == 429
