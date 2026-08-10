import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { DEMO_ACCOUNTS } from "../data/mockData";
import { ROLE_LABELS } from "../lib/constants";
import { Scale, FolderOpen, Users, Brain, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";

const FEATURES = [
  { icon: FolderOpen, title: "Gestion des Dossiers", desc: "Suivi intelligent de chaque dossier juridique" },
  { icon: Users, title: "Base Clients", desc: "Gestion centralisee de la clientele" },
  { icon: Brain, title: "Analyse IA", desc: "Classification et suggestion automatiques" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(account) {
    setError("");
    setLoading(true);
    try {
      await login(account.email, account.password);
      navigate("/dashboard");
    } catch {
      setError("Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden md:flex w-[60%] relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #0d1642 100%)" }}
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-16 right-12 w-56 h-56 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-white/[0.04] rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
            <Scale size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Cabinet Bhongo-Mavoungou
          </h1>
          <p className="text-base text-white/70 mb-10 leading-relaxed">
            Plateforme de gestion intelligente des dossiers juridiques
          </p>

          <div className="flex flex-col gap-3 w-full">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-center gap-4 bg-white/10 rounded-md px-5 py-4"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-white/80" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="text-xs text-white/55">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-[40%] bg-card flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Scale size={18} className="text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground">Cabinet Bhongo</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Bienvenue</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Connectez-vous à votre espace de travail
          </p>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md px-4 py-2.5 text-center mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Connexion...
                </span>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Comptes de demonstration
            </p>
            <div className="flex flex-col gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  onClick={() => handleDemoLogin(account)}
                  disabled={loading}
                  className="flex items-center justify-between w-full px-3.5 py-2.5 border border-border rounded-md bg-background hover:bg-secondary text-sm transition-colors disabled:opacity-50"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-foreground">
                      {account.user.prenom} {account.user.nom}
                    </span>
                    <span className="text-xs text-muted-foreground">{account.email}</span>
                  </div>
                  <Badge variant="secondary">{ROLE_LABELS[account.user.role]}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
