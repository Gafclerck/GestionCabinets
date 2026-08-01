import logging
import shutil
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import engine
from app.core.security import hash_password
from app.core.storage import UPLOAD_DIR
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
    ("Cabinet Diop & Associes - Dakar", "Avenue Cheikh Anta Diop, Sicap Amitie II", "Dakar", "+221 33 821 45 67", True),
    ("Cabinet Diop & Associes - Rufisque", "Avenue Leopold Sedar Senghor", "Rufisque", "+221 33 836 12 34", False),
    ("Cabinet Diop & Associes - Thies", "Boulevard du General de Gaulle", "Thies", "+221 33 951 78 90", False),
    ("Cabinet Diop & Associes - Saint-Louis", "Rue 10, Ile de Saint-Louis", "Saint-Louis", "+221 33 961 45 78", False),
    ("Cabinet Diop & Associes - Kaolack", "Avenue Cheikh Ahmadou Bamba", "Kaolack", "+221 33 941 23 56", False),
]

TYPE_AFFAIRES = [
    ("DROIT COMMERCIAL", "DC"),
    ("DROIT DES SOCIETES", "DS"),
    ("DROIT DU TRAVAIL", "DT"),
    ("DROIT DE LA FAMILLE", "DF"),
    ("DROIT IMMOBILIER", "DI"),
    ("DROIT FONCIER", "DFO"),
    ("DROIT MARITIME", "DM"),
    ("DROIT PENAL ECONOMIQUE", "DPE"),
    ("DROIT PENAL", "DP"),
    ("PROPRIETE INTELLECTUELLE", "PI"),
    ("PROCEDURES COLLECTIVES", "PC"),
    ("RECOUVREMENT DE CREANCES", "RDC"),
    ("DROIT DES SUCCESSIONS", "DSUC"),
    ("DROIT ADMINISTRATIF", "DA"),
    ("ARBITRAGE OHADA", "AO"),
]

SPECIALITES = [
    ("DROIT DES AFFAIRES", "Conseil et contentieux des societes commerciales, contrats et fusions-acquisitions"),
    ("DROIT DU TRAVAIL", "Contrats de travail, licenciements, relations sociales et prud'hommes"),
    ("DROIT DE LA FAMILLE", "Divorce, garde d'enfants, pension alimentaire et prestation compensatoire"),
    ("DROIT FONCIER ET IMMOBILIER", "Litiges de propriete, parcelles, expropriations et baux"),
    ("DROIT PENAL", "Defense penale, procedure penale et droit penil des affaires"),
    ("DROIT MARITIME", "Avaries, abordages, saisies de navires et transports maritimes"),
    ("DROIT DES SOCIETES", "Constitution, gouvernance, conflits d'associes et cessions de parts"),
    ("CONTENTIEUX FISCAL", "Litiges fiscaux, douane et recouvrement des impots"),
    ("DROIT ADMINISTRATIF", "Marches publics, fonction publique et contentieux administratif"),
    ("ARBITRAGE ET MEDIATION", "Arbitrage OHADA, mediation et reglement alternatif des litiges"),
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
    2: {  # Thies
        "chef": ("Sarr", "Ousmane", "ousmane.sarr@diopassocies.sn", PASSWORD_DEFAUT),
        "avocats": [
            ("Cisse", "Mamadou Lamine", "mlamine.cisse@diopassocies.sn", PASSWORD_DEFAUT),
            ("Diop", "Sokhna", "sokhna.diop@diopassocies.sn", PASSWORD_DEFAUT),
        ],
    },
    3: {  # Saint-Louis
        "chef": ("Fall", "Khady", "khady.fall@diopassocies.sn", PASSWORD_DEFAUT),
        "avocats": [
            ("Sall", "Alioune", "alioune.sall@diopassocies.sn", PASSWORD_DEFAUT),
            ("Sy", "Fatimata", "fatimata.sy@diopassocies.sn", PASSWORD_DEFAUT),
        ],
    },
    4: {  # Kaolack
        "chef": ("Ba", "Ibrahima", "ibrahima.ba@diopassocies.sn", PASSWORD_DEFAUT),
        "avocats": [
            ("Faye", "Babacar", "babacar.faye@diopassocies.sn", PASSWORD_DEFAUT),
            ("Ndao", "Anta", "anta.ndao@diopassocies.sn", PASSWORD_DEFAUT),
        ],
    },
}

