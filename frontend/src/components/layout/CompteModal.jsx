import { useState } from "react";
import { User, Lock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userService";
import { changePassword as changePasswordApi } from "../../services/authService";

export default function CompteModal({ open, onClose }) {
  // ResetKey pour reinitialiser le formulaire a chaque ouverture,
  // sans passer par un setState dans un useEffect (convention repo).
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
      <DialogContent className="max-w-lg">
        {open && <CompteBody key={resetKey} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CompteBody({ onClose }) {
  const { user, updateProfile } = useAuth();

  const [nom, setNom] = useState(user?.nom || "");
  const [prenom, setPrenom] = useState(user?.prenom || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const canSaveProfile = nom.trim() && prenom.trim() && email.trim() && !savingProfile;
  const canSavePassword =
    ancien && nouveau && confirmation && nouveau === confirmation && !savingPassword;

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!canSaveProfile) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const updated = await userService.updateMe({ nom: nom.trim(), prenom: prenom.trim(), email: email.trim() });
      updateProfile(updated);
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err.response?.data?.detail || "Erreur lors de la mise a jour du profil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!canSavePassword) return;
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await changePasswordApi({ ancien_mot_de_passe: ancien, nouveau_mot_de_passe: nouveau });
      setPasswordSuccess(true);
      setAncien("");
      setNouveau("");
      setConfirmation("");
    } catch (err) {
      setPasswordError(err.response?.data?.detail || "Erreur lors du changement de mot de passe");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Gestion de compte</DialogTitle>
      </DialogHeader>

      <div className="px-6 py-4 space-y-6 overflow-y-auto max-h-[70vh]">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <User size={15} className="text-muted-foreground" />Profil
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prenom</label>
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prenom" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nom</label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          </div>

          {profileError && (
            <div className="px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{profileError}</div>
          )}
          {profileSuccess && (
            <div className="px-3 py-2 text-sm text-success bg-success/10 border border-success/30 rounded-md">
              Profil mis a jour
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSaveProfile}>
              {savingProfile ? <Loader2 size={15} className="animate-spin" /> : "Enregistrer le profil"}
            </Button>
          </div>
        </form>

        <div className="h-px bg-border" />

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock size={15} className="text-muted-foreground" />Mot de passe
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Ancien mot de passe</label>
            <Input type="password" value={ancien} onChange={(e) => setAncien(e.target.value)} placeholder="Ancien mot de passe" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nouveau mot de passe</label>
            <Input type="password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} placeholder="8 caracteres minimum" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Confirmation</label>
            <Input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Repeter le nouveau mot de passe" />
          </div>

          {confirmation && nouveau !== confirmation && (
            <p className="text-xs text-red-600">Les mots de passe ne correspondent pas</p>
          )}

          {passwordError && (
            <div className="px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{passwordError}</div>
          )}
          {passwordSuccess && (
            <div className="px-3 py-2 text-sm text-success bg-success/10 border border-success/30 rounded-md">
              Mot de passe modifie
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSavePassword}>
              {savingPassword ? <Loader2 size={15} className="animate-spin" /> : "Changer le mot de passe"}
            </Button>
          </div>
        </form>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Fermer</Button>
      </DialogFooter>
    </>
  );
}