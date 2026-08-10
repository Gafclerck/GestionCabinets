import { useState, useEffect, useCallback, useRef } from "react";
import { discussionService } from "../services/discussionService";

const PAGE_SIZE = 200;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;

function buildWsUrl(discussionId) {
  const token = localStorage.getItem("access_token");
  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/^http/, "ws");
  return `${baseUrl}/api/ws/discussion/${discussionId}?token=${encodeURIComponent(token || "")}`;
}

export function useDiscussion({ dossierId, sujet }) {
  const [discussion, setDiscussion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef(null);
  const retryTimerRef = useRef(null);

  const appendUnique = useCallback((next) => {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...prev];
      for (const m of next) {
        if (!seen.has(m.id)) {
          merged.push(m);
          seen.add(m.id);
        }
      }
      return merged;
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!dossierId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let room = await discussionService.getByDossier(dossierId);
      if (!room) {
        room = await discussionService.create({ sujet, dossier_id: dossierId });
      }
      setDiscussion(room);
      const result = await discussionService.getMessages(room.id, 0, PAGE_SIZE);
      setMessages(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement de la conversation");
    } finally {
      setLoading(false);
    }
  }, [dossierId, sujet]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!discussion?.id) return;
    let cancelled = false;
    let backoff = RECONNECT_BASE_MS;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(buildWsUrl(discussion.id));
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        backoff = RECONNECT_BASE_MS;
        setConnected(true);
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        retryTimerRef.current = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "message") {
            appendUnique([data]);
          } else if (data.type === "error") {
            setError(data.detail || "Erreur du serveur");
          }
        } catch {
          // frame illisible ignoree
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [discussion?.id, appendUnique]);

  const loadMore = useCallback(async () => {
    if (!discussion || loadingMore || messages.length >= total) return;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await discussionService.getMessages(discussion.id, messages.length, PAGE_SIZE);
      appendUnique(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement des messages");
    } finally {
      setLoadingMore(false);
    }
  }, [discussion, loadingMore, messages.length, total, appendUnique]);

  const handleSend = useCallback(
    async (contenu) => {
      const text = contenu.trim();
      if (!text || sending || !discussion) return false;
      setSending(true);
      setError(null);
      try {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ contenu: text }));
        } else {
          const msg = await discussionService.sendMessage(discussion.id, text);
          appendUnique([msg]);
        }
        return true;
      } catch (err) {
        setError(err.response?.data?.detail || "Erreur lors de l'envoi du message");
        return false;
      } finally {
        setSending(false);
      }
    },
    [sending, discussion, appendUnique]
  );

  return {
    discussion,
    messages,
    total,
    loading,
    loadingMore,
    sending,
    connected,
    error,
    refetch: loadData,
    loadMore,
    handleSend,
    hasMore: messages.length < total,
  };
}
