import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Plus, Grid, List, Mail, Building2 } from "lucide-react";
import { useUsers } from "../../hooks/useUsers";
import { useAgences } from "../../hooks/useAgences";
import { useSearchQuery } from "../../hooks/useSearchQuery";
import { ROLE_LABELS } from "../../lib/constants";

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

export default function Utilisateurs() {
  const navigate = useNavigate();
  const { data: users = [], refetch } = useUsers();
  const { data: agences = [] } = useAgences();
  const [search, setSearch] = useSearchQuery();
  const [filterRole, setFilterRole] = useState("all");
  const [filterAgence, setFilterAgence] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({
    nom: "", prenom: "", email: "", password: "", role: "avocat", agence_id: "none",
  });

  const agenceMap = useMemo(() => {
    const map = {};
    agences.forEach((a) => { map[a.id] = a.nom; });
    return map;
  }, [agences]);

  const filtered = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          `${u.prenom} ${u.nom}`.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }
    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }
    if (filterAgence !== "all") {
      result = result.filter((u) => String(u.agence_id) === filterAgence);
    }
    return result;
  }, [search, filterRole, filterAgence, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleCreate() {
    if (creating) return;

    const trimmed = { ...form, nom: form.nom.trim(), prenom: form.prenom.trim(), email: form.email.trim(), password: form.password };
    if (!trimmed.nom) { setFormError("Le nom est requis."); return; }
    if (!trimmed.prenom) { setFormError("Le prenom est requis."); return; }
    if (!trimmed.email) { setFormError("L'email est requis."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)) { setFormError("L'email n'est pas valide."); return; }
    if (!trimmed.password || trimmed.password.length < 8) { setFormError("Le mot de passe doit contenir au moins 8 caracteres."); return; }

    setFormError(null);
    setCreating(true);
    try {
      const payload = {
        nom: trimmed.nom,
        prenom: trimmed.prenom,
        email: trimmed.email,
        password: trimmed.password,
        role: form.role,
      };
      if (form.agence_id !== "none") {
        payload.agence_id = Number(form.agence_id);
      }
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/auth/chef_central/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Erreur lors de la creation de l'utilisateur.");
        }
      });
      setShowCreate(false);
      setForm({ nom: "", prenom: "", email: "", password: "", role: "avocat", agence_id: "none" });
      refetch();
    } catch (err) {
      setFormError(err.message || "Erreur lors de la creation de l'utilisateur.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20 bg-background">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-0.5">Utilisateurs</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} utilisateur{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Nouvel utilisateur
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Rechercher un utilisateur..."
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
          <Select value={filterRole} onValueChange={(v) => { setFilterRole(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAgence} onValueChange={(v) => { setFilterAgence(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Toutes les agences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {agences.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>{a.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            {pageData.map((user) => (
              <Card
                key={user.id}
                onClick={() => navigate(`/utilisateurs/${user.id}`)}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar nom={`${user.prenom} ${user.nom}`} size={40} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{user.prenom} {user.nom}</div>
                      <Badge variant="secondary" className="mt-1">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    {user.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    )}
                    {user.agence_id && agenceMap[user.agence_id] && (
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} className="shrink-0" />
                        <span className="truncate">{agenceMap[user.agence_id]}</span>
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
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Agence</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((user) => (
                  <TableRow
                    key={user.id}
                    onClick={() => navigate(`/utilisateurs/${user.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar nom={`${user.prenom} ${user.nom}`} size={28} />
                        <span className="font-medium text-foreground">{user.prenom} {user.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email || "---"}</TableCell>
                    <TableCell className="text-muted-foreground">{agenceMap[user.agence_id] || "---"}</TableCell>
                    <TableCell>
                      <Badge variant={user.actif ? "success" : "secondary"}>
                        {user.actif ? "Actif" : "Inactif"}
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
              <List size={24} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Aucun utilisateur trouve</p>
            <p className="text-xs text-muted-foreground">Modifiez votre recherche ou creez un nouvel utilisateur.</p>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

        <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) setFormError(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel utilisateur</DialogTitle>
              <DialogDescription>Enregistrer un nouvel utilisateur dans le systeme.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Prenom</label>
                  <Input
                    placeholder="Prenom"
                    value={form.prenom}
                    onChange={(e) => { setForm({ ...form, prenom: e.target.value }); setFormError(null); }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Nom</label>
                  <Input
                    placeholder="Nom"
                    value={form.nom}
                    onChange={(e) => { setForm({ ...form, nom: e.target.value }); setFormError(null); }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormError(null); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Mot de passe</label>
                <Input
                  type="password"
                  placeholder="Minimum 8 caracteres"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setFormError(null); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Agence</label>
                <Select value={form.agence_id} onValueChange={(v) => setForm({ ...form, agence_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune agence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune agence</SelectItem>
                    {agences.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                disabled={creating || !form.nom.trim() || !form.prenom.trim() || !form.email.trim() || form.password.length < 8}
              >
                Creer l'utilisateur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
