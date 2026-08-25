import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Plus, Grid, List, Building2, MapPin, Phone } from "lucide-react";
import { useAgences } from "../../hooks/useAgences";
import { agenceService } from "../../services/agenceService";
import { useSearchQuery } from "../../hooks/useSearchQuery";

import Card, { CardContent } from "../../components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Pagination from "../../components/ui/Pagination";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../../components/ui/Dialog";

const PAGE_SIZE = 10;

export default function Agences() {
  const navigate = useNavigate();
  const { data: agences = [], refetch } = useAgences();
  const [search, setSearch] = useSearchQuery();
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({
    nom: "", adresse: "", ville: "", telephone: "", est_siege: false,
  });

  const filtered = useMemo(() => {
    if (!search) return agences;
    const q = search.toLowerCase();
    return agences.filter(
      (a) =>
        a.nom.toLowerCase().includes(q) ||
        a.ville?.toLowerCase().includes(q)
    );
  }, [search, agences]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleCreate() {
    if (creating) return;

    const trimmed = { ...form, nom: form.nom.trim(), adresse: form.adresse.trim(), ville: form.ville.trim(), telephone: form.telephone.trim() };
    if (!trimmed.nom) { setFormError("Le nom est requis."); return; }
    if (!trimmed.adresse) { setFormError("L'adresse est requise."); return; }
    if (!trimmed.ville) { setFormError("La ville est requise."); return; }
    if (!trimmed.telephone) { setFormError("Le telephone est requis."); return; }

    setFormError(null);
    setCreating(true);
    try {
      await agenceService.create({
        nom: trimmed.nom,
        adresse: trimmed.adresse,
        ville: trimmed.ville,
        telephone: trimmed.telephone,
        est_siege: form.est_siege,
        actif: true,
      });
      setShowCreate(false);
      setForm({ nom: "", adresse: "", ville: "", telephone: "", est_siege: false });
      refetch();
    } catch (err) {
      setFormError(err.response?.data?.detail || "Erreur lors de la creation de l'agence.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20 bg-background">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-0.5">Agences</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} agence{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Nouvelle agence
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Rechercher une agence..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-8"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {pageData.map((agence) => (
              <Card
                key={agence.id}
                onClick={() => navigate(`/agences/${agence.id}`)}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{agence.nom}</div>
                        {agence.est_siege && (
                          <Badge variant="info" className="mt-1">Siege</Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant={agence.actif ? "success" : "secondary"}>
                      {agence.actif ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    {agence.ville && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{agence.ville}</span>
                      </div>
                    )}
                    {agence.telephone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="shrink-0" />
                        <span className="truncate">{agence.telephone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border border-border rounded-md bg-card overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((agence) => (
                  <TableRow
                    key={agence.id}
                    onClick={() => navigate(`/agences/${agence.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-primary" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-foreground truncate">{agence.nom}</span>
                          {agence.est_siege && <Badge variant="info" className="shrink-0">Siege</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{agence.ville || "---"}</TableCell>
                    <TableCell className="text-muted-foreground">{agence.telephone || "---"}</TableCell>
                    <TableCell>
                      <Badge variant={agence.actif ? "success" : "secondary"}>
                        {agence.actif ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Building2 size={24} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Aucune agence trouvee</p>
            <p className="text-xs text-muted-foreground">Modifiez votre recherche ou creez une nouvelle agence.</p>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

        <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) setFormError(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle agence</DialogTitle>
              <DialogDescription>Enregistrer une nouvelle agence dans le systeme.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Nom</label>
                <Input
                  placeholder="Nom de l'agence"
                  value={form.nom}
                  onChange={(e) => { setForm({ ...form, nom: e.target.value }); setFormError(null); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Adresse</label>
                <Input
                  placeholder="Adresse"
                  value={form.adresse}
                  onChange={(e) => { setForm({ ...form, adresse: e.target.value }); setFormError(null); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Ville</label>
                <Input
                  placeholder="Ville"
                  value={form.ville}
                  onChange={(e) => { setForm({ ...form, ville: e.target.value }); setFormError(null); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Telephone</label>
                <Input
                  placeholder="+221 33 000 00 00"
                  value={form.telephone}
                  onChange={(e) => { setForm({ ...form, telephone: e.target.value }); setFormError(null); }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.est_siege}
                  onChange={(e) => setForm({ ...form, est_siege: e.target.checked })}
                  className="rounded border-border"
                />
                Siege social
              </label>
            </div>
            {formError && (
              <div className="mx-6 mb-2 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {formError}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !form.nom.trim() || !form.adresse.trim() || !form.ville.trim() || !form.telephone.trim()}
              >
                Creer l'agence
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
