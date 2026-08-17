import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";
import { dossierService } from "../../services/dossierService";

export default function TransferModal({ dossier, open, onClose, onConfirm }) {
  const [resetKey, setResetKey] = useState(0);

  function handleOpenChange(v) {
    if (!v) {
      onClose();
    } else {
      setResetKey((k) => k + 1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {open && (
          <TransferBody
            key={resetKey}
            dossier={dossier}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransferBody({ dossier, onClose, onConfirm }) {
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = motif.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !dossier) return;
    setSubmitting(true);
    try {
      await dossierService.transfer(dossier.id, motif.trim());
      onConfirm(motif.trim());
    } catch (err) {
      console.error("Erreur transfert:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Demander un transfert</DialogTitle>
      </DialogHeader>

      <div className="px-6 py-4 space-y-4">
        {dossier && (
          <p className="text-sm text-muted-foreground">
            Vous allez demander le transfert du dossier{" "}
            <span className="font-medium text-foreground">{dossier.reference}</span> -{" "}
            {dossier.titre}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Motif du transfert *
          </label>
          <Textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Expliquez la raison du transfert..."
            rows={4}
            className="text-sm"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          <ArrowRightLeft size={14} />
          Soumettre la demande
        </Button>
      </DialogFooter>
    </>
  );
}
