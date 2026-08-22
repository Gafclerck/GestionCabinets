import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { cn } from "../../lib/utils";
import { PRIORITE_LABELS } from "../../lib/constants";
import { useClients } from "../../hooks/useClients";
import { useReferentiel } from "../../hooks/useReferentiel";
import { dossierService } from "../../services/dossierService";

export default function ModifierDossierModal({ dossier, open, onClose, onSaved }) {
  const { data: clients = [] } = useClients();
  const { typesAffaires = [] } = useReferentiel();
  const [form, setForm] = useState({
    titre: dossier?.titre ?? "",
    type_affaire_id: dossier?.type_affaire_id ? String(dossier.type_affaire_id) : "",
    description_initiale: dossier?.description_initiale ?? "",
    priorite: dossier?.priorite ?? 3,
    client_id: dossier?.client_id ? String(dossier.client_id) : "",
  });
  const [clientSearch, setClientSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const filteredClients = clients.filter(
    (c) => !clientSearch || c.nom.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const save = async () => {
    if (!form.titre.trim()) { setError("Le titre est requis."); return; }
    if (!form.client_id) { setError("Le client est requis."); return; }
    if (!form.type_affaire_id) { setError("Le type d'affaire est requis."); return; }

    setSaving(true);
    setError("");
    try {
      await dossierService.update(dossier.id, {
        titre: form.titre.trim(),
        type_affaire_id: Number(form.type_affaire_id),
        client_id: Number(form.client_id),
        priorite: form.priorite,
        description_initiale: form.description_initiale.trim(),
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la modification du dossier.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier le dossier {dossier?.reference}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Titre *</label>
            <Input value={form.titre} onChange={(e) => update("titre", e.target.value)} className="text-sm" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type d'affaire *</label>
            <select
              value={form.type_affaire_id}
              onChange={(e) => update("type_affaire_id", e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="">Selectionner un type</option>
              {typesAffaires.map((t) => (
                <option key={t.id} value={t.id}>{t.libelle}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client *</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <select
              value={form.client_id}
              onChange={(e) => update("client_id", e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="">Selectionner un client</option>
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
            <Textarea
              value={form.description_initiale}
              onChange={(e) => update("description_initiale", e.target.value)}
              placeholder="Description du dossier (optionnel)"
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priorite</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((p) => {
                const isSelected = form.priorite === p;
                const colorClass = p <= 2
                  ? "border-border text-muted-foreground"
                  : p === 3
                    ? "border-warning text-warning"
                    : p === 4
                      ? "border-amber-600 text-amber-600"
                      : "border-destructive text-destructive";
                const selectedBg = p <= 2
                  ? "bg-secondary"
                  : p === 3
                    ? "bg-warning/10"
                    : p === 4
                      ? "bg-amber-600/10"
                      : "bg-destructive/10";
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => update("priorite", p)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 rounded-md border-2 py-2 transition-colors",
                      isSelected ? cn(colorClass, selectedBg) : "border-border text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <span className="text-sm font-bold">P{p}</span>
                    <span className="text-[9px] leading-tight">{PRIORITE_LABELS[p]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}