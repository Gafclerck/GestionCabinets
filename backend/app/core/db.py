from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

# Priorite : TESTING > DEVEL > PRODUCTION. En l'absence de mode explicite
# (les trois False), on retombe sur DATABASE_URL (production par defaut).
if settings.TESTING_MODE:
    URL = settings.DATABASE_URL_TEST
elif settings.DEVEL_MODE:
    URL = settings.DATABASE_URL_DEV
elif settings.PRODUCTION_MODE:
    URL = settings.DATABASE_URL
else:
    URL = settings.DATABASE_URL

engine = create_engine(
    URL,
    echo=settings.DEBUG,
    pool_pre_ping=True
)

session = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def init_db(session: Session):
    from app.models.User import UserRole, User
    from app.core.security import hash_password

    hashed_password = hash_password(settings.SUPER_USER_PASSWORD)
    admin_exits = session.query(User).filter_by(email=settings.SUPER_USER_EMAIL).first()
    if admin_exits:
        print("Admin user already exists. Skipping creation.")
        return

    first_admin = User(
        nom="Admin",
        prenom="Admin",
        email=settings.SUPER_USER_EMAIL,
        password_hash=hashed_password,
        role=UserRole.CHEF_CENTRAL,
        actif=True,
    )

    try:
        session.add(first_admin)
        session.commit()
    except Exception as e:
        print(f"Error creating initial data: {e}")
        session.rollback()
