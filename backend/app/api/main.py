from fastapi import APIRouter

from app.api.routes import auth, client, agence, referentiel, dossier, user, discussion, ws, historique

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(user.router, prefix="/user", tags=["user"])
api_router.include_router(client.router, prefix="/client", tags=["client"])
api_router.include_router(agence.router, prefix="/agence", tags=["agence"])
api_router.include_router(referentiel.router, prefix="/referentiel", tags=["referentiel"])
api_router.include_router(dossier.router, prefix="/dossier", tags=["dossier"])
api_router.include_router(historique.router, prefix="/historique", tags=["historique"])
api_router.include_router(discussion.router, prefix="/discussion", tags=["discussion"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
