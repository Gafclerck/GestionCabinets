import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Search, ChevronDown, Settings, LogOut, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_LABELS } from "../../lib/constants";
import Avatar from "../ui/Avatar";
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

function getPageTitle(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const root = segments[0] || "dashboard";
  if (root === "dossiers" && segments.length > 1) return "Détail du dossier";
  if (root === "clients" && segments.length > 1) return "Détail du client";
  return ROUTE_TITLES[root] || "Tableau de bord";
}

export default function Topbar({ onAgenceChange }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  if (!user) return null;

  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-6 gap-4 shrink-0 relative z-10">
      <div className="flex items-center gap-2 flex-1">
        <h1 className="text-sm font-semibold text-foreground mr-3 hidden sm:block">
          {getPageTitle(location.pathname)}
        </h1>
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
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Référence, titre, client…"
            onBlur={() => { if (!searchVal) setSearchOpen(false); }}
            className="w-[280px] border border-border rounded-md px-3 py-1.5 text-[13px] bg-background text-foreground outline-none"
          />
        </div>
        {searchOpen && searchVal && (
          <button
            onClick={() => { setSearchVal(""); searchRef.current?.focus(); }}
            className="text-muted-foreground p-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {user.role === "chef_central" && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-9 px-3 border border-border rounded-md bg-card text-[13px] text-foreground cursor-pointer hover:bg-secondary transition-colors outline-none">
              Toutes les agences
              <ChevronDown size={13} className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem onClick={() => onAgenceChange?.("all")}>
                Toutes les agences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAgenceChange?.("all")}>
                Agence Siège
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAgenceChange?.("all")}>
                Agence Dakar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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
            <DropdownMenuItem>
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
    </header>
  );
}
