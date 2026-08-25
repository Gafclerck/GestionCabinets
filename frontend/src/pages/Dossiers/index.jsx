import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, RotateCcw,
} from "lucide-react";
import { useDossiers } from "../../hooks/useDossiers";
import { useAgences } from "../../hooks/useAgences";
import { useUsers } from "../../hooks/useUsers";
import { useSearchQuery } from "../../hooks/useSearchQuery";
import { STATUT_LABELS, STATUT_ORDRE } from "../../lib/constants";
import StatusBadge from "../../components/ui/StatusBadge";
import PrioriteStars from "../../components/ui/PrioriteStars";

const PAGE_SIZE = 10;
const PRIORITE_LABELS = { 1: "Très basse", 2: "Basse", 3: "Normale", 4: "Haute", 5: "Très haute" };

const COLUMNS = [
  { id: "reference",    label: "Référence",      width: "w-[110px]" },
  { id: "titre",        label: "Titre",           width: "w-[200px]" },
  { id: "client",       label: "Client",          width: "w-[120px]" },
  { id: "type_affaire", label: "Type d'affaire",  width: "w-[130px]" },
  { id: "agence",       label: "Agence",          width: "w-[155px]" },
  { id: "avocat",       label: "Avocat",          width: "w-[130px]" },
  { id: "statut",       label: "Statut",          width: "w-[130px]" },
  { id: "priorite",     label: "Priorité",        width: "w-[80px]" },
  { id: "ia",           label: "Analyse IA",      width: "w-[100px]" },
];

function SortIcon({ col, sortCol, sortDir }) {
  if (col !== sortCol) return <span className="opacity-30 text-[11px]">⇅</span>;
  return sortDir === "asc" ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />;
}

function FilterSelect({ label, value, onChange, options }) {
  const active = !!value;
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none h-9 pr-8 pl-3 border rounded text-[13px] cursor-pointer outline-none min-w-[140px] transition-colors
          ${active
            ? "border-primary bg-primary/8 text-primary font-medium"
            : "border-border bg-card text-muted-foreground"
          }`}
      >
        <option value="">{label}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${active ? "text-primary" : "text-muted-foreground"}`} />
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-0.5 text-[11px] font-medium">
      {label}
      <button onClick={onRemove} className="text-primary/60 hover:text-primary"><X size={11} /></button>
    </span>
  );
}

