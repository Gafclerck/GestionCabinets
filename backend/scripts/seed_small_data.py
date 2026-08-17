import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import engine
from app.core.security import hash_password
from app.models.Agence import Agence
from app.models.User import User, UserRole
from app.models.Client import Client, ClientType
from app.models.TypeAffaire import TypeAffaire
from app.models.Specialite import Specialite
from app.models.UserSpecialite import UserSpecialite
from app.models.Dossier import Dossier, StatutDossier
from app.models.HistoriqueAction import HistoriqueAction
from app.schemas.dossier import DossierRead

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PASSWORD_DEFAUT = "passer123"

AGENCES = [
    ("Cabinet Bhongo - Dakar", "Avenue Cheikh Anta Diop, Sicap Amitie II", "Dakar", "+221 33 821 45 67", True),
    ("Cabinet Bhongo - Rufisque", "Avenue Leopold Sedar Senghor", "Rufisque", "+221 33 836 12 34", False),
]

TYPE_AFFAIRES = [
    ("DROIT COMMERCIAL", "DC"),
    ("DROIT DES SOCIETES", "DS"),
    ("DROIT DU TRAVAIL", "DT"),
]

SPECIALITES = [
    ("DROIT DES AFFAIRES", "Conseil et contentieux des societes commerciales, contrats et fusions-acquisitions"),
    ("DROIT DU TRAVAIL", "Contrats de travail, licenciements, relations sociales et prud'hommes"),
    ("DROIT DE LA FAMILLE", "Divorce, garde d'enfants, pension alimentaire et prestation compensatoire"),
]

# (nom, prenom, email, password) - le chef central et les demos sont conserves
USERS = {
    0: {  # Dakar
        "chef": ("Sow", "Moussa", "agence@gmail.com", "stringst"),
        "avocats": [
            ("Ba", "Aissatou", "avocat@gmail.com", "passer123"),
            ("Mbaye", "Cheikh", "cheikh.mbaye@diopassocies.sn", PASSWORD_DEFAUT),
            ("Diallo", "Mariama", "mariama.diallo@diopassocies.sn", PASSWORD_DEFAUT),
        ],
    },
    1: {  # Rufisque
        "chef": ("Ndiaye", "Aminata", "aminata.ndiaye@diopassocies.sn", PASSWORD_DEFAUT),
        "avocats": [
            ("Niang", "Abdoulaye", "abdoulaye.niang@diopassocies.sn", PASSWORD_DEFAUT),
            ("Gueye", "Ndeye Coumba", "ndeyecoumba.gueye@diopassocies.sn", PASSWORD_DEFAUT),
        ],
    },
}

# Chef central (demo account conserve pour la page de login)
CHEF_CENTRAL = ("Diop", "Fatou", "user@example.com", "string")

CLIENTS = [
    ("Yacine Kane", "physique", "+221 78 678 90 12", "yacine.kane@gmail.com", "1 982 011 000 523", None),
    ("Pape Ibrahima Ndiaye", "physique", "+221 70 789 01 23", "papeibrahima@gmail.com", "1 980 122 000 689", None),
    ("Khadija Mbengue", "physique", "+221 76 890 12 34", "khadija.mbengue@gmail.com", "1 981 130 000 745", None),
    ("FONGIP", "moral", "+221 33 869 25 25", "affaires-juridiques@fongip.sn", None, "SN-DKR-2011-0524"),
    ("NSIA SENEGAL", "moral", "+221 33 889 40 40", "contentieux@nsia-senegal.com", None, "SN-DKR-2015-0587"),
]

