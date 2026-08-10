import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { useDiscussion } from "../../hooks/useDiscussion";
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
  const [input, setInput] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const {
    messages,
    loading,
    loadingMore,
    sending,
    connected,
    error,
    refetch,
    loadMore,
    handleSend,
    hasMore,
  } = useDiscussion({
    dossierId: dossier.id,
    sujet: `Discussion - ${dossier.reference}`,
  });

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  const lastMessageId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (lastMessageId) scrollToBottom();
  }, [lastMessageId]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const ok = await handleSend(input);
    if (ok) setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-full w-full mx-auto lg:w-[80%] lg:max-w-7xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-success" : "bg-muted-foreground/50"}`} />
            {connected ? "Connecté" : "Hors ligne"}
          </span>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            title="Recharger la conversation"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 min-h-0">
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="self-center mt-1 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-full hover:bg-secondary transition-colors"
          >
            {loadingMore ? "Chargement..." : "Charger les messages précédents"}
          </button>
        )}

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

      <form onSubmit={onSubmit} className="flex items-end gap-2 mt-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
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
