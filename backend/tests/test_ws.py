# Tests du WebSocket : refus de connexion (token, compte, ACL) et flux
# de messagerie temps reel (broadcast + persistence REST).

import json

import pytest
from starlette.websockets import WebSocketDisconnect

from app.services.auth_service import create_access_token
from conftest import make_agence, make_client, make_dossier, make_type_affaire, make_user


def _token(user):
    return create_access_token({"sub": user.email})


def test_ws_refus_si_token_invalide(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/api/ws/discussion/1?token=jeton-pourri"):
            pass


def test_ws_refus_si_compte_desactive(db, client):
    inactif = make_user(db, actif=False)
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/api/ws/discussion/1?token={_token(inactif)}"):
            pass


def test_ws_refus_si_discussion_inexistante(db, client):
    user = make_user(db, role="CHEF_CENTRAL")
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/api/ws/discussion/999999?token={_token(user)}"):
            pass


def test_ws_refus_si_hors_perimetre(db, client):
    agence_obj = make_agence(db)
    chef = make_user(db, agence=agence_obj, role="CHEF_AGENCE")
    type_affaire = make_type_affaire(db)
    client_obj = make_client(db)
    dossier = make_dossier(db, agence_obj, chef, client_obj, type_affaire)

    salle = client.post(
        "/api/discussion",
        json={"sujet": "Salle dossier", "dossier_id": dossier.id},
        headers={"Authorization": f"Bearer {_token(chef)}"},
    ).json()

    externe = make_user(db, agence=make_agence(db), role="AVOCAT")
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/api/ws/discussion/{salle['id']}?token={_token(externe)}"):
            pass


def test_ws_broadcast_vers_tous_et_persistence_rest(db, client, headers):
    _, chef, avocat_ = _salon_direct(db, client, headers)

    salle = client.post(
        "/api/discussion/direct",
        json={"destinataire_id": avocat_.id},
        headers=headers(chef),
    ).json()

    with client.websocket_connect(f"/api/ws/discussion/{salle['id']}?token={_token(chef)}") as ws_chef, \
         client.websocket_connect(f"/api/ws/discussion/{salle['id']}?token={_token(avocat_)}") as ws_avocat:

        ws_chef.send_text(json.dumps({"contenu": "bonjour du socket"}))

        frame_chef = ws_chef.receive_json()
        frame_avocat = ws_avocat.receive_json()

    assert frame_chef["type"] == "message"
    assert frame_chef["contenu"] == "bonjour du socket"
    assert frame_chef["auteur_id"] == chef.id
    # Meme frame pour les deux sockets : une seule representation du message.
    assert frame_avocat == frame_chef

    liste = client.get(f"/api/discussion/{salle['id']}/messages", headers=headers(avocat_))
    body = liste.json()
    assert body["total"] == 1
    assert body["items"][0]["contenu"] == "bonjour du socket"


def test_ws_frames_erreur_sans_deconnexion(db, client, headers):
    chef = make_user(db, role="CHEF_CENTRAL")
    salle = client.get("/api/discussion/global", headers=headers(chef)).json()

    with client.websocket_connect(f"/api/ws/discussion/{salle['id']}?token={_token(chef)}") as ws:
        ws.send_text("ceci n est pas du json")
        err1 = ws.receive_json()
        assert err1 == {"type": "error", "detail": "Format JSON invalide"}

        ws.send_text(json.dumps({"contenu": "   "}))
        err2 = ws.receive_json()
        assert err2["type"] == "error"
        assert "vide" in err2["detail"]

        # La connexion reste utilisable apres les erreurs.
        ws.send_text(json.dumps({"contenu": "apres les erreurs"}))
        ok = ws.receive_json()
        assert ok["type"] == "message"
        assert ok["contenu"] == "apres les erreurs"


def test_ws_message_trop_long(db, client, headers):
    chef = make_user(db, role="CHEF_CENTRAL")
    salle = client.get("/api/discussion/global", headers=headers(chef)).json()

    with client.websocket_connect(f"/api/ws/discussion/{salle['id']}?token={_token(chef)}") as ws:
        ws.send_text(json.dumps({"contenu": "x" * 5001}))
        err = ws.receive_json()
        assert err["type"] == "error"
        assert "5000" in err["detail"]

    liste = client.get(f"/api/discussion/{salle['id']}/messages", params={"limit": 200}, headers=headers(chef))
    assert all(m["contenu"] != "x" * 5001 for m in liste.json()["items"])


def _salon_direct(db, client, headers):
    agence_obj = make_agence(db)
    chef = make_user(db, agence=agence_obj, role="CHEF_AGENCE")
    avocat_ = make_user(db, agence=agence_obj, role="AVOCAT")
    return None, chef, avocat_
