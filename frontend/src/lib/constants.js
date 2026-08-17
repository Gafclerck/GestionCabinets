//  Rôles (backend enum) 
export const ROLES = {
  chef_central: "chef_central",
  chef_agence: "chef_agence",
  avocat: "avocat",
};

export const ROLE_LABELS = {
  chef_central: "Gérant Central",
  chef_agence: "Avocat en Chef",
  avocat: "Avocat",
};

//  Statuts dossier (aligned with backend StatutDossier enum) 
export const STATUT_DOSSIER = {
  en_attente: "en_attente",
  en_attente_affectation: "en_attente_affectation",
  en_cours: "en_cours",
  termine: "termine",
  archive: "archive",
};

export const STATUT_LABELS = {
  en_attente: "En attente",
  en_attente_affectation: "En attente d'affectation",
  en_cours: "En cours",
  termine: "Terminé",
  archive: "Archivé",
};

export const STATUT_STYLES = {
  en_attente:               { bg: "bg-status-attente-bg",   text: "text-status-attente-text" },
  en_attente_affectation:   { bg: "bg-status-attente-bg",   text: "text-status-attente-text" },
  en_cours:                 { bg: "bg-status-en-cours-bg",  text: "text-status-en-cours-text" },
  termine:                  { bg: "bg-status-cloture-bg",   text: "text-status-cloture-text" },
  archive:                  { bg: "bg-status-archive-bg",   text: "text-status-archive-text" },
};

// Ordre d'affichage privilegie des dossiers: en cours d'abord, puis en attente, puis termines.
export const STATUT_ORDRE = {
  en_cours: 1,
  en_attente: 2,
  en_attente_affectation: 2,
  termine: 3,
  archive: 4,
};

export const STATUTS_ACTIFS = [
  "en_attente", "en_attente_affectation", "en_cours",
];

export function isActif(statut) {
  return STATUTS_ACTIFS.includes(statut);
}

// ─── Priorité 
export const PRIORITE_LABELS = {
  1: "Très basse",
  2: "Basse",
  3: "Normale",
  4: "Haute",
  5: "Très haute",
};

export const PRIORITE_SHORT = {
  1: "P1", 2: "P2", 3: "P3", 4: "P4", 5: "P5",
};

//  Types de client 
export const TYPE_CLIENT = {
  PHYSIQUE: "PHYSIQUE",
  MORALE: "MORALE",
};

export const TYPE_CLIENT_LABELS = {
  PHYSIQUE: "Personne physique",
  MORALE: "Personne morale",
};

//  UI constants 
export const SIDEBAR_WIDTH = 232;
