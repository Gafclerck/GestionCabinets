import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Plus, Grid, List, User, Mail, Phone } from "lucide-react";
import { useClients } from "../../hooks/useClients";
import { clientService } from "../../services/clientService";
import { useSearchQuery } from "../../hooks/useSearchQuery";
import { TYPE_CLIENT_LABELS } from "../../lib/constants";

import Card, { CardContent } from "../../components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Avatar from "../../components/ui/Avatar";
import Pagination from "../../components/ui/Pagination";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../../components/ui/Dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../../components/ui/Select";

const PAGE_SIZE = 10;

export default function Clients() {
  const navigate = useNavigate();
  const { data: clients = [], refetch } = useClients();
  const [search, setSearch] = useSearchQuery();
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({
    nom: "", type_client: "PHYSIQUE", telephone: "", email: "", nin: "", rccm: "",
  });

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telephone?.includes(q)
    );
  }, [search, clients]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleCreate() {
    if (creating) return;

    const trimmed = { ...form, nom: form.nom.trim(), telephone: form.telephone.trim(), email: form.email.trim() };
    if (!trimmed.nom) { setFormError("Le nom est requis."); return; }
    if (!trimmed.telephone) { setFormError("Le telephone est requis."); return; }
    if (!trimmed.email) { setFormError("L'email est requis."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)) { setFormError("L'email n'est pas valide."); return; }

    setFormError(null);
    setCreating(true);
    try {
      await clientService.create({
        nom: trimmed.nom,
        type_client: form.type_client === "PHYSIQUE" ? "physique" : "moral",
        telephone: trimmed.telephone,
        email: trimmed.email,
        nin: form.nin.trim() || null,
        rccm: form.rccm.trim() || null,
      });
      setShowCreate(false);
      setForm({ nom: "", type_client: "PHYSIQUE", telephone: "", email: "", nin: "", rccm: "" });
      refetch();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erreur lors de la creation du client.";
      setFormError(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20 bg-background">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-0.5">Clients</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} client{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Nouveau client
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Rechercher un client..."
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
            {pageData.map((client) => {
              const displayType = client.type_client === "physique" ? "PHYSIQUE" : "MORALE";
              return (
                <Card
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar nom={client.nom} size={40} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{client.nom}</div>
                        <Badge variant={displayType === "PHYSIQUE" ? "secondary" : "info"} className="mt-1">
                          {TYPE_CLIENT_LABELS[displayType]}
                        </Badge>
                      </div>
                    </div>
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    {client.telephone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="shrink-0" />
                        <span className="truncate">{client.telephone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        ) : (
          <div className="border border-border rounded-md bg-card overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((client) => {
                  const displayType = client.type_client === "physique" ? "PHYSIQUE" : "MORALE";
                  return (
                    <TableRow
                      key={client.id}
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar nom={client.nom} size={28} />
                          <span className="font-medium text-foreground">{client.nom}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={displayType === "PHYSIQUE" ? "secondary" : "info"}>
                          {TYPE_CLIENT_LABELS[displayType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{client.telephone || "---"}</TableCell>
                      <TableCell className="text-muted-foreground">{client.email || "---"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <User size={24} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Aucun client trouve</p>
            <p className="text-xs text-muted-foreground">Modifiez votre recherche ou creez un nouveau client.</p>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

        <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) setFormError(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau client</DialogTitle>
              <DialogDescription>Enregistrer un nouveau client dans le systeme.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Nom</label>
                <Input
                  placeholder="Nom complet"
                  value={form.nom}
                  onChange={(e) => { setForm({ ...form, nom: e.target.value }); setFormError(null); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Type de client</label>
                <Select value={form.type_client} onValueChange={(v) => setForm({ ...form, type_client: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHYSIQUE">Personne physique</SelectItem>
                    <SelectItem value="MORALE">Personne morale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Telephone</label>
                <Input
                  placeholder="+221 77 000 00 00"
                  value={form.telephone}
                  onChange={(e) => { setForm({ ...form, telephone: e.target.value }); setFormError(null); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormError(null); }}
                />
              </div>
              {form.type_client === "PHYSIQUE" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">NIN</label>
                  <Input
                    placeholder="Numero NIN"
                    value={form.nin}
                    onChange={(e) => setForm({ ...form, nin: e.target.value })}
                  />
                </div>
              )}
              {form.type_client === "MORALE" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">RCCM</label>
                  <Input
                    placeholder="Numero RCCM"
                    value={form.rccm}
                    onChange={(e) => setForm({ ...form, rccm: e.target.value })}
                  />
                </div>
              )}
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
              <Button onClick={handleCreate} disabled={creating || !form.nom.trim() || !form.telephone.trim() || !form.email.trim()}>
                Creer le client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
