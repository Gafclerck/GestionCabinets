import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, User, Home, FileText,
  CheckCircle, Clock, Repeat,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useDossiers } from "../../hooks/useDossiers";
import { useAgences } from "../../hooks/useAgences";
import { useUsers } from "../../hooks/useUsers";
import { ROLE_LABELS } from "../../lib/constants";
import StatusBadge from "../../components/ui/StatusBadge";
import PrioriteStars from "../../components/ui/PrioriteStars";
import Avatar from "../../components/ui/Avatar";
import Skeleton from "../../components/ui/Skeleton";
import AffectationModal from "../../components/dossiers/AffectationModal";
import TransferModal from "../../components/dossiers/TransferModal";
import Messagerie from "../../components/dossiers/Messagerie";

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-1 py-2.5 border-none bg-none cursor-pointer text-sm transition-colors
        ${active ? "font-semibold text-primary border-b-2 border-primary" : "font-normal text-muted-foreground border-b-2 border-transparent"}`}
      style={{ marginBottom: -1 }}>
      {label}
    </button>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function InfoPair({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-[13px] text-foreground font-medium ${mono ? "font-mono tabular-nums" : ""}`}>{value}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="bg-card border-b border-border shrink-0">
        <div className="px-8 pt-5 pb-4">
          <Skeleton className="h-4 w-40 mb-4" />
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <Skeleton className="h-7 w-[420px] max-w-full mb-2" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-[1fr_320px] gap-6 max-w-[1280px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_TIMELINE = [
  { id: "t1", label: "Dossier créé et enregistré", actor: "Mariama Diallo", date: "il y a 3 jours", color: "bg-primary" },
  { id: "t2", label: "Analyse IA déclenchée", actor: "Système automatique", date: "il y a 3 jours", color: "bg-accent" },
  { id: "t3", label: "Dossier affecté à Me Aïssatou Ba", actor: "Moussa Sow", date: "il y a 2 jours", color: "bg-success" },
];

export default function DossierDetail() {
  const { reference } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: dossiers = [], loading } = useDossiers();
  const { data: agences = [] } = useAgences();
  const { data: utilisateurs = [] } = useUsers();
  const [activeTab, setActiveTab] = useState("apercu");
  const [showAffectation, setShowAffectation] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const dossier = dossiers.find((d) => d.reference === reference);

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <DetailSkeleton />;
  if (!dossier) return <Navigate to="/dossiers" replace />;

  const agence = agences.find((a) => a.id === (dossier?.agence_assigne_id || dossier?.agence_receptrice_id));
  const avocat = utilisateurs.find((u) => u.id === dossier?.avocat_assigne_id);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-2 px-8 pt-3">
          <button onClick={() => navigate("/dossiers")} className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft size={14} />Dossiers
          </button>
          <ChevronRight size={13} className="text-border" />
          <span className="text-[13px] text-foreground font-medium tabular-nums">{dossier.reference}</span>
        </div>
        <div className="flex items-start justify-between px-8 pt-3 gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider tabular-nums">{dossier.reference}</span>
              <StatusBadge statut={dossier.statut} />
              <PrioriteStars priorite={dossier.priorite} />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-1.5">{dossier.titre}</h1>
            <div className="flex items-center gap-4 flex-wrap text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User size={12} />{dossier.client_nom ?? "—"}
              </span>
              <span className="inline-flex items-center gap-1"><FileText size={12} />{dossier.type_affaire_libelle}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 pt-1">
            {(dossier.statut === "en_attente") && (
              <button
                onClick={() => setShowAffectation(true)}
                className="inline-flex items-center gap-1.5 h-10 px-4 bg-primary text-primary-foreground rounded text-[13px] font-semibold hover:bg-sidebar-accent transition-colors"
              >
                <CheckCircle size={14} />Affecter le dossier
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-6 px-8 mt-3">
          {["apercu", "documents", "historique", "messagerie"].map((tab) => (
            <Tab key={tab} label={tab === "apercu" ? "Aperçu" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              active={activeTab === tab} onClick={() => setActiveTab(tab)} />
          ))}
        </div>
      </div>

      <div className={`flex-1 ${activeTab === "messagerie" ? "overflow-hidden p-8 min-h-0" : "overflow-y-auto p-8"}`}>
        {activeTab === "apercu" && (
          <div className="grid grid-cols-[1fr_320px] gap-6 max-w-[1280px]">
            <div className="flex flex-col gap-4">
              {dossier.analyse_ia && (user?.role === "chef_central" || user?.role === "chef_agence") && (
                <SectionCard title="Analyse IA">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${dossier.analyse_ia.score_confiance}%` }} />
                      </div>
                      <span className="text-sm font-bold text-success tabular-nums">{dossier.analyse_ia.score_confiance}%</span>
                      <span className="text-xs text-muted-foreground">confiance</span>
                    </div>
                    <p className="text-[13px] text-foreground leading-relaxed">{dossier.analyse_ia.resume_genere}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(dossier.analyse_ia.mots_cles || []).map((kw) => (
                        <span key={kw} className="text-[11px] font-medium bg-secondary text-foreground rounded-md px-2.5 py-1 border border-border">{kw}</span>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              )}
              <SectionCard title="Client">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-100">
                    <User size={18} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-0.5">{dossier.client_nom ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      Client associé au dossier
                    </div>
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Dernières actions" action={<button className="text-xs text-primary font-medium flex items-center gap-1">Voir tout <ChevronRight size={13} /></button>}>
                <div className="flex flex-col">
                  {DEMO_TIMELINE.map((event, idx) => (
                    <div key={event.id} className={`flex gap-3 ${idx > 0 ? "pt-4" : ""}`}>
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-7 h-7 rounded-full ${event.color} flex items-center justify-center text-primary-foreground text-[10px] shrink-0 z-10`}>{idx + 1}</div>
                        {idx < DEMO_TIMELINE.length - 1 && <div className="w-[1.5px] flex-1 min-h-4 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-0">
                        <p className="text-[13px] font-medium text-foreground mb-0.5 leading-snug">{event.label}</p>
                        <p className="text-[11px] text-muted-foreground mb-0">{event.actor}</p>
                        <span className="text-[11px] text-muted-foreground border-b border-dashed border-border">{event.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
            <div className="flex flex-col gap-4">
              <SectionCard title="Affectation">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Agence assignée</p>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0"><Home size={15} className="text-primary" /></div>
                      <div>
                        <div className="text-[13px] font-medium text-foreground">{agence?.nom ?? "—"}</div>
                        {agence && <div className="text-[11px] text-muted-foreground">{agence.ville}{agence.est_siege ? " · Siège" : ""}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-border" />
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Avocat assigné</p>
                    {avocat ? (
                      <div className="flex items-center gap-2.5">
                        <Avatar nom={avocat.nom} size={32} />
                        <div>
                          <div className="text-[13px] font-medium text-foreground">{avocat.nom}</div>
                          <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[avocat.role]}</div>
                          {avocat.specialites && (
                            <div className="flex gap-1 flex-wrap mt-1">
                              {avocat.specialites.map((s) => (
                                <span key={s} className="text-[10px] bg-secondary text-muted-foreground rounded px-1.5 py-px">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[13px] text-muted-foreground italic">Non affecté</div>
                    )}
                  </div>
                  <div className="h-px bg-border" />
                  <button
                    onClick={() => setShowTransfer(true)}
                    className="flex items-center justify-center gap-1.5 w-full h-10 border-[1.5px] border-border rounded bg-transparent cursor-pointer text-[13px] text-foreground font-medium hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <Repeat size={14} />Demander un transfert
                  </button>
                </div>
              </SectionCard>
              <SectionCard title="Informations">
                <div className="flex flex-col gap-2.5">
                  <InfoPair label="Référence" value={dossier.reference} mono />
                  <InfoPair label="Type d'affaire" value={dossier.type_affaire_libelle} />
                  <InfoPair label="Agence réceptrice" value={dossier.agence_receptrice_nom ?? "—"} />
                </div>
              </SectionCard>
            </div>
          </div>
        )}
        {activeTab === "documents" && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-3xl bg-secondary flex items-center justify-center text-muted-foreground"><FileText size={24} /></div>
            <p className="text-sm font-medium text-muted-foreground">Documents — disponible prochainement</p>
          </div>
        )}
        {activeTab === "historique" && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-3xl bg-secondary flex items-center justify-center text-muted-foreground"><Clock size={24} /></div>
            <p className="text-sm font-medium text-muted-foreground">Historique — disponible prochainement</p>
          </div>
        )}
        {activeTab === "messagerie" && (
          <div className="h-full flex flex-col min-h-0">
            <Messagerie dossier={dossier} utilisateurs={utilisateurs} />
          </div>
        )}
      </div>

      {/* Affectation modal */}
      <AffectationModal
        dossier={dossier}
        open={showAffectation}
        onClose={() => setShowAffectation(false)}
        onConfirm={() => {
          setShowAffectation(false);
        }}
        initialAgenceId={dossier.analyse_ia?.agence_suggeree_id}
        initialAvocatId={dossier.analyse_ia?.avocat_suggere_id}
      />

      {/* Transfer modal */}
      <TransferModal
        dossier={dossier}
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        onConfirm={() => {
          setShowTransfer(false);
        }}
      />
    </div>
  );
}
