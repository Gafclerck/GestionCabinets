# Smoke test : valide l'infrastructure de test (env forcee, base SQLite,
# app montee, auth activee) avant d'attaquer les modules metier.


def test_app_boot_et_docs(client):
    response = client.get("/docs")
    assert response.status_code == 200


def test_endpoint_protege_refuse_sans_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_token_invalide_refuse(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer token-fantome"})
    assert response.status_code == 401


def test_les_routes_metier_sont_montees(client):
    openapi = client.get("/openapi.json").json()
    paths = openapi["paths"]
    for attendu in [
        "/api/auth/login",
        "/api/dossier/create",
        "/api/document/{doc_id}/fichier",
        "/api/discussion/global",
        "/api/notification",
        "/api/historique/dossier/{dossier_id}",
        "/api/referentiel/type_affaires",
    ]:
        assert attendu in paths, f"route manquante : {attendu}"
