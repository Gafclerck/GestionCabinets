import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Folder, TrendingUp, Clock, CheckCircle, Repeat,
  List, Plus, ArrowRight, Users, Home, MessageSquare,
  ChevronRight, AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useDossiers } from "../../hooks/useDossiers";
import { useAgences } from "../../hooks/useAgences";
import { useUsers } from "../../hooks/useUsers";
import { ROLE_LABELS, isActif } from "../../lib/constants";
import { getGreeting } from "../../lib/utils";
import Avatar from "../../components/ui/Avatar";
import KpiCard from "../../components/ui/KpiCard";
import SectionCard from "../../components/ui/SectionCard";
import StatusBadge from "../../components/ui/StatusBadge";

function GerantCentralDashboard() {
  const navigate = useNavigate();
  const { data: dossiers = [] } = useDossiers();
  const { data: agences = [] } = useAgences();
  const { data: utilisateurs = [] } = useUsers();
  const actifs = useMemo(() => dossiers.filter((d) => isActif(d.statut)), [dossiers]);

  const chargeParAgence = useMemo(() =>
    agences.map((a) => ({
      id: a.id, nom: a.ville, nomComplet: a.nom,
      count: actifs.filter((d) => (d.agence_assigne_id || d.agence_receptrice_id) === a.id).length,
    })), [actifs, agences]);

  const repartitionAvocats = useMemo(() => {
    const avs = utilisateurs.filter((u) => u.role === "avocat" || u.role === "chef_agence");
    return avs.map((av) => ({
      ...av,
      dossiersActifs: actifs.filter((d) => d.avocat_assigne_id === av.id).length,
    })).filter((av) => av.dossiersActifs > 0).sort((a, b) => b.dossiersActifs - a.dossiersActifs);
  }, [actifs, utilisateurs]);

  const transfertsPendants = useMemo(() => dossiers.filter((d) => d.statut === "en_attente_affectation"), [dossiers]);
  const urgents = actifs.filter((d) => d.priorite >= 4).length;
  const enAttente = actifs.filter((d) => d.statut === "en_attente").length;
  const enCours = actifs.filter((d) => d.statut === "en_cours").length;

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20 bg-background">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-foreground mb-1">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de l'activité - Cabinet Diop & Associés</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <KpiCard label="Dossiers actifs" value={actifs.length} icon={Folder} accent />
          <KpiCard label="Priorités hautes" value={urgents} icon={TrendingUp} />
          <KpiCard label="En attente d'affectation" value={enAttente} icon={Clock} />
          <KpiCard label="En cours de traitement" value={enCours} icon={CheckCircle} />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <SectionCard title="Charge par agence" subtitle="Dossiers actifs (non clôturés/archivés)">
            <div className="flex flex-col gap-3">
              {chargeParAgence.map((a, i) => {
                const maxC = Math.max(...chargeParAgence.map((x) => x.count), 1);
                const pct = (a.count / maxC) * 100;
                const colors = ["bg-primary", "bg-success", "bg-accent"];
                return (
                  <div key={a.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">{a.nomComplet}</span>
                      <span className="text-xs font-bold text-foreground tabular-nums">{a.count}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i % 3]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Répartition par avocat" subtitle="Dossiers actifs assignés">
            <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
              {repartitionAvocats.map((av) => {
                const maxC = Math.max(...repartitionAvocats.map((a) => a.dossiersActifs), 1);
                const pct = (av.dossiersActifs / maxC) * 100;
                const agenceNom = agences.find((a) => a.id === av.agence_id);
                return (
                  <div key={av.id} className="flex items-center gap-3">
                    <Avatar nom={av.nom} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <div>
                          <span className="text-[13px] font-semibold text-foreground">{av.nom}</span>
                          <span className="text-[11px] text-muted-foreground ml-1.5">{ROLE_LABELS[av.role]}</span>
                        </div>
                        <span className="text-[13px] font-bold text-foreground tabular-nums shrink-0 ml-2">
                          {av.dossiersActifs} dossier{av.dossiersActifs !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${av.dossiersActifs >= 5 ? "bg-warning" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                        {agenceNom && <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{agenceNom.ville}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
          <SectionCard title="Transferts à ré-affecter" subtitle="Affectation depuis la fiche dossier">
            {transfertsPendants.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle size={28} className="text-success mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">Aucun transfert à ré-affecter</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {transfertsPendants.map((d, i) => {
                  const cli = d.client_nom;
                  return (
                    <div key={d.reference}
                      onClick={() => navigate(`/dossiers/${d.reference}`)}
                      className={`flex items-center gap-4 py-3.5 cursor-pointer hover:opacity-75 transition-opacity ${i > 0 ? "border-t border-border" : ""}`}>
                      <AlertTriangle size={16} className="text-status-transfert-text shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{d.reference}</span>
                          <StatusBadge statut={d.statut} />
                        </div>
                        <div className="text-[13px] font-semibold text-foreground truncate">{d.titre}</div>
                        {cli && <div className="text-[11px] text-muted-foreground mt-0.5">{cli}</div>}
                        {d.motif_transfert && (
                          <div className="text-[11px] text-muted-foreground mt-1 px-2 py-1 bg-background rounded border-l-2 border-status-transfert-text">
                            « {d.motif_transfert} »
                          </div>
                        )}
                      </div>
                      <ArrowRight size={15} className="text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <div className="w-[280px] flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Raccourcis</h2>
            <button onClick={() => navigate("/agences")} className="flex items-center gap-3.5 p-3.5 bg-card border border-border rounded-2xl text-left w-full hover:opacity-85 transition-opacity shadow-sm">
              <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center text-primary shrink-0"><Home size={17} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground">Créer une agence</div>
                <div className="text-[11px] text-muted-foreground">Gestion des agences</div>
              </div>
              <ArrowRight size={15} className="text-muted-foreground shrink-0" />
            </button>
            <button onClick={() => navigate("/utilisateurs")} className="flex items-center gap-3.5 p-3.5 bg-card border border-border rounded-2xl text-left w-full hover:opacity-85 transition-opacity shadow-sm">
              <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center text-primary shrink-0"><Users size={17} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground">Créer un utilisateur</div>
                <div className="text-[11px] text-muted-foreground">Gestion des utilisateurs</div>
              </div>
              <ArrowRight size={15} className="text-muted-foreground shrink-0" />
            </button>
            <button onClick={() => navigate("/dossiers")} className="flex items-center gap-3.5 p-3.5 bg-primary text-primary-foreground rounded-2xl text-left w-full hover:opacity-90 transition-opacity shadow-md">
              <div className="w-9 h-9 rounded bg-primary-foreground/12 flex items-center justify-center shrink-0"><Folder size={17} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold">Voir tous les dossiers</div>
                <div className="text-[11px] text-primary-foreground/60">{actifs.length} dossier{actifs.length !== 1 ? "s" : ""} actif{actifs.length !== 1 ? "s" : ""}</div>
              </div>
              <ArrowRight size={15} className="text-primary-foreground/50 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AvocatEnChefDashboard({ user }) {
  const navigate = useNavigate();
  const monAgenceId = user.agence_id;
  const { data: dossiers = [] } = useDossiers();
  const { data: agences = [] } = useAgences();
  const { data: utilisateurs = [] } = useUsers();
  const monAgence = agences.find((a) => a.id === monAgenceId);

  const fileAttente = useMemo(() =>
    dossiers.filter((d) => d.statut === "en_attente" && d.agence_receptrice_id === monAgenceId)
      .sort((a, b) => b.priorite - a.priorite), [dossiers, monAgenceId]);

  const transfertsATraiter = useMemo(() =>
    dossiers.filter((d) => d.statut === "en_attente_affectation" && (d.agence_assigne_id || d.agence_receptrice_id) === monAgenceId), [dossiers, monAgenceId]);

  const dossiersAgence = useMemo(() =>
    dossiers.filter((d) => isActif(d.statut) && (d.agence_assigne_id || d.agence_receptrice_id) === monAgenceId), [dossiers, monAgenceId]);

  const chargeAgence = useMemo(() => {
    const avs = utilisateurs.filter((u) => (u.role === "avocat" || u.role === "chef_agence") && u.agence_id === monAgenceId);
    return avs.map((av) => ({
      ...av,
      dossiersActifs: dossiersAgence.filter((d) => d.avocat_assigne_id === av.id).length,
    })).sort((a, b) => b.dossiersActifs - a.dossiersActifs);
  }, [dossiersAgence, utilisateurs, monAgenceId]);

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20 bg-background">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-foreground mb-1">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">{monAgence?.nom ?? "Mon agence"} - vue de l'Avocat en chef</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <KpiCard label="Dossiers en file d'affectation" value={fileAttente.length} icon={List} accent />
          <KpiCard label="Transferts à ré-affecter" value={transfertsATraiter.length} icon={Repeat} warn />
          <KpiCard label="Dossiers actifs dans l'agence" value={dossiersAgence.length} icon={Folder} />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <SectionCard
            title="File d'affectation"
            subtitle={fileAttente.length === 0 ? "Aucun dossier en attente" : `${fileAttente.length} dossier${fileAttente.length > 1 ? "s" : ""} en attente`}
            action={
              <button onClick={() => navigate("/file")} className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary rounded px-3 py-1.5 hover:bg-secondary transition-colors">
                Voir tout <ArrowRight size={12} />
              </button>
            }
          >
            {fileAttente.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle size={32} className="text-success mx-auto mb-2.5" />
                <p className="text-sm font-medium text-foreground mb-1">File vide</p>
                <p className="text-[13px] text-muted-foreground">Tous les dossiers ont été affectés.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {fileAttente.slice(0, 3).map((d, i) => {
                  const prioriteHaute = d.priorite >= 4;
                  return (
                    <div key={d.reference} onClick={() => navigate(`/dossiers/${d.reference}`)}
                      className={`flex gap-3.5 py-3.5 cursor-pointer hover:opacity-75 transition-opacity ${i > 0 ? "border-t border-border" : ""}`}>
                      <div className={`w-1 rounded self-stretch ${prioriteHaute ? "bg-warning" : "bg-border"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{d.reference}</span>
                          <StatusBadge statut={d.statut} />
                          {prioriteHaute && <span className="text-[10px] font-semibold text-warning bg-status-attente-bg rounded-full px-1.5 py-0.5">Priorité haute</span>}
                        </div>
                        <div className="text-[13px] font-semibold text-foreground truncate mb-0.5">{d.titre}</div>
                        <div className="text-[11px] text-muted-foreground">{d.type_affaire_libelle}{d.client_nom ? ` · ${d.client_nom}` : ""}</div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock size={11} className="text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">En attente</span>
                        </div>
                      </div>
                      <ArrowRight size={15} className="text-muted-foreground shrink-0 self-center" />
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <div className="flex flex-col gap-6">
<SectionCard title="Transferts à ré-affecter" subtitle="Dossiers en attente de réaffectation dans mon agence">
              {transfertsATraiter.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <Repeat size={28} className="text-success mx-auto mb-2 text-muted-foreground" />
                  <p className="text-[13px] text-muted-foreground">Aucun transfert à ré-affecter</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {transfertsATraiter.map((d, i) => {
                    return (
                      <div key={d.reference} onClick={() => navigate(`/dossiers/${d.reference}`)}
                        className={`flex items-center gap-3.5 py-3 cursor-pointer hover:opacity-75 transition-opacity ${i > 0 ? "border-t border-border" : ""}`}>
                        <div className="w-8 h-8 rounded-full bg-status-transfert-bg flex items-center justify-center shrink-0">
                          <Repeat size={14} className="text-status-transfert-text" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-foreground truncate">{d.titre}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{d.reference}{d.client_nom ? ` · ${d.client_nom}` : ""}</div>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <div className="flex flex-col gap-2.5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Raccourcis</h2>
              <button onClick={() => window.dispatchEvent(new CustomEvent("cabinet:open-nouveau-dossier"))} className="flex items-center gap-3.5 p-3.5 bg-primary text-primary-foreground rounded-2xl text-left w-full hover:opacity-90 transition-opacity shadow-md">
                <div className="w-9 h-9 rounded bg-primary-foreground/12 flex items-center justify-center shrink-0"><Plus size={17} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold">Nouveau dossier</div>
                  <div className="text-[11px] text-primary-foreground/60">Créer et enregistrer un dossier</div>
                </div>
              </button>
              <button onClick={() => navigate("/dossiers")} className="flex items-center gap-3.5 p-3.5 bg-card border border-border rounded-2xl text-left w-full hover:opacity-85 transition-opacity shadow-sm">
                <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center text-primary shrink-0"><Folder size={17} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-foreground">Tous les dossiers</div>
                  <div className="text-[11px] text-muted-foreground">{dossiersAgence.length} dossier{dossiersAgence.length !== 1 ? "s" : ""} actif{dossiersAgence.length !== 1 ? "s" : ""}</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <SectionCard title={`Charge de l'agence - ${monAgence?.ville ?? "Mon agence"}`} subtitle="Répartition des dossiers actifs par avocat">
          {chargeAgence.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-4">Aucun avocat dans cette agence.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {chargeAgence.map((av) => {
                const maxC = Math.max(...chargeAgence.map((a) => a.dossiersActifs), 1);
                const pct = (av.dossiersActifs / maxC) * 100;
                const charge = av.charge_actuelle ?? av.dossiersActifs;
                const chargeColor = charge >= 6 ? "bg-destructive" : charge >= 4 ? "bg-warning" : "bg-success";
                return (
                  <div key={av.id} className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2.5 mb-3">
                      <Avatar nom={av.nom} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{av.nom}</div>
                        <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[av.role]}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] text-muted-foreground">Charge actuelle</span>
                      <span className={`text-[13px] font-bold tabular-nums ${charge >= 6 ? "text-destructive" : charge >= 4 ? "text-warning" : "text-success"}`}>
                        {charge} dossier{charge !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${chargeColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    {av.specialites && av.specialites.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {av.specialites.map((s) => (
                          <span key={s} className="text-[10px] bg-secondary text-foreground rounded px-1.5 py-0.5">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function AvocatDashboard({ user }) {
  const navigate = useNavigate();
  const { data: dossiers = [] } = useDossiers();
  const { data: agences = [] } = useAgences();

  const mesDossiers = useMemo(() =>
    dossiers.filter((d) => d.avocat_assigne_id === user.id && isActif(d.statut))
      .sort((a, b) => b.priorite - a.priorite), [dossiers, user.id]);

  const salutation = getGreeting();
  const prenom = user.nom?.split(" ")[0] || user.nom;

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20 bg-background">
      <div className="max-w-[800px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3.5 mb-1.5">
            <Avatar nom={user.nom} size={44} />
            <div>
              <h1 className="text-[22px] font-bold text-foreground">{salutation}, {prenom}</h1>
              <p className="text-[13px] text-muted-foreground">{ROLE_LABELS[user.role]} · {agences.find((a) => a.id === user.agence_id)?.ville}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-primary rounded-2xl p-5 flex items-center gap-3.5 shadow-md">
            <div className="w-10 h-10 rounded bg-primary-foreground/12 flex items-center justify-center shrink-0">
              <Folder size={19} className="text-primary-foreground" />
            </div>
            <div>
              <div className="text-[26px] font-bold text-primary-foreground leading-none tabular-nums">{mesDossiers.length}</div>
              <div className="text-xs text-primary-foreground/65 mt-0.5">Dossier{mesDossiers.length !== 1 ? "s" : ""} actif{mesDossiers.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
              <MessageSquare size={19} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-[26px] font-bold text-muted-foreground leading-none tabular-nums">0</div>
              <div className="text-xs text-muted-foreground mt-0.5">Aucun message non lu</div>
            </div>
          </div>
        </div>

        <SectionCard
          title="Mes dossiers actifs"
          subtitle={`Triés par priorité · ${mesDossiers.length} dossier${mesDossiers.length !== 1 ? "s" : ""}`}
          action={
            <button onClick={() => navigate("/dossiers")} className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary rounded px-3 py-1.5 hover:bg-secondary transition-colors whitespace-nowrap">
              Voir tous <ArrowRight size={12} />
            </button>
          }
        >
          {mesDossiers.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <Folder size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Aucun dossier actif</p>
              <p className="text-[13px] text-muted-foreground">Vous n'avez pas de dossier assigné pour le moment.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {mesDossiers.map((d, i) => {
                const prioriteColor = d.priorite >= 4 ? "bg-warning" : d.priorite >= 3 ? "bg-primary" : "bg-border";
                return (
                  <div key={d.reference} onClick={() => navigate(`/dossiers/${d.reference}`)}
                    className={`flex gap-4 py-4 cursor-pointer hover:opacity-75 transition-opacity ${i > 0 ? "border-t border-border" : ""}`}>
                    <div className={`w-[3px] rounded self-stretch ${prioriteColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{d.reference}</span>
                        <StatusBadge statut={d.statut} />
                      </div>
                      <div className="text-sm font-semibold text-foreground truncate mb-1">{d.titre}</div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-muted-foreground">{d.type_affaire_libelle}</span>
                        {d.client_nom && <span className="text-xs text-muted-foreground">· {d.client_nom}</span>}
                        <span className="text-[10px] text-muted-foreground">{'★'.repeat(d.priorite)}{'☆'.repeat(5 - d.priorite)}</span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-muted-foreground shrink-0 self-center" />
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <button onClick={() => window.dispatchEvent(new CustomEvent("cabinet:open-nouveau-dossier"))}
          className="flex items-center gap-4 w-full p-5 bg-primary border-none rounded-2xl cursor-pointer shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all mt-6 text-left">
          <div className="w-10 h-10 rounded bg-primary-foreground/14 flex items-center justify-center shrink-0">
            <Plus size={20} className="text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-primary-foreground">Nouveau dossier</div>
            <div className="text-xs text-primary-foreground/60 mt-0.5">Créer et enregistrer un nouveau dossier client</div>
          </div>
          <ArrowRight size={18} className="text-primary-foreground/50" />
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  if (!user) return null;
  if (user.role === "chef_agence") return <AvocatEnChefDashboard user={user} />;
  if (user.role === "avocat") return <AvocatDashboard user={user} />;
  // Le chef central peut restreindre sa vue a sa propre agence (dropdown de la
  // topbar, ?agence=<id>) : on reutilise la vue chef d'agence, qui filtre deja
  // par user.agence_id (son agence siege). Absent/"all" = vue globale.
  if (String(searchParams.get("agence")) === String(user.agence_id)) {
    return <AvocatEnChefDashboard user={user} />;
  }
  return <GerantCentralDashboard user={user} />;
}