# (titre, description, type_idx, client_idx, agence_receptrice_idx, statut, assigned_agence_idx, assigned_avocat_idx, recep_jours, affect_jours_apres, cloture_jours_apres)
DOSSIERS = [
    # --- EN ATTENTE (8) ---
    ("Litige commercial - livraison de marchandises non conforme",
     "Notre client a recu un lot de marchandises non conformes au cahier des charges. Le fournisseur refuse toute reprise malgre plusieurs mises en demeure. La demande porte sur la resolution du contrat et des dommages-interets.",
     0, 9, 0, "en_attente", None, None, 12, 0, 0),
    ("Conflit entre associes - repartition des dividendes",
     "Desaccord entre les associes sur la politique de distribution des dividendes de l'exercice. L'associe minoritaire conteste la retention des benefices decidee par la majorite et saisit le tribunal de commerce.",
     1, 15, 0, "en_attente", None, None, 9, 0, 0),
    # --- EN ATTENTE AFFECTATION (5) ---
    ("Escroquerie sur operations bancaires",
     "Enquete sur des virements frauduleux effectues depuis le compte de la societe par un ancien comptable. La partie civile reclame la restitution des fonds et des dommages-interets.",
     7, 16, 0, "en_attente_affectation", None, None, 18, 0, 0),
    ("Vol en recidive - circonstances attenuantes",
     "Le client est poursuivi pour vol en recidive. Les faits sont anciens et il a aujourd'hui une situation professionnelle stable. La defense plaidera la reinsertion et demandera le sursis.",
     8, 2, 1, "en_attente_affectation", None, None, 15, 0, 0),
]

STATUTS = {
    "en_attente": StatutDossier.EN_ATTENTE,
    "en_attente_affectation": StatutDossier.EN_ATTENTE_AFFECTATION,
    "en_cours": StatutDossier.EN_COURS,
    "termine": StatutDossier.TERMINE,
    "archive": StatutDossier.ARCHIVE,
}


def _snapshot(d: Dossier) -> dict:
    return DossierRead.model_validate(d).model_dump(mode="json")


