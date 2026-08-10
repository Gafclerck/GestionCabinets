from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
import json
import logging

from app.core.db import session as db_session
from app.services.auth_service import get_user_from_token
from app.services.discussion_service import (
    verify_and_get_discussion,
    create_message,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active: dict[int, set[WebSocket]] = {}

    async def connect(self, discussion_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(discussion_id, set()).add(websocket)

    def disconnect(self, discussion_id: int, websocket: WebSocket):
        connections = self.active.get(discussion_id)
        if connections:
            connections.discard(websocket)
            if not connections:
                del self.active[discussion_id]

    async def broadcast(self, discussion_id: int, message: dict):
        connections = self.active.get(discussion_id, set()).copy()
        stale: list[WebSocket] = []
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.active.get(discussion_id, set()).discard(ws)


manager = ConnectionManager()


@router.websocket("/discussion/{discussion_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    discussion_id: int,
    token: str = Query(...),
):
    # Une session unique est creee pour toute la duree de la connexion et
    # fermee dans le finally : on ne depend pas du DI (les dependances
    # FastAPI et les sockets longs ne font pas bon menage).
    db = db_session()
    try:
        user = get_user_from_token(db, token)
        if not user:
            await websocket.close(code=4003, reason="Token invalide")
            return

        if not user.actif:
            await websocket.close(code=4003, reason="Compte desactive")
            return

        try:
            # La salle doit exister : on ne la cree pas ici. C'est le endpoint
            # REST (get-or-create cote client) qui cree la salle avant la
            # connexion du socket.
            verify_and_get_discussion(discussion_id, user, db)
        except HTTPException as e:
            logger.error(f"Acces WS refuse: {e.detail}")
            await websocket.close(code=4003, reason="Acces refuse a cette discussion")
            return

        await manager.connect(discussion_id, websocket)
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

                try:
                    message = create_message(discussion_id, contenu.strip(), user, db)
                    # Meme forme que le schema REST : le client n'a qu'une seule
                    # representation de message, qu'il vienne du REST ou du WS.
                    payload = {"type": "message", **message.model_dump(mode="json")}
                    await manager.broadcast(discussion_id, payload)
                except HTTPException as e:
                    await websocket.send_json({"type": "error", "detail": e.detail})
                except Exception as e:
                    logger.error(f"Erreur envoi message: {e}")
                    await websocket.send_json({"type": "error", "detail": "Erreur serveur lors de l'envoi"})

        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"Erreur WS inattendue: {e}")
    finally:
        db.close()
        manager.disconnect(discussion_id, websocket)
