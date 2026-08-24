# Ce fichier doit rester AVANT tout import de "app" : les variables
# d'environnement priment sur le fichier .env dans pydantic-settings.
# On force donc la configuration de test ici, sinon l'engine de
# app.core.db serait construit sur la base Postgres de dev (.env actuel).
import os

os.environ["TESTING_MODE"] = "True"
os.environ["DEVEL_MODE"] = "False"
os.environ["PRODUCTION_MODE"] = "False"

TEST_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_api.db").replace("\\", "/")
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"

os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["DATABASE_URL_TEST"] = TEST_DB_URL
os.environ.setdefault("SECRET_KEY", "cle-de-test-tres-longue-pour-hmac-sha256-0123456789")
os.environ.setdefault("SUPER_USER_EMAIL", "admin@test.local")
os.environ.setdefault("SUPER_USER_PASSWORD", "motdepasse-test")
os.environ.setdefault("S3_ENDPOINT_URL", "https://compte-test.r2.cloudflarestorage.com")
os.environ.setdefault("S3_ACCESS_KEY", "access-key-test")
os.environ.setdefault("S3_SECRET_KEY", "secret-key-test")
os.environ.setdefault("S3_BUCKET_NAME", "bucket-test")

if os.path.exists(TEST_DB_PATH):
    os.remove(TEST_DB_PATH)

import uuid as _uuid

import pytest
from fastapi.testclient import TestClient
from botocore.exceptions import ClientError

import app.models  #noqa: F401 - enregistre les 14 modeles dans Base.metadata
from app.core.base import Base
from app.core.db import engine, session as session_factory
from app.core.deps import limiter
from app.core.security import create_access_token, hash_password
from app.main import app

from app.models.Agence import Agence
from app.models.Client import Client, ClientType
from app.models.Dossier import Dossier, StatutDossier
from app.models.TypeAffaire import TypeAffaire
from app.models.User import User, UserRole


@pytest.fixture(scope="session", autouse=True)
def _database():
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture(autouse=True)
def _isolate_test():
    # Purge apres chaque test (ordre inverse des FK) + reset du rate-limiter
    # dont le storage est un singleton partage par toute la suite.
    yield
    with session_factory() as s:
        for table in reversed(Base.metadata.sorted_tables):
            s.execute(table.delete())
        s.commit()
    storage = getattr(limiter, "_storage", None)
    if storage is not None and hasattr(storage, "reset"):
        storage.reset()


@pytest.fixture
def db():
    s = session_factory()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture
def client():
    return TestClient(app)


_seq = {"n": 0}


def _unique(base: str) -> str:
    _seq["n"] += 1
    return f"{base}-{_seq['n']}-{_uuid.uuid4().hex[:6]}"


def make_agence(db, **overrides) -> Agence:
    agence = Agence(
        nom=overrides.get("nom", _unique("Agence")),
        adresse=overrides.get("adresse", "Rue 1"),
        ville=overrides.get("ville", "Dakar"),
        telephone=overrides.get("telephone", "+221770000000"),
        est_siege=overrides.get("est_siege", False),
        actif=True,
    )
    db.add(agence)
    db.commit()
    db.refresh(agence)
    return agence


def make_user(db, agence=None, role=UserRole.AVOCAT, actif=True, **overrides) -> User:
    user = User(
        nom=overrides.get("nom", "Test"),
        prenom=overrides.get("prenom", "User"),
        email=overrides.get("email", f"{_uuid.uuid4().hex[:10]}@example.com"),
        password_hash=hash_password(overrides.get("password", "motdepasse123")),
        role=role,
        agence_id=agence.id if agence else None,
        actif=actif,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_client(db, **overrides) -> Client:
    suffix = _uuid.uuid4().hex[:8]
    client_ = Client(
        nom=overrides.get("nom", "Client Test"),
        telephone=overrides.get("telephone", f"+22177000{suffix}"),
        email=overrides.get("email", f"client-{suffix}@test.local"),
        nin=overrides.get("nin", None),
        rccm=overrides.get("rccm", None),
        type_client=overrides.get("type_client", ClientType.PHYSIQUE),
    )
    db.add(client_)
    db.commit()
    db.refresh(client_)
    return client_


def make_type_affaire(db, **overrides) -> TypeAffaire:
    # Le service genere toujours un code a la creation ; on imite ce
    # comportement car le schema de reponse exige un code non nul.
    libelle = overrides.get("libelle", _unique("Type affaire"))
    t = TypeAffaire(
        libelle=libelle,
        code=overrides.get("code", libelle.replace(" ", "")[:4].upper()),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def make_dossier(db, agence, chef, client_, type_affaire, avocat=None, statut=StatutDossier.EN_COURS, **overrides) -> Dossier:
    _seq["n"] += 1
    d = Dossier(
        client_id=client_.id,
        agence_receptrice_id=overrides.get("agence_receptrice_id", agence.id),
        avocat_en_chef_id=chef.id,
        agence_assigne_id=agence.id,
        avocat_assigne_id=avocat.id if avocat else None,
        type_affaire_id=type_affaire.id,
        reference=overrides.get("reference", _unique("DG")),
        titre=overrides.get("titre", "Dossier de test"),
        statut=statut,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def auth_headers(user: User) -> dict:
    # JWT pose directement (sub=email, type=access) : evite le cout Argon2
    # d'un login et le rate-limit pour les tests qui ne testent pas l'auth.
    token = create_access_token({"sub": user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def headers():
    return auth_headers


@pytest.fixture
def chef_central(db):
    return make_user(db, role=UserRole.CHEF_CENTRAL)


@pytest.fixture
def agence(db):
    return make_agence(db)


@pytest.fixture
def chef_agence(db, agence):
    return make_user(db, agence=agence, role=UserRole.CHEF_AGENCE)


@pytest.fixture
def avocat(db, agence):
    return make_user(db, agence=agence, role=UserRole.AVOCAT)


class FakeS3Body:
    def __init__(self, data: bytes):
        self._data = data
        self.closed = False

    def iter_chunks(self):
        for i in range(0, len(self._data), 8192):
            yield self._data[i:i + 8192]

    def close(self):
        self.closed = True


class FakeS3Client:
    # Stub du client boto3 : enregistre les objets en memoire, aucun reseau.
    def __init__(self):
        self.objects: dict[str, bytes] = {}
        self.put_calls: list[dict] = []

    def put_object(self, Bucket, Key, Body, ContentType=None, **kwargs):
        self.objects[Key] = Body if isinstance(Body, bytes) else bytes(Body)
        self.put_calls.append({"Bucket": Bucket, "Key": Key, "ContentType": ContentType, "size": len(self.objects[Key])})
        return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    def get_object(self, Bucket, Key, **kwargs):
        if Key not in self.objects:
            raise ClientError(
                {"Error": {"Code": "NoSuchKey", "Message": "The specified key does not exist."}},
                "GetObject",
            )
        return {"Body": FakeS3Body(self.objects[Key])}

    def delete_object(self, Bucket, Key, **kwargs):
        self.objects.pop(Key, None)
        return {}


@pytest.fixture
def fake_s3(monkeypatch):
    from app.services import document_service

    fake = FakeS3Client()
    monkeypatch.setattr(document_service, "s3_client", fake)
    return fake
