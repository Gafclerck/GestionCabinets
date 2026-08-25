# Tests du module auth : login, refresh, profil me, changement de mot de passe,
# compte desactive, rate-limiting du login.

import uuid
from conftest import make_user


def _login(client, email, password):
    return client.post("/api/auth/login", data={"username": email, "password": password})


def test_login_ok_et_me(client, db):
    email = f"login.{uuid.uuid4().hex[:8]}@example.com"
    make_user(db, email=email, password="motdepasse123")

    response = _login(client, email, "motdepasse123")
    assert response.status_code == 200
    tokens = response.json()
    assert tokens["token_type"] == "bearer"
    assert tokens["access_token"] and tokens["refresh_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_login_mauvais_mot_de_passe(client, db):
    email = f"bad.{uuid.uuid4().hex[:8]}@example.com"
    make_user(db, email=email, password="motdepasse123")
    assert _login(client, email, "mauvais-mot-de-passe").status_code == 401


def test_login_email_inconnu(client):
    response = _login(client, "inconnu@example.com", "motdepasse123")
    assert response.status_code == 401


def test_me_refuse_le_refresh_token(client, db):
    email = f"me.{uuid.uuid4().hex[:8]}@example.com"
    make_user(db, email=email, password="motdepasse123")
    tokens = _login(client, email, "motdepasse123").json()
    response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"}
    )
    assert response.status_code == 401


def test_refresh_renouvelle_les_tokens(client, db):
    email = f"refresh.{uuid.uuid4().hex[:8]}@example.com"
    make_user(db, email=email, password="motdepasse123")
    tokens = _login(client, email, "motdepasse123").json()

    refreshed = client.post(
        "/api/auth/refresh", headers={"Authorization": f"Bearer {tokens['refresh_token']}"}
    )
    assert refreshed.status_code == 200
    nouveaux = refreshed.json()

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {nouveaux['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_refresh_refuse_le_access_token(client, db):
    email = f"ref.{uuid.uuid4().hex[:8]}@example.com"
    make_user(db, email=email, password="motdepasse123")
    tokens = _login(client, email, "motdepasse123").json()
    response = client.post(
        "/api/auth/refresh", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert response.status_code == 401


def test_change_password_ok(client, db):
    email = f"pwd.{uuid.uuid4().hex[:8]}@example.com"
    make_user(db, email=email, password="motdepasse123")
    tokens = _login(client, email, "motdepasse123").json()
    auth_headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    response = client.post(
        "/api/auth/change-password",
        json={"ancien_mot_de_passe": "motdepasse123", "nouveau_mot_de_passe": "nouveaupasse456"},
        headers=auth_headers,
    )
    assert response.status_code == 200

    assert _login(client, email, "motdepasse123").status_code == 401
    assert _login(client, email, "nouveaupasse456").status_code == 200


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


def test_rate_limit_login_429_apres_5_tentatives(client, db):
    email = f"rate.{uuid.uuid4().hex[:8]}@example.com"
    make_user(db, email=email, password="motdepasse123")

    statuts = [_login(client, email, "motdepasse123").status_code for _ in range(6)]
    assert statuts[:5] == [200] * 5
    assert statuts[5] == 429
