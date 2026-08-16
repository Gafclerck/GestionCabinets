import { useUrlParam } from "./useUrlParam";

// Recherche globale pilotee par l'URL (?q=...) : la topbar et l'input de la
// page ecrivent le meme parametre, chaque page filtre ses donnees deja
// chargees. Source de verite unique = l'URL (persistant, partageable, back OK).
// Delegue a useUrlParam : le setter preserve les autres params de l'URL.
export function useSearchQuery() {
  return useUrlParam("q");
}