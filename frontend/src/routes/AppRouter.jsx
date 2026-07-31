import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../layouts/AppLayout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import DossiersList from "../pages/Dossiers";
import DossierDetail from "../pages/Dossiers/Detail";
import FileAffectation from "../pages/FileAffectation";
import Clients from "../pages/Clients";
import ClientDetail from "../pages/Clients/Detail";
import Agences from "../pages/Agences";
import AgenceDetail from "../pages/Agences/Detail";
import Utilisateurs from "../pages/Utilisateurs";
import UtilisateurDetail from "../pages/Utilisateurs/Detail";
import Parametres from "../pages/Parametres";

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dossiers" element={<DossiersList />} />
            <Route path="dossiers/:reference" element={<DossierDetail />} />
            <Route path="file" element={<FileAffectation />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="agences" element={<Agences />} />
            <Route path="agences/:id" element={<AgenceDetail />} />
            <Route path="utilisateurs" element={<Utilisateurs />} />
            <Route path="utilisateurs/:id" element={<UtilisateurDetail />} />
            <Route path="parametres" element={<Parametres />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
