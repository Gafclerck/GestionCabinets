from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import json
import logging

from app.core.db import session
from app.core.deps import SessionDep
from app.services.auth_service import get_user_from_token
from app.services.discussion_service import (
    get_or_create_discussion,
    _verify_user_access,
    create_message,
)
from app.schemas.discussion import MessageRead

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active: dict[int, set[WebSocket]] = {}

    async def connect(self, dossier_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(dossier_id, set()).add(websocket)

    def disconnect(self, dossier_id: int, websocket: WebSocket):
        connections = self.active.get(dossier_id)
        if connections:
            connections.discard(websocket)
            if not connections:
                del self.active[dossier_id]

    async def broadcast(self, dossier_id: int, message: dict):
        connections = self.active.get(dossier_id, set()).copy()
        stale: list[WebSocket] = []
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.active.get(dossier_id, set()).discard(ws)


manager = ConnectionManager()


@router.websocket("/dossier/{dossier_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    dossier_id: int,
    token: str = Query(...),
    db: SessionDep = None,
):
    if not db:
        await websocket.close(code=4003, reason="Erreur serveur")
        return

    user = get_user_from_token(db, token)
    if not user:
        await websocket.close(code=4003, reason="Token invalide")
        return

    if not user.actif:
        await websocket.close(code=4003, reason="Compte desactive")
        return

    try:
        _verify_user_access(user, dossier_id, db)
        discussion = get_or_create_discussion(dossier_id, user, db)
    except Exception as e:
        logger.error(f"Erreur auth WS: {e}")
        await websocket.close(code=4003, reason="Erreur d'authentification")
        return

    await manager.connect(dossier_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "Format JSON invalide"})
                continue

            contenu = data.get("contenu")
            if not contenu or not isinstance(contenu, str) or not contenu.strip():
                await websocket.send_json({"type": "error", "detail": "Le contenu ne peut pas etre vide"})
                continue

            if len(contenu) > 5000:
                await websocket.send_json({"type": "error", "detail": "Le message depasse 5000 caracteres"})
                continue

            db_msg = session()
            try:
                disc = get_or_create_discussion(dossier_id, user, db_msg)
                message = create_message(disc.id, contenu.strip(), user, db_msg)
                msg_dict = {
                    "type": "message",
                    "id": message.id,
                    "discussion_id": message.discussion_id,
                    "auteur_id": message.auteur_id,
                    "auteur_nom": f"{user.prenom} {user.nom}",
                    "contenu": message.contenu,
                    "created_at": message.created_at.isoformat(),
                }
                await manager.broadcast(dossier_id, msg_dict)
            except Exception as e:
                logger.error(f"Erreur envoi message: {e}")
                await websocket.send_json({"type": "error", "detail": "Erreur serveur lors de l'envoi"})
            finally:
                db_msg.close()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Erreur WS inattendue: {e}")
    finally:
        manager.disconnect(dossier_id, websocket)
