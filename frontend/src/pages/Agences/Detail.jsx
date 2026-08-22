import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Building2, Users, Pencil, Power } from "lucide-react";
import { useAgence } from "../../hooks/useAgences";
import { formatDate } from "../../lib/utils";
import { ROLE_LABELS } from "../../lib/constants";
import Card, { CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Avatar from "../../components/ui/Avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/Dialog";
import { agenceService } from "../../services/agenceService";
import { useState, useEffect } from "react";

function EditAgenceDialog({ agence, open, onClose, onSaved }) {
  const [form, setForm] = useState({
    nom: agence?.nom ?? "",
    adresse: agence?.adresse ?? "",
    ville: agence?.ville ?? "",
    telephone: agence?.telephone ?? "",
    est_siege: agence?.est_siege ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!form.nom.trim() || !form.adresse.trim() || !form.ville.trim() || !form.telephone.trim()) {
      setError("Tous les champs sont requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await agenceService.update(agence.id, {
        nom: form.nom.trim(),
        adresse: form.adresse.trim(),
        ville: form.ville.trim(),
        telephone: form.telephone.trim(),
        est_siege: form.est_siege,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la modification de l'agence.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'agence</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Nom</label>
            <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Adresse</label>
            <Input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Ville</label>
            <Input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Telephone</label>
            <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
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

export default function AgenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: agence, loading, refetch } = useAgence(id);
  const [users, setUsers] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    if (!id) return;
    agenceService.getUsers(id).then(setUsers).catch(() => {});
  }, [id]);

  const toggleActif = async () => {
    if (!agence) return;
    setToggleBusy(true);
    setActionError(null);
    try {
      await agenceService.update(agence.id, { actif: !agence.actif });
      refetch();
    } catch (err) {
      setActionError(err.response?.data?.detail || "Erreur lors de la mise a jour de l'agence.");
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

  if (!agence) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">Agence introuvable</p>
          <Button variant="outline" onClick={() => navigate("/agences")} className="mt-3">
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
          onClick={() => navigate("/agences")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Retour aux agences
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-foreground">{agence.nom}</h1>
              {agence.est_siege && <Badge variant="info">Siege</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={agence.actif ? "success" : "secondary"}>
                {agence.actif ? "Active" : "Inactive"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                creee le {formatDate(agence.created_at)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setShowEdit(true)}>
              <Pencil size={14} />
              Modifier
            </Button>
            <Button
              variant={agence.actif ? "outline" : "default"}
              onClick={toggleActif}
              disabled={toggleBusy}
            >
              <Power size={14} />
              {agence.actif ? "Desactiver" : "Activer"}
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
                    <Phone size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telephone</p>
                    <p className="text-sm font-medium text-foreground">{agence.telephone || "---"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Adresse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Adresse</p>
                    <p className="text-sm font-medium text-foreground">{agence.adresse}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ville</p>
                    <p className="text-sm font-medium text-foreground">{agence.ville}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Utilisateurs de l'agence</CardTitle>
              <Badge variant="secondary">{users.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                  <Users size={20} />
                </div>
                <p className="text-sm text-muted-foreground">Aucun utilisateur dans cette agence.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {users.map((user, i) => (
                  <div
                    key={user.id}
                    onClick={() => navigate(`/utilisateurs/${user.id}`)}
                    className={`flex items-center gap-4 py-3.5 cursor-pointer hover:opacity-75 transition-opacity ${i > 0 ? "border-t border-border" : ""}`}
                  >
                    <Avatar nom={`${user.prenom} ${user.nom}`} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-foreground">{user.prenom} {user.nom}</span>
                        <Badge variant="secondary">{ROLE_LABELS[user.role] || user.role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant={user.actif ? "success" : "secondary"}>
                      {user.actif ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EditAgenceDialog
        key={agence.id}
        agence={agence}
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
