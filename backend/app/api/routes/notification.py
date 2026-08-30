from app.services.notification_service import *
router = APIRouter()

@router.get("/api/notification")
def getNotifications(db, user, skip=0, limit=20, non_lues_only=False):
    return get_user_notifications(db, user, skip, limit, non_lues_only)

@router.get("/api/notification/non-lues/count")
def getCountNonlues(db, user):
    return get_unread_count(db, user)

@router.patch("/api/notification/{id}/lue")
def markAsRead(db, notification_id, user):
    mark_as_read(db, notification_id, user)

@router.patch("/api/notification/lire-toutes")
def markAsAllRead(db, user):
    mark_all_as_read(db, user)

@router.delete("/api/notification/{id}")
def deleteNotification(db, notification_id, user):
    delete_notification(db, notification_id, user)