export default function DossiersList() {
  const navigate = useNavigate();
  const { data: dossiers = [], loading } = useDossiers();
  const { data: agences = [] } = useAgences();
  const { data: utilisateurs = [] } = useUsers();
  const [search, setSearch] = useSearchQuery();
  const [filterStatut, setFilterStatut] = useState("");
  const [filterAgence, setFilterAgence] = useState("");
  const [filterAvocat, setFilterAvocat] = useState("");
  const [filterPriorite, setFilterPriorite] = useState("");
  const [sortCol, setSortCol] = useState("statut");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  function handleSort(col) {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  }

  const hasFilters = !!(search || filterStatut || filterAgence || filterAvocat || filterPriorite);
  function resetFilters() {
    setSearch(""); setFilterStatut(""); setFilterAgence(""); setFilterAvocat(""); setFilterPriorite(""); setPage(1);
  }

  const filtered = useMemo(() => {
    let data = dossiers.filter((d) => d.statut !== "archive");
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((d) =>
        d.reference.toLowerCase().includes(q) ||
        d.titre.toLowerCase().includes(q) ||
        (d.client_nom?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterStatut)   data = data.filter((d) => d.statut === filterStatut);
    if (filterAgence)   data = data.filter((d) => (d.agence_assigne_id || d.agence_receptrice_id) === Number(filterAgence));
    if (filterAvocat)   data = data.filter((d) => d.avocat_assigne_id === Number(filterAvocat));
    if (filterPriorite) data = data.filter((d) => String(d.priorite) === filterPriorite);

    data.sort((a, b) => {
      let va = "", vb = "";
      switch (sortCol) {
        case "reference":    va = a.reference;    vb = b.reference;    break;
        case "titre":        va = a.titre;        vb = b.titre;        break;
        case "client":       va = a.client_nom ?? "";  vb = b.client_nom ?? "";  break;
        case "type_affaire": va = a.type_affaire_libelle ?? ""; vb = b.type_affaire_libelle ?? ""; break;
        case "agence":       va = a.agence_assigne_nom ?? a.agence_receptrice_nom ?? ""; vb = b.agence_assigne_nom ?? b.agence_receptrice_nom ?? ""; break;
        case "avocat":       va = a.avocat_assigne_nom ?? ""; vb = b.avocat_assigne_nom ?? ""; break;
        case "statut":       return sortDir === "asc"
          ? (STATUT_ORDRE[a.statut] ?? 99) - (STATUT_ORDRE[b.statut] ?? 99)
          : (STATUT_ORDRE[b.statut] ?? 99) - (STATUT_ORDRE[a.statut] ?? 99);
        case "priorite":     return sortDir === "asc" ? a.priorite - b.priorite : b.priorite - a.priorite;
        case "ia":           va = "0"; vb = "0"; break;
      }
      const cmp = va.localeCompare(vb, "fr");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [dossiers, search, filterStatut, filterAgence, filterAvocat, filterPriorite, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const avocats = utilisateurs.filter((u) => u.role === "avocat" || u.role === "chef_agence");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-6 shrink-0">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground mb-0.5">Dossiers</h1>
          <p className="text-[13px] text-muted-foreground">
            {filtered.length} dossier{filtered.length !== 1 ? "s" : ""}{hasFilters ? " · Filtres actifs" : " au total"}
            {loading && " · Chargement..."}
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center flex-wrap gap-2 p-3.5 bg-card border border-border rounded">
          <div className="relative shrink-0">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Référence, titre, client…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`h-9 pl-8 pr-2 border rounded text-[13px] bg-card text-foreground outline-none w-[220px] transition-colors
                ${search ? "border-primary bg-primary/6" : "border-border"}`}
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <FilterSelect label="Statut" value={filterStatut} onChange={(v) => { setFilterStatut(v); setPage(1); }}
            options={Object.entries(STATUT_LABELS).filter(([k]) => k !== "archive").map(([k, v]) => ({ value: k, label: v }))} />
          <FilterSelect label="Agence" value={filterAgence} onChange={(v) => { setFilterAgence(v); setPage(1); }}
            options={agences.map((a) => ({ value: a.id, label: a.nom }))} />
          <FilterSelect label="Avocat" value={filterAvocat} onChange={(v) => { setFilterAvocat(v); setPage(1); }}
            options={avocats.map((u) => ({ value: u.id, label: u.nom }))} />
          <FilterSelect label="Priorité" value={filterPriorite} onChange={(v) => { setFilterPriorite(v); setPage(1); }}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} - ${PRIORITE_LABELS[n]}` }))} />

          {hasFilters && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <button onClick={resetFilters} className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] text-muted-foreground rounded hover:bg-secondary transition-colors">
                <RotateCcw size={13} />Réinitialiser
              </button>
            </>
          )}

          <div className="ml-auto flex gap-1.5 flex-wrap">
            {filterStatut   && <FilterChip label={STATUT_LABELS[filterStatut]} onRemove={() => setFilterStatut("")} />}
            {filterAgence   && <FilterChip label={agences.find((a) => a.id === Number(filterAgence))?.nom ?? ""} onRemove={() => setFilterAgence("")} />}
            {filterAvocat   && <FilterChip label={utilisateurs.find((u) => u.id === Number(filterAvocat))?.nom ?? ""} onRemove={() => setFilterAvocat("")} />}
            {filterPriorite && <FilterChip label={`P${filterPriorite} - ${PRIORITE_LABELS[Number(filterPriorite)]}`} onRemove={() => setFilterPriorite("")} />}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto mx-8 mt-3 border border-border rounded bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-secondary sticky top-0 z-10">
              {COLUMNS.map((col) => (
                <th key={col.id}
                  onClick={() => handleSort(col.id)}
                  className={`px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap border-b border-border
                    ${sortCol === col.id ? "text-primary" : "text-muted-foreground"} ${col.width}`}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}<SortIcon col={col.id} sortCol={sortCol} sortDir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((d, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <tr key={d.reference}
                  onClick={() => navigate(`/dossiers/${d.reference}`)}
                  className={`cursor-pointer border-b border-border hover:bg-primary/5 transition-colors
                    ${isEven ? "bg-card" : "bg-background"}`}>
                  <td className="px-4 py-3 text-xs font-semibold text-primary tabular-nums">{d.reference}</td>
                  <td className="px-4 py-3 text-[13px] text-foreground line-clamp-2 leading-snug">{d.titre}</td>
                  <td className="px-4 py-3 text-[13px] text-foreground truncate">{d.client_nom ?? "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate">{d.type_affaire_libelle}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate">{d.agence_assigne_nom ?? d.agence_receptrice_nom ?? "-"}</td>
                  <td className="px-4 py-3 text-xs truncate">
                    {d.avocat_assigne_nom ? <span className="text-foreground">{d.avocat_assigne_nom}</span> : <span className="text-border">Non affecté</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge statut={d.statut} /></td>
                  <td className="px-4 py-3"><PrioriteStars priorite={d.priorite} /></td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground text-[11px]">-</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-16 text-center text-sm text-muted-foreground">Aucun dossier ne correspond à vos critères.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-8 py-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <PBtn onClick={() => setPage(1)} disabled={page === 1} label="«" />
            <PBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} icon={<ChevronLeft size={14} />} />
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push("…"); acc.push(p); return acc; }, [])
              .map((p, i) => p === "…"
                ? <span key={`d${i}`} className="px-1 text-muted-foreground text-xs">…</span>
                : <PBtn key={p} onClick={() => setPage(p)} active={p === page} label={String(p)} />)}
            <PBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} icon={<ChevronRight size={14} />} />
            <PBtn onClick={() => setPage(totalPages)} disabled={page === totalPages} label="»" />
          </div>
        </div>
      )}
    </div>
  );
}

function PBtn({ onClick, disabled, active, label, icon }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`min-w-[32px] h-8 px-1.5 flex items-center justify-center border rounded text-[13px] transition-colors
        ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent text-foreground hover:bg-secondary"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
      {icon ?? label}
    </button>
  );
}