# Chef central (demo account conserve pour la page de login)
CHEF_CENTRAL = ("Diop", "Fatou", "user@example.com", "string")

CLIENTS = [
    ("Modou Ndiaye", "physique", "+221 77 123 45 67", "modou.ndiaye@gmail.com", "1 981 087 000 045", None),
    ("Awa Cisse", "physique", "+221 78 234 56 78", "awa.cisse@gmail.com", "1 982 094 000 112", None),
    ("Oumar Diallo", "physique", "+221 70 345 67 89", "oumar.diallo@gmail.com", "1 980 071 000 230", None),
    ("Seynabou Fall", "physique", "+221 76 456 78 90", "seynabou.fall@gmail.com", "1 981 105 000 341", None),
    ("Mamadou Faye", "physique", "+221 77 567 89 01", "mamadou.faye@gmail.com", "1 979 088 000 457", None),
    ("Yacine Kane", "physique", "+221 78 678 90 12", "yacine.kane@gmail.com", "1 982 011 000 523", None),
    ("Pape Ibrahima Ndiaye", "physique", "+221 70 789 01 23", "papeibrahima@gmail.com", "1 980 122 000 689", None),
    ("Khadija Mbengue", "physique", "+221 76 890 12 34", "khadija.mbengue@gmail.com", "1 981 130 000 745", None),
    ("SONATEL", "moral", "+221 33 839 30 00", "juridique@sonatel.sn", None, "SN-DKR-1995-0245"),
    ("ORANGE SENEGAL", "moral", "+221 33 839 50 00", "direction-juridique@orange-sn.com", None, "SN-DKR-2007-0451"),
    ("BOLLORE AFRICA LOGISTICS", "moral", "+221 33 823 66 66", "legal@bollore-africa.com", None, "SN-DKR-1990-0118"),
    ("SUCAP SENEGAL", "moral", "+221 33 832 20 20", "juridique@cosec.sn", None, "SN-DKR-1978-0032"),
    ("COSEC SENEGAL", "moral", "+221 33 839 60 00", "service-juridique@cosec.sn", None, "SN-DKR-1998-0310"),
    ("BHS SENEGAL", "moral", "+221 33 849 10 10", "contentieux@bhs.sn", None, "SN-DKR-1979-0058"),
    ("COMPAGNIE SUCRIERE SENEGALAISE", "moral", "+221 33 941 40 40", "juridique@css.sn", None, "SN-DKR-1981-0074"),
    ("PME & INDUSTRIES SA", "moral", "+221 33 820 30 30", "contact@pme-industries.sn", None, "SN-DKR-2003-0398"),
    ("TRANSRAIL SA", "moral", "+221 33 849 70 70", "service-juridique@transrail.sn", None, "SN-DKR-2002-0356"),
    ("GROUPE BICIS", "moral", "+221 33 839 15 15", "juridique@bicis.sn", None, "SN-DKR-1982-0091"),
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
    ("Licenciement economique conteste",
     "L'employe conteste la realite du motif economique invoque et l'absence de plan de sauvegarde de l'emploi. Il reclame les indemnites legales de rupture et des dommages-interets pour licenciement sans cause reelle et serieuse.",
     2, 13, 1, "en_attente", None, None, 8, 0, 0),
    ("Divorce et garde des enfants",
     "Demande de divorce pour faute. Notre cliente souhaite la garde exclusive de ses deux enfants, une pension alimentaire et l'attribution du domicile conjugal.",
     3, 3, 2, "en_attente", None, None, 7, 0, 0),
    ("Vente immobiliere - vice cache",
     "Notre client a achete un immeuble dont la toiture s'est effondree six mois apres la vente. L'expert a conclu a un vice cache anterieur a la vente. Action en garantie des vices caches contre le vendeur.",
     4, 13, 3, "en_attente", None, None, 6, 0, 0),
    ("Occupation illegale d'un terrain",
     "Un tiers a edifie une habitation sur la parcelle de notre client sans droit ni titre. Demande de validation de la propriete, d'expulsion et de dommages-interets pour occupation sans droit.",
     5, 14, 4, "en_attente", None, None, 5, 0, 0),
    ("Abordage entre navires de peche",
     "Deux navires de peche se sont abordes au large de Dakar. Notre client, armateur du navire victime, reclame la reparation du navire et l'indemnisation de l'arret de peche.",
     6, 10, 0, "en_attente", None, None, 4, 0, 0),
    ("Recouvrement de creance fournisseur",
     "Le client nous mandate pour recouvrer une creance commerciale de 85 millions FCFA impayee depuis huit mois malgre les relances. Proposition d'une procedure d'injonction de payer.",
     11, 10, 2, "en_attente", None, None, 3, 0, 0),
    # --- EN ATTENTE AFFECTATION (5) ---
    ("Escroquerie sur operations bancaires",
     "Enquete sur des virements frauduleux effectues depuis le compte de la societe par un ancien comptable. La partie civile reclame la restitution des fonds et des dommages-interets.",
     7, 16, 0, "en_attente_affectation", None, None, 18, 0, 0),
    ("Vol en recidive - circonstances attenuantes",
     "Le client est poursuivi pour vol en recidive. Les faits sont anciens et il a aujourd'hui une situation professionnelle stable. La defense plaidera la reinsertion et demandera le sursis.",
     8, 2, 1, "en_attente_affectation", None, None, 15, 0, 0),
    ("Contrefacon de marque deposee",
     "Constat de vente de produits contrefaisants reprenant la marque de notre client sur le marche local. Demande de cessation des actes de contrefacon, de confiscation et de dommages-interets.",
     9, 11, 2, "en_attente_affectation", None, None, 12, 0, 0),
    ("Depot de bilan - plan de redressement",
     "Notre client, en cessation des paiements, souhaite deposer une declaration de cessation et beneficier d'une periode d'observation en vue d'un plan de redressement par continuation.",
     10, 15, 3, "en_attente_affectation", None, None, 10, 0, 0),
    ("Partage de succession conflictuel",
     "Conflit entre heritiers sur le partage d'une succession comprenant un immeuble et des parts sociales. Demande d'ouverture des operations de partage et de nomination d'un notaire.",
     12, 5, 4, "en_attente_affectation", None, None, 9, 0, 0),
    # --- EN COURS (25) ---
    ("Bail commercial - expulsion du locataire",
     "Le preneur est dechu de son droit au renouvellement du bail pour defaut de paiement des loyers depuis quatorze mois. Assignation en expulsion et en paiement des arrieres.",
     4, 8, 0, "en_cours", 0, 0, 60, 5, 0),
    ("Rupture abusive de contrat de franchise",
     "Le franchiseur a notifie la resiliation du contrat sans motif legitime et a l'issue du delai. Notre client, franchise, reclame des dommages-interets pour rupture abusive et perte de clientele.",
     0, 9, 0, "en_cours", 0, 1, 55, 4, 0),
    ("Faute de gestion du gerant - action en responsabilite",
     "Le gerant a engage des depenses manifestement excedant l'objet social. Les associes engagent sa responsabilite pour faute de gestion et demandent sa revocation.",
     1, 17, 0, "en_cours", 0, 2, 50, 3, 0),
    ("Litige prud'homal - indemnites de depart",
     "Le salarie conteste son depart a la retraite anticipe et demande le rappel d'indemnites de preavis et de licenciement. Audience de conciliation en cours.",
     2, 13, 0, "en_cours", 0, 0, 48, 6, 0),
    ("Demande de pension alimentaire",
     "Notre cliente demande la fixation d'une pension alimentaire pour l'entretien de ses deux enfants ainsi que la contribution du pere aux frais de scolarite.",
     3, 1, 0, "en_cours", 0, 1, 45, 2, 0),
    ("Promesse de vente non executee",
     "Le vendeur refuse de regulariser la vente apres levee d'option. Demande de vente forcee ou de dommages-interets pour inexecution fautive.",
     4, 13, 0, "en_cours", 0, 2, 40, 8, 0),
    ("Expropriation pour cause d'utilite publique",
     "Indemnisation insuffisante proposee pour la parcelle expropriee dans le cadre du projet de voirie. Contestation de l'indemnite devant le juge de l'expropriation.",
     5, 18, 0, "en_cours", 0, 0, 38, 4, 0),
    ("Avaries de cargaison - reclamation maritime",
     "Des conteneurs ont ete endommages a l'arrivee du fait d'un mauvais arrimage. Reclamation d'indemnisation contre le transporteur maritime pour avaries de cargaison.",
     6, 10, 0, "en_cours", 0, 1, 35, 5, 0),
    ("Corruption dans un marche public",
     "Enquete sur des faits de corruption passive dans l'attribution d'un marche public de construction. Le client est cite comme temoin assiste.",
     7, 16, 0, "en_cours", 0, 2, 32, 3, 0),
    ("Coups et blessures volontaires",
     "Notre client a ete agresse sur son lieu de travail. Constitution de partie civile pour obtenir la reparation du prejudice corporel et le remboursement des frais medicaux.",
     8, 0, 0, "en_cours", 0, 0, 30, 2, 0),
    ("Violation de brevet logiciel",
     "Un concurrent reproduit sans autorisation un procede brevete par notre client. Saisine du tribunal en contrefacon et demande de dommages-interets.",
     9, 9, 0, "en_cours", 0, 1, 28, 4, 0),
    ("Sauvegarde judiciaire d'une PME",
     "Ouverture d'une procedure de sauvegarde pour permettre la poursuite de l'activite et la negociation d'un plan. Coordination avec l'administrateur judiciaire.",
     10, 15, 0, "en_cours", 0, 2, 25, 3, 0),
    ("Contentieux de la vente - defaut de paiement",
     "Reclamation du solde d'un contrat de fourniture de materiel agricole. Demande de condamnation au paiement du principal et des interets de retard.",
     11, 11, 0, "en_cours", 0, 0, 22, 2, 0),
    ("Partage successoral - indivision",
     "Liquidation d'une indivision successorale portant sur un immeuble et des comptes bancaires. Accord partiel des heritiers sur la licitation du bien.",
     12, 7, 0, "en_cours", 0, 1, 20, 3, 0),
    ("Marche public - annulation de la procedure",
     "Recours contre une decision d'attribution d'un marche public jugee irreguliere. Demande d'annulation et de reprise de la procedure.",
     13, 13, 0, "en_cours", 0, 2, 18, 2, 0),
    ("Sentence arbitrale - exequatur",
     "Obtenir l'exequatur d'une sentence arbitrale OHADA rendue dans un litige commercial. Procedure devant le president du tribunal regional.",
     14, 10, 0, "en_cours", 0, 0, 16, 3, 0),
    ("Conflit de limites entre parcelles",
     "Desaccord sur les limites entre deux parcelles agricoles au niveau de la commune. Demande de bornage judiciaire et de demarche a l'encontre de l'occupant.",
     5, 5, 1, "en_cours", 1, 0, 120, 10, 0),
    ("Accident du travail - reparation du prejudice",
     "Un ouvrier a ete blesse sur le chantier de notre client. Contentieux avec la compagnie d'assurance sur l'indemnisation de l'incapacite permanente.",
     2, 14, 1, "en_cours", 1, 1, 90, 8, 0),
    ("Litige entre heritiers - licitation",
     "L'un des heritiers souhaite la licitation d'un immeuble indivis que les autres entendent conserver. Expertise de la valeur du bien ordonnee.",
     12, 6, 1, "en_cours", 1, 0, 75, 5, 0),
    ("Impression de faux en ecriture",
     "Notre client est poursuivi pour impression de faux actes. La defense conteste la materialite des faits et demande un supplement d'expertise graphologique.",
     8, 6, 2, "en_cours", 2, 0, 80, 6, 0),
    ("Saisie de navire - creance maritime",
     "Procedure de saisie conservatoire d'un navire pour creance maritime impayee de soute. Mainlevee conditionnee au depot d'une caution bancaire.",
     6, 19, 2, "en_cours", 2, 1, 65, 4, 0),
    ("Cession de parts sociales annulee",
     "Contestation de la regularite d'une cession de parts sociales intervenue sans respect du droit de preemption. Demande de nullite de la cession.",
     1, 17, 2, "en_cours", 2, 0, 55, 7, 0),
    ("Litige locatif - conge denonce",
     "Le bailleur a denonce un conge sans justifier d'un motif legitime. Notre client locataire demande la nullite du conge et le maintien dans les lieux.",
     4, 3, 3, "en_cours", 3, 0, 45, 5, 0),
    ("Detournement de fonds associatif",
     "Le tresorier d'une association a detourne les cotisations des membres. Action en restitution des sommes et en responsabilite civile.",
     7, 18, 3, "en_cours", 3, 1, 40, 3, 0),
    ("Garde alternee et droit de visite",
     "Modification de la residence des enfants suite au changement de situation professionnelle du pere. Demande de garde alternee et fixation du droit de visite.",
     3, 7, 3, "en_cours", 3, 0, 35, 2, 0),
    ("Recouvrement - impayes B2B",
     "Recouvrement judiciaire d'impayes portant sur des prestations de transport ferroviaire. Procedure d'injonction de payer suivie d'une saisie-attribution.",
     11, 16, 3, "en_cours", 3, 1, 30, 6, 0),
    ("Marche de travaux - penalites de retard",
     "Le maitre d'ouvrage applique des penalites de retard contestees. Notre client entrepreneur conteste le point de depart du delai et demande la reprise du solde.",
     13, 19, 4, "en_cours", 4, 0, 70, 5, 0),
    ("Arbitrage commercial OHADA",
     "Procedure d'arbitrage portant sur la resiliation d'un contrat de distribution exclusive. Constitution du tribunal arbitral et presentation des memoires.",
     14, 11, 4, "en_cours", 4, 1, 60, 4, 0),
    ("Licenciement pour faute lourde",
     "Un salarie cadre a ete licencie pour faute lourde apres un incident avec un client. Le salarie conteste la gravite des faits et demande ses indemnites.",
     2, 8, 4, "en_cours", 4, 0, 50, 6, 0),
    # --- TERMINE (10) ---
    ("Divorce par consentement mutuel",
     "Divorce conventionnel regle apres mediation. Convention complete sur la garde des enfants, la pension et la liquidation du regime matrimonial.",
     3, 0, 0, "termine", 0, 0, 180, 15, 90),
    ("Acquisition de terrain - transfert de titre",
     "Securisation de l'acquisition d'un terrain a usage commercial. Transfert de titre foncier realise et immeuble immatricule au nom du client.",
     5, 13, 0, "termine", 0, 1, 165, 12, 80),
    ("Procedure collective - liquidation judiciaire",
     "Cloture des operations de liquidation judiciaire. Repartition de l'actif entre les creanciers et apurement du passif a hauteur de 45%.",
     10, 15, 0, "termine", 0, 2, 150, 10, 75),
    ("Prestation compensatoire",
     "Fixation d'une prestation compensatoire au profit de la conjointe en cas de divorce. Accord sur un versement en capital amiable.",
     3, 1, 2, "termine", 2, 1, 140, 9, 70),
    ("Contentieux douanier",
     "Contestation d'un redressement douanier sur des marchandises importees. Obtention d'une decision favorable ramenant les droits mis en recouvrement.",
     13, 16, 0, "termine", 0, 0, 135, 8, 65),
    ("Rachat de parts - clause de non-concurrence",
     "Negociation et finalisation du rachat des parts d'un associe sortant. Clause de non-concurrence validee et paiement du prix echelonne.",
     1, 9, 0, "termine", 0, 1, 125, 7, 60),
    ("Recouvrement de creance - injonction de payer",
     "Obtention d'une ordonnance d'injonction de payer pour une creance de 50 millions FCFA. Execution forcee par saisie-attribution sur les comptes du debiteur.",
     11, 8, 1, "termine", 1, 0, 120, 6, 55),
    ("Reparation de prejudice corporel",
     "Transaction sur l'indemnisation d'un prejudice corporel suite a un accident de la circulation. Accord global de 35 millions FCFA.",
     8, 2, 2, "termine", 2, 0, 110, 5, 50),
    ("Mediation OHADA",
     "Mediation aboutie entre deux partenaires commerciaux sur un litige de commission d'intermediation. Protocole d'accord signe et solde.",
     14, 19, 0, "termine", 0, 2, 100, 4, 45),
    ("Resiliation abusive de contrat de travail",
     "Jugement condamnant l'employeur pour resiliation abusive. Indemnites octroyees correspondant a dix mois de salaire.",
     2, 13, 3, "termine", 3, 0, 95, 8, 40),
    # --- ARCHIVE (2) ---
    ("Partage de succession regle",
     "Partage definitif de la succession realise a l'amiable devant notaire. Droits des heritiers liquides et immeuble attribue au lot de l'aine.",
     12, 7, 0, "archive", 0, 0, 240, 20, 200),
    ("Litige foncier eteint - transaction",
     "Litige foncier resolu par une transaction portant sur une indemnite d'occupation. Dossier archive apres levee des mesures.",
     5, 5, 4, "archive", 4, 0, 210, 15, 180),
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
    if UPLOAD_DIR.exists():
        shutil.rmtree(UPLOAD_DIR)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
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
