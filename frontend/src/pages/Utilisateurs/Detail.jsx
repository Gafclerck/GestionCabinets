import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Building2, Shield, Calendar, Clock, Pencil, Power } from "lucide-react";
import { useState } from "react";
import { useUser } from "../../hooks/useUsers";
import { useAgence, useAgences } from "../../hooks/useAgences";
import { ROLE_LABELS } from "../../lib/constants";
import { formatDate, formatDateTime } from "../../lib/utils";
import Card, { CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Avatar from "../../components/ui/Avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/Dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../../components/ui/Select";
import { userService } from "../../services/userService";

function EditUtilisateurDialog({ user, open, onClose, onSaved }) {
  const { data: agences = [] } = useAgences();
  const [form, setForm] = useState({
    nom: user?.nom ?? "",
    prenom: user?.prenom ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "avocat",
    agence_id: user?.agence_id ? String(user.agence_id) : "none",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim()) {
      setError("Le nom, le prenom et l'email sont requis.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("L'email n'est pas valide.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        role: form.role,
      };
      if (form.agence_id !== "none") payload.agence_id = Number(form.agence_id);
      else payload.agence_id = null;
      await userService.update(user.id, payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la modification de l'utilisateur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Prenom</label>
              <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Nom</label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Role</label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <SelectTrigger><SelectValue placeholder="Aucune agence" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune agence</SelectItem>
                {agences.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error && (
          <div className="mx-6 mb-2 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UtilisateurDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: user, loading, refetch } = useUser(id);
  const { data: agence } = useAgence(user?.agence_id);
  const [showEdit, setShowEdit] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const toggleActif = async () => {
    if (!user) return;
    setToggleBusy(true);
    setActionError(null);
    try {
      await userService.update(user.id, { actif: !user.actif });
      refetch();
    } catch (err) {
      setActionError(err.response?.data?.detail || "Erreur lors de la mise a jour de l'utilisateur.");
    } finally {
      setToggleBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">Utilisateur introuvable</p>
          <Button variant="outline" onClick={() => navigate("/utilisateurs")} className="mt-3">
            Retour a la liste
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20 bg-background">
      <div className="max-w-[900px] mx-auto">
        <button
          onClick={() => navigate("/utilisateurs")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Retour aux utilisateurs
        </button>

        <div className="flex items-center gap-4 mb-8">
          <Avatar nom={`${user.prenom} ${user.nom}`} size={56} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground mb-1">{user.prenom} {user.nom}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{ROLE_LABELS[user.role] || user.role}</Badge>
              <Badge variant={user.actif ? "success" : "secondary"}>
                {user.actif ? "Actif" : "Inactif"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setShowEdit(true)}>
              <Pencil size={14} />
              Modifier
            </Button>
            <Button
              variant={user.actif ? "outline" : "default"}
              onClick={toggleActif}
              disabled={toggleBusy}
            >
              <Power size={14} />
              {user.actif ? "Desactiver" : "Activer"}
            </Button>
          </div>
        </div>

        {actionError && (
          <div className="mb-6 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{actionError}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <Mail size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground">{user.email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Agence</p>
                    <p className="text-sm font-medium text-foreground">{agence?.nom || "Non assignee"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <Shield size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Role</p>
                    <p className="text-sm font-medium text-foreground">{ROLE_LABELS[user.role] || user.role}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informations du compte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <Calendar size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cree le</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(user.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Derniere connexion</p>
                  <p className="text-sm font-medium text-foreground">
                    {user.last_login ? formatDateTime(user.last_login) : "Jamais"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EditUtilisateurDialog
        key={user.id}
        user={user}
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          setShowEdit(false);
          refetch();
        }}
      />
    </div>
  );
}
