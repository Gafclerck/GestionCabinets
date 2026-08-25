# Tests du referentiel (types d'affaire + specialites) : CRUD, unicites,
# acces ReserveChef (les deux roles chef), gardes de suppression sur usage.

import uuid

from app.models.Specialite import Specialite
from app.models.UserSpecialite import UserSpecialite
from conftest import make_agence, make_client, make_dossier, make_type_affaire, make_user


def _libelle(prefix="Type") -> str:
    return f"{prefix} {uuid.uuid4().hex[:6]}"


def test_type_affaire_create_genere_le_code(client, chef_agence, headers):
    # Le code = initiales des mots du libelle, 4 caracteres max.
    libelle = "Recouvrement de creances"
    response = client.post(
        "/api/referentiel/type_affaires/create", json={"libelle": libelle}, headers=headers(chef_agence)
    )
    assert response.status_code == 201
    body = response.json()
    assert body["libelle"] == libelle.upper()
    assert body["code"] == "RDC"


def test_type_affaire_libelle_normalise_et_duplique(client, chef_central, headers):
    libelle = _libelle("Bail commercial")
    ok = client.post("/api/referentiel/type_affaires/create", json={"libelle": libelle.lower()}, headers=headers(chef_central))
    assert ok.status_code == 201
    assert ok.json()["libelle"] == libelle.upper()

    dup = client.post("/api/referentiel/type_affaires/create", json={"libelle": libelle.upper()}, headers=headers(chef_central))
    assert dup.status_code == 400


def test_type_affaire_acces_ecriture_reserve_aux_chefs(client, avocat, chef_agence, headers):
    assert client.post(
        "/api/referentiel/type_affaires/create", json={"libelle": _libelle()}, headers=headers(avocat)
    ).status_code == 403

    # Le chef d'agence est autorise (RequireChef = union des deux roles).
    assert client.post(
        "/api/referentiel/type_affaires/create", json={"libelle": _libelle()}, headers=headers(chef_agence)
    ).status_code == 201


def test_type_affaire_liste_detail_404(client, db, avocat, headers):
    ta = make_type_affaire(db)

    liste = client.get("/api/referentiel/type_affaires", headers=headers(avocat))
    assert liste.status_code == 200
    assert any(t["id"] == ta.id for t in liste.json())

    detail = client.get(f"/api/referentiel/type_affaires/{ta.id}", headers=headers(avocat))
    assert detail.status_code == 200

    assert client.get("/api/referentiel/type_affaires/999999", headers=headers(avocat)).status_code == 404


def test_type_affaire_update(client, chef_central, headers):
    created = client.post(
        "/api/referentiel/type_affaires/create", json={"libelle": _libelle("Penal")}, headers=headers(chef_central)
    ).json()

    vide = client.put(f"/api/referentiel/type_affaires/{created['id']}", json={}, headers=headers(chef_central))
    assert vide.status_code == 400

    updated = client.put(
        f"/api/referentiel/type_affaires/{created['id']}", json={"libelle": _libelle("Civil")}, headers=headers(chef_central)
    )
    assert updated.status_code == 200
    assert updated.json()["libelle"].startswith("CIVIL")


def test_type_affaire_delete_garde_usage(client, db, agence, chef_agence, chef_central, headers):
    ta = make_type_affaire(db)
    type_utilise = make_type_affaire(db)

    client_lie = make_client(db)
    make_dossier(db, agence, chef_agence, client_lie, type_utilise)

    refuse = client.delete(f"/api/referentiel/type_affaires/{type_utilise.id}", headers=headers(chef_central))
    assert refuse.status_code == 400
    assert "dossier" in refuse.json()["detail"]

    ok = client.delete(f"/api/referentiel/type_affaires/{ta.id}", headers=headers(chef_central))
    assert ok.status_code == 204
    assert client.get(f"/api/referentiel/type_affaires/{ta.id}", headers=headers(chef_central)).status_code == 404


def test_specialite_crud_complet(client, chef_central, avocat, headers):
    created = client.post(
        "/api/referentiel/specialites/create",
        json={"libelle": _libelle("Droit du travail"), "description": "Contentieux prud'homal"},
        headers=headers(chef_central),
    )
    assert created.status_code == 201
    specialite = created.json()
    assert specialite["libelle"] == specialite["libelle"].upper()

    assert client.post(
        "/api/referentiel/specialites/create",
        json={"libelle": specialite["libelle"]},
        headers=headers(chef_central),
    ).status_code == 400

    assert client.post(
        "/api/referentiel/specialites/create", json={"libelle": _libelle()}, headers=headers(avocat)
    ).status_code == 403

    updated = client.put(
        f"/api/referentiel/specialites/{specialite['id']}",
        json={"description": "Description mise a jour"},
        headers=headers(chef_central),
    )
    assert updated.status_code == 200
    assert updated.json()["description"] == "Description mise a jour"

    assert client.get(f"/api/referentiel/specialites/{specialite['id']}", headers=headers(avocat)).status_code == 200
    assert client.get("/api/referentiel/specialites/999999", headers=headers(avocat)).status_code == 404

    deleted = client.delete(f"/api/referentiel/specialites/{specialite['id']}", headers=headers(chef_central))
    assert deleted.status_code == 204


def test_specialite_delete_garde_usage(db, client, chef_central, avocat, headers):
    from conftest import make_user as _mk

    specialite = Specialite(libelle=_libelle("Droit foncier"))
    db.add(specialite)
    db.commit()
    db.refresh(specialite)

    db.add(UserSpecialite(user_id=avocat.id, specialite_id=specialite.id, niveau=3))
    db.commit()

    refuse = client.delete(f"/api/referentiel/specialites/{specialite.id}", headers=headers(chef_central))
    assert refuse.status_code == 400
    assert "avocat" in refuse.json()["detail"]
