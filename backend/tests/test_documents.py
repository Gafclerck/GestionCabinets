# Tests du module document avec le client S3/R2 stube : upload (cle, MIME,
# taille), confidentialite, download en streaming, PATCH metadata et
# suppression douce.

import uuid

from conftest import make_agence, make_client, make_dossier, make_type_affaire, make_user


def _setup(db):
    agence_obj = make_agence(db)
    chef = make_user(db, agence=agence_obj, role="CHEF_AGENCE")
    avocat_ = make_user(db, agence=agence_obj, role="AVOCAT")
    type_affaire = make_type_affaire(db)
    client_obj = make_client(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire, avocat=avocat_)
    return agence_obj, chef, avocat_, dossier


def _upload(client, headers, dossier_id, content=b"%PDF-1.4 contenu de test", filename="contrat.pdf",
            mime="application/pdf", description="", confidentiel=False):
    return client.post(
        f"/api/document/dossier/{dossier_id}",
        files={"fichier": (filename, content, mime)},
        data={"description": description, "confidentiel": str(confidentiel).lower()},
        headers=headers,
    )


def test_upload_201_cle_r2_et_historique(db, client, fake_s3, headers):
    _, chef, _, dossier = _setup(db)

    response = _upload(
        client, headers(chef), dossier.id,
        description="Contrat de bail", confidentiel=True,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["dossier_id"] == dossier.id
    assert body["nom_fichier"] == "contrat.pdf"
    assert body["confidentiel"] is True
    assert body["url_acces"] == f"/api/document/{body['id']}/fichier"

    # Un seul objet pousse vers R2, sous documents/{dossier_id}/{uuid}.pdf.
    assert len(fake_s3.put_calls) == 1
    call = fake_s3.put_calls[0]
    assert call["Key"].startswith(f"documents/{dossier.id}/")
    assert call["Key"].endswith(".pdf")
    assert call["ContentType"] == "application/pdf"
    assert fake_s3.objects[call["Key"]] == b"%PDF-1.4 contenu de test"

    from app.models.Document import Document
    ligne = db.get(Document, body["id"])
    assert ligne.chemin_stockage == call["Key"]
    assert ligne.taille_octets == len(b"%PDF-1.4 contenu de test")


def test_upload_type_mime_refuse(db, client, fake_s3, headers):
    _, chef, _, dossier = _setup(db)
    response = _upload(client, headers(chef), dossier.id, mime="application/x-msdownload",
                       filename="virus.exe", content=b"MZ")
    assert response.status_code == 400
    assert fake_s3.put_calls == []


def test_upload_fichier_trop_gros_413(db, client, fake_s3, headers):
    _, chef, _, dossier = _setup(db)
    gros = b"x" * (10 * 1024 * 1024 + 1)
    response = _upload(client, headers(chef), dossier.id, content=gros)
    assert response.status_code == 413
    assert fake_s3.put_calls == []


def test_upload_par_avocat_hors_dossier_refuse(db, client, fake_s3, headers):
    _, _, _, dossier = _setup(db)
    autre_avocat = make_user(db, agence=make_agence(db), role="AVOCAT")

    response = _upload(client, headers(autre_avocat), dossier.id)
    assert response.status_code == 403
    assert fake_s3.put_calls == []


def test_liste_masque_les_confidentiels(db, client, fake_s3, headers):
    agence_obj, chef, avocat_, dossier = _setup(db)
    _upload(client, headers(chef), dossier.id, filename="public.pdf", confidentiel=False)
    _upload(client, headers(chef), dossier.id, filename="secret.pdf", confidentiel=True)

    vue_chef = client.get(f"/api/document/dossier/{dossier.id}", headers=headers(chef)).json()
    vue_avocat = client.get(f"/api/document/dossier/{dossier.id}", headers=headers(avocat_)).json()

    noms_chef = {d["nom_fichier"] for d in vue_chef}
    noms_avocat = {d["nom_fichier"] for d in vue_avocat}
    assert {"public.pdf", "secret.pdf"} <= noms_chef
    # L'avocat assigne fait partie des intervenants : il voit le confidentiel...
    assert "secret.pdf" in noms_avocat


def test_confidentiel_masque_pour_non_intervenant(db, client, fake_s3, headers):
    agence_obj, chef, avocat_, dossier = _setup(db)
    _upload(client, headers(chef), dossier.id, filename="secret.pdf", confidentiel=True)
    externe = make_user(db, agence=make_agence(db), role="AVOCAT")

    liste = client.get(f"/api/document/dossier/{dossier.id}", headers=headers(externe))
    # L'acces au dossier lui-meme est refuse (403) avant la question du filtrage.
    assert liste.status_code == 403


def test_download_streaming_nom_et_type(db, client, fake_s3, headers):
    _, chef, _, dossier = _setup(db)
    created = _upload(
        client, headers(chef), dossier.id,
        content=b"donnees-du-fichier", filename="rapport annuel.pdf",
        mime="application/pdf",
    ).json()

    response = client.get(f"/api/document/{created['id']}/fichier", headers=headers(chef))
    assert response.status_code == 200
    assert response.content == b"donnees-du-fichier"
    assert response.headers["content-type"] == "application/pdf"
    disposition = response.headers["content-disposition"]
    assert disposition.startswith("attachment")
    # Le nom original (avec accent/espace) est transmis via filename* UTF-8.
    assert "rapport%20annuel.pdf" in disposition


def test_download_confidentiel_refuse_non_intervenant(db, client, fake_s3, headers):
    agence_obj, chef, _, dossier = _setup(db)
    created = _upload(client, headers(chef), dossier.id, confidentiel=True).json()
    externe = make_user(db, agence=make_agence(db), role="AVOCAT")

    assert client.get(f"/api/document/{created['id']}/fichier", headers=headers(externe)).status_code == 403
    assert client.get(f"/api/document/{created['id']}", headers=headers(externe)).status_code == 403


def test_download_objet_absent_404(db, client, fake_s3, headers):
    _, chef, _, dossier = _setup(db)
    created = _upload(client, headers(chef), dossier.id).json()
    fake_s3.objects.clear()  # l'objet a disparu cote R2

    response = client.get(f"/api/document/{created['id']}/fichier", headers=headers(chef))
    assert response.status_code == 404


def test_patch_metadata(db, client, fake_s3, headers):
    _, chef, _, dossier = _setup(db)
    created = _upload(client, headers(chef), dossier.id, description="Version 1").json()

    vide = client.patch(f"/api/document/{created['id']}", json={}, headers=headers(chef))
    assert vide.status_code == 200  # schema sans champ requis : payload vide accepte

    updated = client.patch(
        f"/api/document/{created['id']}",
        json={"description": "Version 2", "confidentiel": True},
        headers=headers(chef),
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["description"] == "Version 2"
    assert body["confidentiel"] is True


def test_delete_soft_le_fichier_restera(db, client, fake_s3, headers):
    _, chef, _, dossier = _setup(db)
    created = _upload(client, headers(chef), dossier.id).json()
    cle = fake_s3.put_calls[0]["Key"]

    deleted = client.delete(f"/api/document/{created['id']}", headers=headers(chef))
    assert deleted.status_code == 204

    assert client.get(f"/api/document/{created['id']}", headers=headers(chef)).status_code == 404
    # Suppression douce : la ligne est datee mais l'objet R2 reste (conservation legale).
    assert cle in fake_s3.objects

    liste = client.get(f"/api/document/dossier/{dossier.id}", headers=headers(chef))
    assert all(d["id"] != created["id"] for d in liste.json())
