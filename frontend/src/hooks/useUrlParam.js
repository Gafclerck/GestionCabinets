import { useSearchParams } from "react-router-dom";

// Parametre d'URL partage : lit `?<key>=` et le met a jour en PRESERVANT les
// autres parametres (q de la recherche, agence, etc. coexistent sans s'ecraser).
// Meme contrat que useSearchQuery : source de verite = l'URL, setter appele
// uniquement dans les event handlers, { replace: true } pour ne pas polluer
// l'historique.
export function useUrlParam(key) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) || "";

  const setValue = (v) => {
    setSearchParams(
      (prev) => {
        if (v) prev.set(key, String(v));
        else prev.delete(key);
        return prev;
      },
      { replace: true }
    );
  };

  return [value, setValue];
}