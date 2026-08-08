import { useState, useEffect, useCallback } from "react";
import { historiqueService } from "../services/historiqueService";

export function useHistorique(id) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await historiqueService.getById(id);
      setData(result);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
