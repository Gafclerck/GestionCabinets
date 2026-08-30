from app.models.Notification import Notification
def create_notification(db, user_id, type, contenu, lien=None, dossier_id=None):
    notif= Notification(
        destinataire_id=user_id,
        type=type,
        contenu=contenu,
        lien=lien,
        dossier_id=dossier_id,
    )
    db.add(notif)
    db.commit()

def create_bulk_notifications(db, user_ids, type, contenu, lien=None, dossier_id=None):
    for id in user_ids:
        bulk_notif= Notification(
            destinataire_id=id,
            type=type,
            contenu=contenu,
            lien=lien,
            dossier_id=dossier_id,
        )
        db.add(bulk_notif)
    db.commit()

def get_user_notifications(db, user, skip=0, limit=20, non_lues_only=False):
    notifications=db.query(Notification).filter(Notification.lue==non_lues_only and Notification.user_id==user.id).offset(skip).limit(limit)
    return notifications

def get_unread_count(db, user):
    count=db.query(Notification).filter(Notification.destinataire_id==user.id and Notification.lue==False).count()
    return count
    
def mark_as_read(db, notification_id, user):
    notification=db.query(Notification).filter(Notification.id==notification_id).first()
    notification.lue=True
    db.commit()
    db.refresh(notification)

def mark_all_as_read(db, user):
    notifications=db.query(Notification).filter(Notification.destinataire_id==user.id)
    for notification in notifications:
        notification.lue=True
        db.commit()
        db.refresh(notification)

def delete_notification(db, notification_id, user):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="notification not found",
        )
    db.delete(notification)
    db.commit()
