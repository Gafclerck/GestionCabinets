import { Clock, ArrowRight } from "lucide-react";
import { useHistorique } from "../../hooks/useHistorique";
import {
  getActionConfig, getAuteurInfo, getTempsRelatif, getHorodatage, getContenu,
} from "../../lib/historique";

// --- Composant --------------------------------------------------------

export default function Onglethistorique({ dossierId, usersMap }) {
  const { data: historyEvents, loading, error, refetch } = useHistorique(dossierId);
  const events = historyEvents || [];

  return (
    <div className="w-full bg-card rounded-xl border border-border p-4 sm:p-6 text-foreground font-sans">
      {/* En-tête de la section */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Historique d'activité
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Journal immuable des évènements et modifications du dossier.
          </p>
        </div>
        {!loading && !error && (
          <span className="bg-secondary text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
            {events.length} événement{events.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Chargement de l'historique...
        </p>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-sm text-muted-foreground text-center">{error}</p>
          <button
            onClick={refetch}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun évènement enregistré pour ce dossier.
        </p>
      ) : (
        <div className="relative pl-3 sm:pl-6 space-y-6 before:absolute before:left-[19px] sm:before:left-[31px] before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
          {events.map((event) => {
            const config = getActionConfig(event.action);
            const IconComponent = config.icon;
            const auteur = getAuteurInfo(event.user_id, usersMap);
            const { changement, details } = getContenu(event);
            const tempsRelatif = getTempsRelatif(event.created_at);
            const horodatage = getHorodatage(event.created_at);

            return (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Icône sur l'axe vertical de la timeline */}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border shadow-sm shrink-0 ${config.iconBg}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                {/* Contenu du bloc historique */}
                <div className="flex-1 bg-secondary/20 rounded-lg border border-border/60 p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {config.label}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${auteur.avatarBg}`}
                        >
                          {auteur.initiales}
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {auteur.nom}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span title={horodatage}>{tempsRelatif}</span>
                      <span>•</span>
                      <span className="hidden sm:inline">{horodatage}</span>
                    </div>
                  </div>

                  {/* Valeur Avant -> Après si présente */}
                  {changement && (
                    <div className="inline-flex items-center gap-2 text-xs bg-background border border-border px-3 py-1.5 rounded-md mt-1">
                      <span className="px-2 py-0.5 bg-secondary text-muted-foreground rounded font-medium line-through">
                        {changement.avant}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="px-2 py-0.5 bg-primary/10 text-primary font-semibold rounded">
                        {changement.apres}
                      </span>
                    </div>
                  )}

                  {/* Détails du message ou document */}
                  {details && (
                    <p className="text-xs text-muted-foreground">{details}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
