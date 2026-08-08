import {
  Clock, Repeat, PlusCircle, UserCheck, FileUp, ArrowRight,
  MessageSquare, FileText, Users, Building2
} from "lucide-react";
import { useHistorique } from "../../hooks/useHistorique";

// --- Dictionnaires de traduction ---------------------------------------

const STATUT_LABELS = {
  en_attente: "En attente",
  en_cours: "En cours",
  affecte: "Affecté",
  archive: "Archivé",
  cloture: "Clôturé",
  rejete: "Rejeté",
};

const PRIORITE_LABELS = {
  1: "Faible",
  2: "Normale",
  3: "Haute",
  4: "Urgente",
};

function formatStatut(value) {
  if (value === null || value === undefined) return "—";
  return STATUT_LABELS[value] || value.replaceAll("_", " ");
}

// --- Configuration visuelle par type d'action ---------------------------

const ACTION_CONFIG = [
  {
    match: (a) => a === "creation" || a?.includes("creation"),
    label: "Création du dossier",
    icon: PlusCircle,
    iconBg: "bg-teal-100 text-teal-600 border-teal-200",
  },
  {
    match: (a) => a?.includes("statut"),
    label: "Changement de statut",
    icon: Repeat,
    iconBg: "bg-blue-100 text-blue-600 border-blue-200",
  },
  {
    match: (a) => a?.includes("affect"),
    label: "Affectation du dossier",
    icon: UserCheck,
    iconBg: "bg-indigo-100 text-indigo-600 border-indigo-200",
  },
  {
    match: (a) => a?.includes("document") || a?.includes("piece"),
    label: "Dépôt de document",
    icon: FileUp,
    iconBg: "bg-emerald-100 text-emerald-600 border-emerald-200",
  },
  {
    match: (a) => a?.includes("message") || a?.includes("commentaire"),
    label: "Message envoyé",
    icon: MessageSquare,
    iconBg: "bg-purple-100 text-purple-600 border-purple-200",
  },
];

const DEFAULT_ACTION_CONFIG = {
  label: null, // sera dérivé de l'action brute
  icon: FileText,
  iconBg: "bg-slate-100 text-slate-600 border-slate-200",
};

function getActionConfig(action) {
  const found = ACTION_CONFIG.find((c) => c.match(action));
  if (found) return found;
  return {
    ...DEFAULT_ACTION_CONFIG,
    label: action ? action.replaceAll("_", " ") : "Évènement",
  };
}

// --- Auteur --------------------------------------------------------------
// Le backend ne renvoie pour l'instant qu'un user_id. On accepte une map
// optionnelle { [userId]: { nom, initiales, avatarBg } } via les props pour
// pouvoir afficher un vrai nom dès qu'elle sera disponible (ex: liste des
// utilisateurs déjà chargée ailleurs dans l'app).

const AVATAR_PALETTE = [
  "bg-slate-800 text-white",
  "bg-amber-500 text-white",
  "bg-indigo-500 text-white",
  "bg-emerald-600 text-white",
  "bg-rose-500 text-white",
  "bg-sky-600 text-white",
];

function getAuteurInfo(userId, usersMap) {
  const known = usersMap?.[userId];
  if (known) {
    return {
      nom: known.nom,
      initiales: known.initiales || known.nom?.slice(0, 2)?.toUpperCase() || "?",
      avatarBg: known.avatarBg || AVATAR_PALETTE[userId % AVATAR_PALETTE.length],
    };
  }
  return {
    nom: userId ? `Utilisateur #${userId}` : "Système",
    initiales: userId ? String(userId).padStart(2, "0") : "SY",
    avatarBg: AVATAR_PALETTE[(userId || 0) % AVATAR_PALETTE.length],
  };
}

// --- Temps ----------------------------------------------------------------

function getTempsRelatif(dateStr) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return "À l'instant";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Il y a ${diffMin} minute${diffMin > 1 ? "s" : ""}`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} heure${diffH > 1 ? "s" : ""}`;
  const diffJ = Math.floor(diffH / 24);
  if (diffJ < 7) return `Il y a ${diffJ} jour${diffJ > 1 ? "s" : ""}`;
  const diffSem = Math.floor(diffJ / 7);
  if (diffJ < 30) return `Il y a ${diffSem} semaine${diffSem > 1 ? "s" : ""}`;
  const diffMois = Math.floor(diffJ / 30);
  if (diffJ < 365) return `Il y a ${diffMois} mois`;
  const diffAns = Math.floor(diffJ / 365);
  return `Il y a ${diffAns} an${diffAns > 1 ? "s" : ""}`;
}

