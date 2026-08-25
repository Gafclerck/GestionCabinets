import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, UserCheck,
  CheckCircle, ChevronRight, ChevronDown, List,
} from "lucide-react";
import { useDossiers } from "../../hooks/useDossiers";
import { estEnAffectation } from "../../lib/constants";
import StatusBadge from "../../components/ui/StatusBadge";
import PrioriteStars from "../../components/ui/PrioriteStars";
import EmptyState from "../../components/ui/EmptyState";
import AffectationModal from "../../components/dossiers/AffectationModal";

const PRIORITE_LABELS = { 1: "P1", 2: "P2", 3: "P3", 4: "P4", 5: "P5" };

function DossierCard({ dossier, onAffecter }) {
  const navigate = useNavigate();
  const prioriteHaute = dossier.priorite >= 4;
  const daysSinceReception = Math.max(1, Math.floor((Date.now() - new Date(dossier.date_reception).getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-start gap-3 flex-wrap mb-3">
          <StatusBadge statut={dossier.statut} />
          <span className="text-[11px] font-bold text-muted-foreground tabular-nums tracking-wide">
            {dossier.reference}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <Clock size={12} className={prioriteHaute ? "text-warning" : "text-muted-foreground"} />
            <span className={`text-[11px] ${prioriteHaute ? "text-warning font-semibold" : "text-muted-foreground"}`}>
              {daysSinceReception} jour{daysSinceReception > 1 ? "s" : ""} d'attente
            </span>
          </div>
        </div>

        <h3 className="text-base font-bold text-foreground mb-1.5 leading-snug">
          {dossier.titre}
        </h3>
        <div className="flex items-center gap-2 flex-wrap text-[13px] text-muted-foreground">
          <span>{dossier.type_affaire_libelle}</span>
          {dossier.client_nom && (
            <>
              <span className="text-border">·</span>
              <span>{dossier.client_nom}</span>
            </>
          )}
          <span className="text-border ml-1">·</span>
          <PrioriteStars priorite={dossier.priorite} />
          <span className="text-[11px] text-muted-foreground ml-1">{PRIORITE_LABELS[dossier.priorite]}</span>
        </div>
      </div>

      <div className="px-6 py-4 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(`/dossiers/${dossier.reference}`)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-foreground bg-transparent border border-border rounded px-4 py-2.5 cursor-pointer hover:bg-secondary transition-colors min-h-[44px]"
        >
          Voir le dossier <ChevronRight size={13} />
        </button>

        <button
          onClick={() => onAffecter(dossier)}
          className="flex items-center gap-2 text-[13px] font-semibold text-primary-foreground bg-primary border-none rounded px-5 py-2.5 cursor-pointer shadow-md hover:opacity-90 transition-all min-h-[44px]"
        >
          <UserCheck size={14} />
          Affecter
        </button>
      </div>
    </div>
  );
}

export default function FileAffectation() {
  const { data: dossiers = [], loading } = useDossiers();
  const [affectationTarget, setAffectationTarget] = useState(null);
  const [affectedRefs, setAffectedRefs] = useState(new Set());
  const [sortDir, setSortDir] = useState("asc");

  const dossiersEnAttente = useMemo(() => {
    const t = (d) => new Date(d.date_reception).getTime();
    return dossiers
      .filter((d) => estEnAffectation(d.statut) && !affectedRefs.has(d.reference))
      .sort((a, b) => (sortDir === "asc" ? t(a) - t(b) : t(b) - t(a)));
  }, [dossiers, affectedRefs, sortDir]);

  function handleAffecter(d) {
    setAffectationTarget(d);
  }

  function handleConfirm() {
    if (!affectationTarget) return;
    setAffectedRefs((prev) => new Set([...prev, affectationTarget.reference]));
    setAffectationTarget(null);
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background">
      <div className="max-w-[800px] mx-auto">
        <div className="flex items-start justify-between mb-7 gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
                <List size={15} className="text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground m-0">
                File d'affectation
              </h1>
            </div>
            <p className="text-[13px] text-muted-foreground m-0">
              {loading ? "Chargement..." : dossiersEnAttente.length > 0
                ? `${dossiersEnAttente.length} dossier${dossiersEnAttente.length > 1 ? "s" : ""} en attente · triés par priorité`
                : "File vide"}
            </p>
          </div>

          {dossiersEnAttente.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value)}
                  className="appearance-none h-9 pr-8 pl-3 border border-border bg-card rounded text-[13px] text-muted-foreground cursor-pointer outline-none min-w-[185px]"
                >
                  <option value="asc">Plus anciens d'abord</option>
                  <option value="desc">Plus récents d'abord</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 bg-status-attente-bg text-status-attente-text rounded-full px-4 py-2 shrink-0">
                <Clock size={13} />
                <span className="text-[13px] font-semibold tabular-nums">
                  {dossiersEnAttente.length} en attente
                </span>
              </div>
            </div>
          )}
        </div>

        {dossiersEnAttente.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Aucun dossier en attente - bon travail !"
            description="Tous les dossiers reçus ont été affectés. Repassez plus tard ou consultez la liste complète des dossiers."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {dossiersEnAttente.map((d) => (
              <DossierCard key={d.reference} dossier={d} onAffecter={handleAffecter} />
            ))}
          </div>
        )}
      </div>

      {affectationTarget && (
        <AffectationModal
          dossier={affectationTarget}
          open={!!affectationTarget}
          onClose={() => setAffectationTarget(null)}
          onConfirm={(agenceId, avocatId) => handleConfirm(agenceId, avocatId)}
          initialAgenceId={affectationTarget.analyse_ia?.agence_suggeree_id}
          initialAvocatId={affectationTarget.analyse_ia?.avocat_suggere_id}
        />
      )}
    </div>
  );
}
