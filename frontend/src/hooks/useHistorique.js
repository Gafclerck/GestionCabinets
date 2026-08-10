import { useState, useEffect, useCallback } from "react";
import { historiqueService } from "../services/historiqueService";

const PAGE_SIZE = 20;

export function useHistorique(id) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await historiqueService.getByDossierId(id, 0, PAGE_SIZE);
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMore = useCallback(async () => {
    if (!id || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await historiqueService.getByDossierId(id, items.length, PAGE_SIZE);
      setItems((prev) => [...prev, ...result.items]);
      setTotal(result.total);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement de l'historique");
    } finally {
      setLoadingMore(false);
    }
  }, [id, items.length, loadingMore]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return {
    data: items,
    total,
    loading,
    loadingMore,
    error,
    refetch: fetchData,
    loadMore,
    hasMore: items.length < total,
  };
}