function getHorodatage(dateStr) {
  const date = new Date(dateStr);
  const jour = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const heure = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${jour} à ${heure}`;
}

// --- Contenu (changement avant/après ou détails textuels) ----------------

function getContenu(event) {
  const { action, ancienne_valeur, nouvelle_valeur, commentaire } = event;

  // Création du dossier : on affiche titre + référence
  if (action === "creation" || action?.includes("creation")) {
    const titre = nouvelle_valeur?.titre;
    const reference = nouvelle_valeur?.reference;
    return {
      details:
        titre || reference
          ? `Création de la fiche dossier « ${titre || "Sans titre"} »${
              reference ? ` (Réf: ${reference})` : ""
            }`
          : commentaire,
    };
  }

  // Changement de statut
  if (action?.includes("statut")) {
    const avant = formatStatut(ancienne_valeur?.statut ?? ancienne_valeur);
    const apres = formatStatut(nouvelle_valeur?.statut ?? nouvelle_valeur);
    return { changement: { avant, apres }, details: commentaire };
  }

  // Affectation (avocat ou agence)
  if (action?.includes("affect")) {
    const avantAvocat = ancienne_valeur?.avocat_assigne_nom ?? ancienne_valeur?.avocat_assigne_id;
    const apresAvocat = nouvelle_valeur?.avocat_assigne_nom ?? nouvelle_valeur?.avocat_assigne_id;
    const avantAgence = ancienne_valeur?.agence_assigne_nom ?? ancienne_valeur?.agence_assigne_id;
    const apresAgence = nouvelle_valeur?.agence_assigne_nom ?? nouvelle_valeur?.agence_assigne_id;

    if (apresAvocat !== undefined) {
      return {
        changement: {
          avant: avantAvocat ? String(avantAvocat) : "Non affecté",
          apres: apresAvocat ? String(apresAvocat) : "Non affecté",
        },
        details: commentaire,
      };
    }
    if (apresAgence !== undefined) {
      return {
        changement: {
          avant: avantAgence ? String(avantAgence) : "Non affectée",
          apres: apresAgence ? String(apresAgence) : "Non affectée",
        },
        details: commentaire,
      };
    }
    return { details: commentaire };
  }

  // Document déposé
  if (action?.includes("document") || action?.includes("piece")) {
    const nomFichier =
      nouvelle_valeur?.nom_fichier || nouvelle_valeur?.nom || nouvelle_valeur?.titre;
    return {
      details: nomFichier
        ? `A ajouté le document « ${nomFichier} »`
        : commentaire || "Document ajouté",
    };
  }

  // Message / commentaire simple
  if (action?.includes("message") || action?.includes("commentaire")) {
    return { details: commentaire ? `« ${commentaire} »` : "Message envoyé" };
  }

  // Cas générique : on retombe sur le commentaire s'il existe, sinon on
  // tente une diff simple entre ancienne_valeur et nouvelle_valeur.
  if (commentaire) return { details: commentaire };

  if (
    ancienne_valeur &&
    nouvelle_valeur &&
    typeof ancienne_valeur === "object" &&
    typeof nouvelle_valeur === "object"
  ) {
    const cleChangee = Object.keys(nouvelle_valeur).find(
      (k) => nouvelle_valeur[k] !== ancienne_valeur?.[k]
    );
    if (cleChangee) {
      return {
        changement: {
          avant: String(ancienne_valeur[cleChangee] ?? "—"),
          apres: String(nouvelle_valeur[cleChangee] ?? "—"),
        },
      };
    }
  }

  return {};
}

// --- Composant --------------------------------------------------------

export default function Onglethistorique({ usersMap }) {
  const { data: historyEvents } = useHistorique(1);
  const events = historyEvents || [];

  return (
    <div className="w-full bg-card rounded-xl border border-border p-4 sm:p-6 text-foreground font-sans">
      {/* En-tête de la section */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Historique d'activité
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Journal immuable des évènements et modifications du dossier.
          </p>
        </div>
        <span className="bg-secondary text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
          {events.length} événement{events.length > 1 ? "s" : ""}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun évènement enregistré pour ce dossier.
        </p>
      ) : (
        <div className="relative pl-3 sm:pl-6 space-y-6 before:absolute before:left-[19px] sm:before:left-[31px] before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
          {events.map((event) => {
            const config = getActionConfig(event.action);
            const IconComponent = config.icon;
            const auteur = getAuteurInfo(event.user_id, usersMap);
            const { changement, details } = getContenu(event);
            const tempsRelatif = getTempsRelatif(event.created_at);
            const horodatage = getHorodatage(event.created_at);

            return (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Icône sur l'axe vertical de la timeline */}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border shadow-sm shrink-0 ${config.iconBg}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                {/* Contenu du bloc historique */}
                <div className="flex-1 bg-secondary/20 rounded-lg border border-border/60 p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {config.label}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${auteur.avatarBg}`}
                        >
                          {auteur.initiales}
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {auteur.nom}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span title={horodatage}>{tempsRelatif}</span>
                      <span>•</span>
                      <span className="hidden sm:inline">{horodatage}</span>
                    </div>
                  </div>

                  {/* Valeur Avant -> Après si présente */}
                  {changement && (
                    <div className="inline-flex items-center gap-2 text-xs bg-background border border-border px-3 py-1.5 rounded-md mt-1">
                      <span className="px-2 py-0.5 bg-secondary text-muted-foreground rounded font-medium line-through">
                        {changement.avant}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="px-2 py-0.5 bg-primary/10 text-primary font-semibold rounded">
                        {changement.apres}
                      </span>
                    </div>
                  )}

                  {/* Détails du message ou document */}
                  {details && (
                    <p className="text-xs text-muted-foreground">{details}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}