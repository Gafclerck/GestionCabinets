import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { discussionService } from "../../services/discussionService";
import { useAuth } from "../../hooks/useAuth";
import Avatar from "../ui/Avatar";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) +
    " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message, isMine, authorName }) {
  return (
    <div className={`flex items-start gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}>
      <Avatar nom={authorName} size={30} className="shrink-0" />
      <div className={`max-w-[75%] min-w-0 flex flex-col ${isMine ? "items-end" : "items-start"}`}>
        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isMine
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-secondary text-foreground rounded-tl-sm"
        }`}>
          <p className="break-words whitespace-pre-wrap">{message.contenu}</p>
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 px-1">
          {authorName} · {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}

export default function Messagerie({ dossier, utilisateurs = [] }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const discussions = await discussionService.getByDossier(dossier.id);
      if (discussions.length === 0) {
        setMessages([]);
        return;
      }
      const msgs = await discussionService.getMessages(discussions[0].id, 0, 200);
      setMessages(msgs);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement des messages");
    } finally {
      setLoading(false);
    }
  }, [dossier.id, scrollToBottom]);

  useEffect(() => {
    if (!dossier?.id) return;
    loadMessages();

    const token = localStorage.getItem("access_token");
    const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/^http/, "ws");
    const ws = new WebSocket(`${baseUrl}/api/ws/dossier/${dossier.id}?token=${encodeURIComponent(token || "")}`);

    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          setMessages((prev) => [...prev, data]);
          setTimeout(scrollToBottom, 50);
        }
      } catch {
        /* ignore */
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [dossier?.id, loadMessages, scrollToBottom]);

  async function handleSend(e) {
    e.preventDefault();
    const contenu = input.trim();
    if (!contenu || sending) return;

    setSending(true);
    setError(null);
    try {
      const wsReady = wsRef.current && wsRef.current.readyState === WebSocket.OPEN;
      if (wsReady) {
        wsRef.current.send(JSON.stringify({ contenu }));
      } else {
        const msg = await discussionService.sendMessage(dossier.id, contenu);
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 50);
      }
      setInput("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-success" : "bg-muted-foreground/50"}`} />
            {connected ? "Connecté" : "Hors ligne"}
          </span>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />Chargement des messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <div className="w-14 h-14 rounded-3xl bg-secondary flex items-center justify-center">
              <MessageSquare size={24} />
            </div>
            <p className="text-sm font-medium">Aucun message</p>
            <p className="text-xs text-muted-foreground">Lancez la conversation avec votre équipe sur ce dossier.</p>
          </div>
        ) : (
          messages.map((m) => {
            const author =
              typeof m.auteur_nom === "string"
                ? m.auteur_nom
                : utilisateurs.find((u) => u.id === m.auteur_id)?.nom || "Collaborateur";
            const isMine = m.auteur_id === user?.id;
            return <MessageBubble key={m.id || m.created_at} message={m} isMine={isMine} authorName={author} />;
          })
        )}
      </div>

      {error && (
        <div className="mt-3 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-end gap-2 mt-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          rows={2}
          placeholder="Ecrire un message... (Entree pour envoyer, Maj+Entree pour sauter une ligne)"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 resize-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex items-center gap-1.5 h-10 px-4 bg-primary text-primary-foreground rounded-lg text-[13px] font-semibold hover:bg-sidebar-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Envoyer
        </button>
      </form>
    </div>
  );
}
