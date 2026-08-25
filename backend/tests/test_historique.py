# Tests du module historique : pagination {items, total}, controle d'acces
# par dossier et tracage des actions (creation, affectation, documents...).

from datetime import datetime

from app.models.HistoriqueAction import HistoriqueAction
from conftest import make_agence, make_client, make_dossier, make_type_affaire, make_user


def _setup(db):
    agence_obj = make_agence(db)
    chef = make_user(db, agence=agence_obj, role="CHEF_AGENCE")
    avocat_ = make_user(db, agence=agence_obj, role="AVOCAT")
    type_affaire = make_type_affaire(db)
    client_obj = make_client(db)
    return agence_obj, chef, avocat_, client_obj, type_affaire


def test_page_et_total(db, client, headers):
    agence_obj, chef, _, client_obj, type_affaire = _setup(db)
    # Creation via l'API : chaque POST trace une action "creation" dans l'historique.
    ids = []
    for _ in range(3):
        created = client.post(
            "/api/dossier/create",
            json={"client_id": client_obj.id, "type_affaire_id": type_affaire.id, "titre": "Dossier histo"},
            headers=headers(chef),
        )
        assert created.status_code == 201
        ids.append(created.json()["id"])

    cible = ids[0]
    body = client.get(f"/api/historique/dossier/{cible}", headers=headers(chef)).json()
    assert body["total"] >= 1
    assert body["items"][0]["dossier_id"] == cible
    assert any(item["action"] == "creation" for item in body["items"])


def test_pagination_skip_limit(db, client, headers):
    agence_obj, chef, _, client_obj, type_affaire = _setup(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire)

    for i in range(5):
        db.add(HistoriqueAction(
            dossier_id=dossier.id,
            user_id=chef.id,
            action=f"action_{i}",
            created_at=datetime(2026, 1, 1 + i),
        ))
    db.commit()

    page1 = client.get(f"/api/historique/dossier/{dossier.id}", params={"skip": 0, "limit": 2}, headers=headers(chef)).json()
    page2 = client.get(f"/api/historique/dossier/{dossier.id}", params={"skip": 2, "limit": 2}, headers=headers(chef)).json()

    assert page1["total"] == 5
    assert len(page1["items"]) == 2
    assert len(page2["items"]) == 2
    assert {i["id"] for i in page1["items"]}.isdisjoint({i["id"] for i in page2["items"]})


def test_acces_refuse_hors_perimetre(db, client, headers):
    _, chef_a, _, client_obj, type_affaire = _setup(db)
    avocat_b = make_user(db, agence=make_agence(db), role="AVOCAT")

    dossier = make_dossier(db, make_agence(db), chef_a, client_obj, type_affaire)
    assert client.get(f"/api/historique/dossier/{dossier.id}", headers=headers(avocat_b)).status_code == 403


def test_tracage_document_dans_l_historique(db, client, fake_s3, headers):
    agence_obj, chef, _, client_obj, type_affaire = _setup(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire)

    upload = client.post(
        f"/api/document/dossier/{dossier.id}",
        files={"fichier": ("piece.pdf", b"%PDF-1.4 x", "application/pdf")},
        data={"description": "", "confidentiel": "false"},
        headers=headers(chef),
    )
    assert upload.status_code == 201

    delete = client.delete(f"/api/document/{upload.json()['id']}", headers=headers(chef))
    assert delete.status_code == 204

    body = client.get(f"/api/historique/dossier/{dossier.id}", headers=headers(chef)).json()
    actions = [item["action"] for item in body["items"]]
    assert "ajout_document" in actions
    assert "suppression_document" in actions