def wipe(session: Session) -> None:
    tables = [
        "historique_action", "document", "message_discussion", "notification",
        "discussion", "analyse_ia", "user_specialite", "dossier",
        '"user"', "client", "agence", "type_affaire", "specialite",
    ]
    if engine.dialect.name == "sqlite":
        # SQLite ne supporte pas TRUNCATE/RESTART IDENTITY ; DELETE suffit
        # (les INTEGER PRIMARY KEY repartent a 1 sur table vide).
        for table in tables:
            session.execute(text(f"DELETE FROM {table}"))
    else:
        session.execute(text(f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE"))
    session.commit()
    logger.info("Donnees effacees et identites reinitialisees")


def seed(session: Session) -> None:
    now = datetime.now(timezone.utc)

    agences = []
    for nom, adresse, ville, tel, siege in AGENCES:
        a = Agence(nom=nom, adresse=adresse, ville=ville, telephone=tel, est_siege=siege, actif=True)
        session.add(a)
        agences.append(a)
    session.flush()

    types = []
    for libelle, code in TYPE_AFFAIRES:
        t = TypeAffaire(libelle=libelle, code=code)
        session.add(t)
        types.append(t)
    session.flush()

    specialites = []
    for libelle, description in SPECIALITES:
        s = Specialite(libelle=libelle, description=description)
        session.add(s)
        specialites.append(s)
    session.flush()

    chef_central = User(
        nom=CHEF_CENTRAL[0], prenom=CHEF_CENTRAL[1], email=CHEF_CENTRAL[2],
        password_hash=hash_password(CHEF_CENTRAL[3]),
        role=UserRole.CHEF_CENTRAL, agence_id=agences[0].id, actif=True,
    )
    session.add(chef_central)

    chefs = []
    avocats_per_agence = {}
    for idx, data in USERS.items():
        nom, prenom, email, pwd = data["chef"]
        chef = User(
            nom=nom, prenom=prenom, email=email,
            password_hash=hash_password(pwd),
            role=UserRole.CHEF_AGENCE, agence_id=agences[idx].id, actif=True,
        )
        session.add(chef)
        chefs.append(chef)
        avocats = []
        for anom, aprenom, aemail, apwd in data["avocats"]:
            av = User(
                nom=anom, prenom=aprenom, email=aemail,
                password_hash=hash_password(apwd),
                role=UserRole.AVOCAT, agence_id=agences[idx].id, actif=True,
            )
            session.add(av)
            avocats.append(av)
        avocats_per_agence[idx] = avocats
    session.flush()

    for agence_idx, avocats in avocats_per_agence.items():
        for k, avocat in enumerate(avocats):
            specialite_idxs = [(avocat.id + k * 3 + i) % len(specialites) for i in range(2 + k % 2)]
            for sp_idx in dict.fromkeys(specialite_idxs):
                session.add(UserSpecialite(
                    user_id=avocat.id,
                    specialite_id=specialites[sp_idx].id,
                    niveau=(avocat.id + sp_idx) % 3 + 1,
                ))
    session.flush()

    clients = []
    for nom, type_client, tel, email, nin, rccm in CLIENTS:
        c = Client(
            type_client=ClientType.PHYSIQUE if type_client == "physique" else ClientType.MORAL,
            nom=nom, telephone=tel, email=email, nin=nin, rccm=rccm,
        )
        session.add(c)
        clients.append(c)
    session.flush()

    annee = now.year
    for i, (titre, description, type_idx, client_idx, agence_idx, statut,
            assign_agence_idx, assign_avocat_idx, recep_jours, affect_jours, cloture_jours) in enumerate(DOSSIERS, start=1):
        date_reception = now - timedelta(days=recep_jours)
        d = Dossier(
            client_id=clients[client_idx].id,
            agence_receptrice_id=agences[agence_idx].id,
            avocat_en_chef_id=chefs[agence_idx].id,
            type_affaire_id=types[type_idx].id,
            reference=f"DG-{annee}-{i:05d}",
            titre=titre,
            description_initiale=description,
            statut=StatutDossier.EN_ATTENTE,
            priorite=(i % 5) + 1,
            date_reception=date_reception,
        )
        session.add(d)
        session.flush()

        histo_creation = HistoriqueAction(
            dossier_id=d.id,
            user_id=chefs[agence_idx].id,
            action="creation",
            ancienne_valeur=None,
            nouvelle_valeur=_snapshot(d),
            created_at=date_reception,
        )
        session.add(histo_creation)

        if statut != "en_attente":
            snap_before = _snapshot(d)
            if assign_agence_idx is not None:
                d.statut = STATUTS[statut]
                d.agence_assigne_id = agences[assign_agence_idx].id
                avocat = avocats_per_agence[assign_agence_idx][assign_avocat_idx]
                d.avocat_assigne_id = avocat.id
                d.date_affectation = date_reception + timedelta(days=affect_jours)
                if statut in ("termine", "archive"):
                    d.date_cloture = d.date_affectation + timedelta(days=cloture_jours)
                session.flush()

                histo_affectation = HistoriqueAction(
                    dossier_id=d.id,
                    user_id=chefs[assign_agence_idx].id,
                    action="affectation",
                    ancienne_valeur=snap_before,
                    nouvelle_valeur=_snapshot(d),
                    created_at=d.date_affectation,
                )
                session.add(histo_affectation)
            elif statut == "en_attente_affectation":
                d.statut = STATUTS[statut]
                session.flush()
                histo_transfert = HistoriqueAction(
                    dossier_id=d.id,
                    user_id=chefs[agence_idx].id,
                    action="transfert",
                    ancienne_valeur=snap_before,
                    nouvelle_valeur=_snapshot(d),
                    commentaire="Dossier mis en file d'affectation",
                    created_at=date_reception + timedelta(days=1),
                )
                session.add(histo_transfert)

    session.commit()
    logger.info("Seed termine : %d agences, %d types d'affaire, %d specialites, %d users, %d clients, %d dossiers",
                len(agences), len(types), len(specialites),
                session.query(User).count(), len(clients), len(DOSSIERS))


def main() -> None:
    with Session(engine) as session:
        wipe(session)
        seed(session)


if __name__ == "__main__":
    main()
