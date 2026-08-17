import { PlusCircle, Repeat, UserCheck, FileUp, Trash2, MessageSquare, FileText, Building2 } from "lucide-react";
import { STATUT_LABELS } from "./constants";

export function formatStatut(value) {
  if (value === null || value === undefined) return "-";
  return STATUT_LABELS[value] || value.replaceAll("_", " ");
}

// Configuration visuelle par type d'action.
// Partage entre l'apercu (onglet Apercu) et l'onglet Historique complet.

export const ACTION_CONFIG = [
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
    match: (a) => a?.includes("transfert"),
    label: "Demande de transfert",
    icon: Building2,
    iconBg: "bg-amber-100 text-amber-600 border-amber-200",
  },
  {
    match: (a) => a === "suppression_document",
    label: "Suppression de document",
    icon: Trash2,
    iconBg: "bg-red-100 text-red-600 border-red-200",
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

export function getActionConfig(action) {
  const found = ACTION_CONFIG.find((c) => c.match(action));
  if (found) return found;
  return {
    ...DEFAULT_ACTION_CONFIG,
    label: action ? action.replaceAll("_", " ") : "Évènement",
  };
}

// Auteur
// Le backend renvoie un user_id. On accepte une map optionnelle
// { [userId]: { nom, initiales } } pour afficher un vrai nom.

const AVATAR_PALETTE = [
  "bg-slate-800 text-white",
  "bg-amber-500 text-white",
  "bg-indigo-500 text-white",
  "bg-emerald-600 text-white",
  "bg-rose-500 text-white",
  "bg-sky-600 text-white",
];

export function getAuteurInfo(userId, usersMap) {
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

// Temps

export function getTempsRelatif(dateStr) {
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

export function getHorodatage(dateStr) {
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

// Contenu (changement avant/après ou détails textuels)

export function getContenu(event) {
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

  // Transfert : le motif est enregistre dans commentaire
  if (action?.includes("transfert")) {
    return { details: commentaire ? `Motif : « ${commentaire} »` : "Demande de transfert soumise" };
  }

  // Suppression de document : le nom est dans ancienne_valeur
  if (action === "suppression_document") {
    const nomFichier = ancienne_valeur?.nom_fichier;
    return {
      details: nomFichier
        ? `A supprimé le document « ${nomFichier} »`
        : commentaire || "Document supprimé",
    };
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
          avant: String(ancienne_valeur[cleChangee] ?? "-"),
          apres: String(nouvelle_valeur[cleChangee] ?? "-"),
        },
      };
    }
  }

  return {};
}
