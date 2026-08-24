# Tests du module notification : liste {items, total, non_lues_count},
# marquage unitaire/global et suppression avec controle de propriete.

from app.models.Notification import Notification
from conftest import make_user


def _seed(db, destinataire, n_lues=0, n_non_lues=0):
    rows = []
    for i in range(n_non_lues):
        rows.append(Notification(
            destinataire_id=destinataire.id,
            type="INFO",
            contenu=f"Non lue {i}",
            lue=False,
        ))
    for i in range(n_lues):
        rows.append(Notification(
            destinataire_id=destinataire.id,
            type="INFO",
            contenu=f"Lue {i}",
            lue=True,
        ))
    db.add_all(rows)
    db.commit()
    return rows


def test_liste_avec_total_et_non_lues(db, client, headers):
    user = make_user(db)
    _seed(db, user, n_lues=2, n_non_lues=3)

    body = client.get("/api/notification", headers=headers(user)).json()
    assert body["total"] == 5
    assert len(body["items"]) == 5  # limit par defaut 20
    assert body["non_lues_count"] == 3

    stats = client.get("/api/notification/non-lues/count", headers=headers(user)).json()
    assert stats["total_non_lues"] == 3


def test_liste_isolee_par_destinataire(db, client, headers):
    alice = make_user(db)
    bob = make_user(db)
    _seed(db, bob, n_non_lues=2)

    body = client.get("/api/notification", headers=headers(alice)).json()
    assert body["total"] == 0
    assert body["non_lues_count"] == 0


def test_filtre_non_lues_only(db, client, headers):
    user = make_user(db)
    _seed(db, user, n_lues=1, n_non_lues=2)

    body = client.get(
        "/api/notification", params={"non_lues_only": True}, headers=headers(user)
    ).json()
    assert body["total"] == 2
    assert all(not item["lue"] for item in body["items"])


def test_marquer_une_lue_et_ownership(db, client, headers):
    user = make_user(db)
    rows = _seed(db, user, n_non_lues=1)
    notif = rows[0]
    autre = make_user(db)

    marked = client.patch(f"/api/notification/{notif.id}/lue", headers=headers(autre))
    assert marked.status_code == 404  # pas la propriete

    ok = client.patch(f"/api/notification/{notif.id}/lue", headers=headers(user))
    assert ok.status_code == 200
    assert ok.json()["lue"] is True

    # Marquer deux fois reste idempotent.
    again = client.patch(f"/api/notification/{notif.id}/lue", headers=headers(user))
    assert again.json()["lue"] is True

    body = client.get("/api/notification", headers=headers(user)).json()
    assert body["non_lues_count"] == 0


def test_marquer_toutes(db, client, headers):
    user = make_user(db)
    _seed(db, user, n_lues=1, n_non_lues=4)

    response = client.patch("/api/notification/lire-toutes", headers=headers(user))
    assert response.status_code == 200
    assert response.json()["updated"] == 4

    body = client.get("/api/notification", headers=headers(user)).json()
    assert body["non_lues_count"] == 0
    assert body["total"] == 5


def test_suppression_avec_controle_de_propriete(db, client, headers):
    user = make_user(db)
    rows = _seed(db, user, n_non_lues=2)
    notif = rows[0]
    autre = make_user(db)

    assert client.delete(f"/api/notification/{notif.id}", headers=headers(autre)).status_code == 404

    deleted = client.delete(f"/api/notification/{notif.id}", headers=headers(user))
    assert deleted.status_code == 204

    body = client.get("/api/notification", headers=headers(user)).json()
    assert body["total"] == 1

    inexistante = client.delete("/api/notification/999999", headers=headers(user))
    assert inexistante.status_code == 404
