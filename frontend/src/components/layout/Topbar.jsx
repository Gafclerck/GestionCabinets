import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Search, ChevronDown, Settings, LogOut, X, Building2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useSearchQuery } from "../../hooks/useSearchQuery";
import { useUrlParam } from "../../hooks/useUrlParam";
import { useAgences } from "../../hooks/useAgences";
import { ROLE_LABELS } from "../../lib/constants";
import Avatar from "../ui/Avatar";
import CompteModal from "./CompteModal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/DropdownMenu";

const ROUTE_TITLES = {
  dashboard: "Tableau de bord",
  dossiers: "Dossiers",
  file: "File d'affectation",
  clients: "Clients",
  agences: "Agences",
  utilisateurs: "Utilisateurs",
  parametres: "Paramètres",
};

const SEARCHABLE_ROUTES = new Set(["dossiers", "clients", "agences", "utilisateurs"]);

function getPageTitle(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const root = segments[0] || "dashboard";
  if (root === "dossiers" && segments.length > 1) return "Détail du dossier";
  if (root === "clients" && segments.length > 1) return "Détail du client";
  return ROUTE_TITLES[root] || "Tableau de bord";
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useSearchQuery();
  const [agenceFiltre, setAgenceFiltre] = useUrlParam("agence");
  const { data: agences = [] } = useAgences();
  const [searchOpen, setSearchOpen] = useState(false);
  const [showCompte, setShowCompte] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  if (!user) return null;

  const root = location.pathname.split("/").filter(Boolean)[0] || "dashboard";
  const canSearch = SEARCHABLE_ROUTES.has(root);
  const showAgenceSelect = user.role === "chef_central" && root === "dashboard";
  const monAgence = agences.find((a) => a.id === user.agence_id);
  const vueMonAgence = agenceFiltre === String(user.agence_id);

  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-6 gap-4 shrink-0 relative z-10">
      <div className="flex items-center gap-2 flex-1">
        <h1 className="text-sm font-semibold text-foreground mr-3 hidden sm:block">
          {getPageTitle(location.pathname)}
        </h1>
        {showAgenceSelect && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 text-[13px] font-medium text-foreground bg-secondary rounded-md px-3 py-1.5 hover:opacity-85 transition-opacity cursor-pointer outline-none">
              <Building2 size={14} className="text-muted-foreground" />
              <span>{vueMonAgence ? `Mon agence${monAgence ? ` — ${monAgence.nom}` : ""}` : "Toutes les agences"}</span>
              <ChevronDown size={13} className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider">Vue du tableau de bord</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setAgenceFiltre("")}>
                Toutes les agences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAgenceFiltre(user.agence_id)}>
                <div className="flex flex-col">
                  <span>Mon agence</span>
                  {monAgence && <span className="text-[11px] text-muted-foreground">{monAgence.nom} · {monAgence.ville}</span>}
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canSearch && (
          <>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="text-muted-foreground hover:bg-secondary p-1.5 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Recherche"
            >
              <Search size={18} />
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${searchOpen ? "w-[280px]" : "w-0"}`}>
              <input
                ref={searchRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Référence, titre, client…"
                onBlur={() => { if (!q) setSearchOpen(false); }}
                className="w-[280px] border border-border rounded-md px-3 py-1.5 text-[13px] bg-background text-foreground outline-none"
              />
            </div>
            {searchOpen && q && (
              <button
                onClick={() => { setQ(""); searchRef.current?.focus(); }}
                className="text-muted-foreground p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          className="relative text-muted-foreground w-[44px] h-[44px] flex items-center justify-center rounded-md hover:bg-secondary"
          aria-label="Notifications"
        >
          <Bell size={19} />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-destructive text-primary-foreground text-[10px] font-bold flex items-center justify-center border-2 border-card">
            0
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-secondary transition-colors cursor-pointer outline-none">
            <Avatar nom={user.nom} size={30} />
            <div className="text-left">
              <div className="text-[13px] font-semibold text-foreground leading-tight">{user.nom}</div>
              <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</div>
            </div>
            <ChevronDown size={13} className="text-muted-foreground ml-0.5" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[240px]">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2.5">
                <Avatar nom={user.nom} size={36} />
                <div>
                  <div className="text-[13px] font-semibold text-foreground">{user.nom}</div>
                  <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                </div>
              </div>
            </DropdownMenuLabel>
            <div className="px-3 pb-2">
              <span className="text-[11px] font-medium bg-secondary text-secondary-foreground rounded-md px-2 py-0.5">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCompte(true)}>
              <Settings size={15} className="text-muted-foreground" />
              Paramètres du compte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut size={15} />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CompteModal open={showCompte} onClose={() => setShowCompte(false)} />
    </header>
  );
}