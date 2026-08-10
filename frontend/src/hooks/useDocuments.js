import { useState, useEffect, useCallback } from "react";
import { documentService } from "../services/documentService";

export function useDocuments(dossierId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!dossierId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await documentService.getAll(dossierId);
      setData(result);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
