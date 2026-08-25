import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import NouveauDossierModal from "../components/dossiers/NouveauDossierModal";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showNouveauDossier, setShowNouveauDossier] = useState(false);

  // Le bouton "Nouveau dossier" vit dans la Topbar (le FAB flottant qui cachait
  // du contenu a ete retire). Les raccourcis du dashboard dispatch un evenement
  // cabinet:open-nouveau-dossier : on l'ecoute ici pour les garder fonctionnels.
  useEffect(() => {
    const handler = () => setShowNouveauDossier(true);
    window.addEventListener("cabinet:open-nouveau-dossier", handler);
    return () => window.removeEventListener("cabinet:open-nouveau-dossier", handler);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onNewDossier={() => setShowNouveauDossier(true)} />

        <main className="flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>

      <NouveauDossierModal
        open={showNouveauDossier}
        onClose={() => setShowNouveauDossier(false)}
        onCreated={(ref) => {
          setShowNouveauDossier(false);
          navigate(`/dossiers/${ref}`);
        }}
      />
    </div>
  );
}
