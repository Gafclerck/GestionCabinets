import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, CreditCard, FileText, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useClient } from "../../hooks/useClients";
import { useDossiers } from "../../hooks/useDossiers";
import { clientService } from "../../services/clientService";
import { TYPE_CLIENT_LABELS } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import Card, { CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Avatar from "../../components/ui/Avatar";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/Dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../../components/ui/Select";

function EditClientDialog({ client, open, onClose, onSaved }) {
  const [form, setForm] = useState({
    nom: client?.nom ?? "",
    type_client: client?.type_client === "moral" ? "MORALE" : "PHYSIQUE",
    telephone: client?.telephone ?? "",
    email: client?.email ?? "",
    nin: client?.nin ?? "",
    rccm: client?.rccm ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!form.nom.trim() || !form.telephone.trim() || !form.email.trim()) {
      setError("Le nom, le telephone et l'email sont requis.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("L'email n'est pas valide.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await clientService.update(client.id, {
        nom: form.nom.trim(),
        type_client: form.type_client === "PHYSIQUE" ? "physique" : "moral",
        telephone: form.telephone.trim(),
        email: form.email.trim(),
        nin: form.nin.trim() || null,
        rccm: form.rccm.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la modification du client.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le client</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Nom</label>
            <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Type de client</label>
            <Select value={form.type_client} onValueChange={(v) => setForm({ ...form, type_client: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PHYSIQUE">Personne physique</SelectItem>
                <SelectItem value="MORALE">Personne morale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Telephone</label>
            <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {form.type_client === "PHYSIQUE" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">NIN</label>
              <Input value={form.nin} onChange={(e) => setForm({ ...form, nin: e.target.value })} />
            </div>
          )}
          {form.type_client === "MORALE" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">RCCM</label>
              <Input value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} />
            </div>
          )}
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

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, loading: clientLoading, refetch } = useClient(id);
  const { data: dossiers = [] } = useDossiers();
  const [showEdit, setShowEdit] = useState(false);
  const [actionError, setActionError] = useState(null);

  const clientDossiers = dossiers.filter((d) => d.client_id === Number(id));

  const handleDelete = async () => {
    if (!client) return;
    if (!window.confirm(`Supprimer le client "${client.nom}" ?`)) return;
    setActionError(null);
    try {
      await clientService.remove(client.id);
      navigate("/clients", { replace: true });
    } catch (err) {
      setActionError(err.response?.data?.detail || "Erreur lors de la suppression du client.");
    }
  };

  if (clientLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">Client introuvable</p>
          <Button variant="outline" onClick={() => navigate("/clients")} className="mt-3">
            Retour a la liste
          </Button>
        </div>
      </div>
    );
  }

  const displayType = client.type_client === "physique" ? "PHYSIQUE" : "MORALE";

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20 bg-background">
      <div className="max-w-[900px] mx-auto">
        <button
          onClick={() => navigate("/clients")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Retour aux clients
        </button>

        <div className="flex items-center gap-4 mb-8">
          <Avatar nom={client.nom} size={56} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground mb-1">{client.nom}</h1>
            <Badge variant={displayType === "PHYSIQUE" ? "secondary" : "info"}>
              {TYPE_CLIENT_LABELS[displayType]}
            </Badge>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setShowEdit(true)}>
              <Pencil size={14} />
              Modifier
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 size={14} />
              Supprimer
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
                    <p className="text-sm font-medium text-foreground">{client.email || "---"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <Phone size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telephone</p>
                    <p className="text-sm font-medium text-foreground">{client.telephone || "---"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Identifiants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {client.nin && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                      <CreditCard size={16} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">NIN</p>
                      <p className="text-sm font-medium text-foreground font-mono tabular-nums">{client.nin}</p>
                    </div>
                  </div>
                )}
                {client.rccm && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                      <CreditCard size={16} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">RCCM</p>
                      <p className="text-sm font-medium text-foreground font-mono tabular-nums">{client.rccm}</p>
                    </div>
                  </div>
                )}
                {!client.nin && !client.rccm && (
                  <p className="text-sm text-muted-foreground italic">Aucun identifiant enregistre</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Dossiers associes</CardTitle>
              <Badge variant="secondary">{clientDossiers.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {clientDossiers.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                  <FileText size={20} />
                </div>
                <p className="text-sm text-muted-foreground">Aucun dossier associe a ce client.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {clientDossiers.map((d, i) => (
                  <div
                    key={d.reference}
                    onClick={() => navigate(`/dossiers/${d.reference}`)}
                    className={`flex items-center gap-4 py-3.5 cursor-pointer hover:opacity-75 transition-opacity ${i > 0 ? "border-t border-border" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-primary tabular-nums">{d.reference}</span>
                        <StatusBadge statut={d.statut} />
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{d.titre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.type_affaire} - {formatDate(d.date_reception)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EditClientDialog
        key={client.id}
        client={client}
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
