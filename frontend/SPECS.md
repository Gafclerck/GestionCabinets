# SPECS.md - Frontend Specifications

> **Purpose**: This file is the single source of truth for any AI assistant working on this frontend.
> Read this before making ANY changes. Every design decision, convention, and constraint is documented here.

---

## 1. Project Identity

- **Name**: Cabinet Diop & Associés - Plateforme de gestion intelligente des dossiers juridiques
- **Domain**: Senegalese law firm case management (French-speaking users)
- **Context**: Hackathon project, early stage
- **Repository**: Monorepo at `D:\Hackaton\` with `frontend/` and `backend/` directories
- **Branch**: `develop` (base), feature branches from `develop`

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.2.7 |
| Build | Vite | 8.1.0 |
| CSS | Tailwind CSS | 4.3.1 (via `@tailwindcss/vite` plugin) |
| Routing | React Router DOM | 7.18.0 |
| HTTP | Axios | 1.18.1 |
| UI Primitives | Radix UI | Dialog, Tabs, Select, DropdownMenu, Avatar, Tooltip, Slot |
| Variants | class-variance-authority (CVA) | 0.7.1 |
| Class merge | clsx + tailwind-merge | 2.1.1 + 3.6.0 |
| Icons | lucide-react | 1.24.0 |
| Lint | ESLint | 10.5.0 (react-hooks + react-refresh plugins) |

**NEVER use**: react-icons (removed), tailwind.config.js (Tailwind v4 uses `@theme` in CSS).

---

## 3. File Architecture

```
frontend/src/
├── main.jsx                          # React 19 entry point
├── App.jsx                           # Renders <AppRouter />
├── index.css                         # All design tokens (@theme inline) + base styles
│
├── lib/
│   ├── constants.js                  # Domain enums, labels, status maps, role maps
│   └── utils.js                      # cn(), getInitials(), getAvatarColor(), formatDate(), etc.
│
├── services/
│   ├── api.js                        # Axios instance + interceptors (token injection, 401 refresh)
│   └── authService.js                # login(), logout(), getProfile(), register()
│
├── contexts/
│   └── AuthContext.jsx               # AuthProvider + useAuth hook (user, loading, login, logout)
│
├── hooks/
│   └── useAuth.js                    # Re-export of useContext(AuthContext)
│
├── routes/
│   ├── AppRouter.jsx                 # All routes, AuthProvider wrapper, PublicRoute/ProtectedRoute
│   └── ProtectedRoute.jsx            # Auth guard with loading spinner
│
├── layouts/
│   └── AppLayout.jsx                 # Sidebar + Topbar + <Outlet /> + FAB (NouveauDossierModal)
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx               # Dark navy sidebar, role-filtered nav, lucide-react icons
│   │   └── Topbar.jsx                # Page title, search, user dropdown
│   ├── dossiers/
│   │   ├── AffectationModal.jsx      # Agency+lawyer assignment (Radix Dialog)
│   │   ├── TransferModal.jsx         # Transfer request (Radix Dialog)
│   │   └── NouveauDossierModal.jsx   # 3-step wizard (Radix Dialog)
│   └── ui/                           # shadcn-style primitives (19 components)
│       ├── Button.jsx                # CVA variants: default/destructive/outline/secondary/ghost/link
│       ├── Badge.jsx                 # CVA variants: default/secondary/destructive/outline/success/warning/info
│       ├── Card.jsx                  # Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter
│       ├── Input.jsx                 # forwardRef, h-10
│       ├── Textarea.jsx              # forwardRef
│       ├── Select.jsx                # Radix-based
│       ├── Dialog.jsx                # Radix-based
│       ├── Tabs.jsx                  # Radix-based
│       ├── Tooltip.jsx               # Radix-based
│       ├── DropdownMenu.jsx          # Radix-based
│       ├── Table.jsx                 # Table/TableHeader/TableBody/TableHead/TableRow/TableCell
│       ├── Avatar.jsx                # Radix AvatarRoot + standalone with deterministic colors
│       ├── StatusBadge.jsx           # Status pill using STATUT_STYLES from constants
│       ├── PrioriteStars.jsx         # 1-5 star display (lucide-react Star)
│       ├── KpiCard.jsx               # Metric card (icon + value + label)
│       ├── SectionCard.jsx           # Card container with optional header + action
│       ├── EmptyState.jsx            # Empty placeholder with icon + message
│       ├── ConfidenceBar.jsx         # AI confidence progress bar (0-1 score)
│       └── Pagination.jsx            # Simple prev/next navigation
│
├── data/
│   └── mockData.js                   # All mock data (agences, users, clients, dossiers)
│
└── pages/
    ├── Login.jsx                     # Split-screen login (navy left + form right + demo accounts)
    ├── Clients.jsx                   # Grid/list client list with create dialog
    ├── ClientDetail.jsx              # Client info + associated dossiers
    ├── PlaceholderPage.jsx           # "Coming soon" placeholder
    ├── Dashboard/
    │   └── index.jsx                 # 3 role-based views (GerantCentral, AvocatEnChef, Avocat)
    ├── Dossiers/
    │   ├── index.jsx                 # Full table: search, 4 filters, 9-col sort, pagination
    │   └── Detail.jsx                # Tabbed: Aperçu/Documents/Historique/Messagerie
    └── FileAffectation/
        └── index.jsx                 # Assignment queue with IA analysis cards
```

### Where to put new files

| What you're creating | Where it goes |
|---------------------|---------------|
| New page | `src/pages/` (single file) or `src/pages/Name/index.jsx` (multi-file) |
| New UI primitive | `src/components/ui/` |
| New layout component | `src/components/layout/` |
| New domain modal | `src/components/{domain}/` (e.g., `dossiers/`) |
| New API service | `src/services/` |
| New hook | `src/hooks/` |
| New constant/enum | `src/lib/constants.js` |
| New utility | `src/lib/utils.js` |

---

## 4. Design System

All tokens are defined in `src/index.css` via CSS custom properties in `:root`, mapped to Tailwind via `@theme inline`.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#1B2A4A` | Navy - sidebar bg, buttons, headings |
| `--accent` | `#9C7A3C` | Gold - highlights, badges, active states |
| `--background` | `#F5F2ED` | Warm beige - page background |
| `--card` | `#FDFCFA` | Near-white - card backgrounds |
| `--secondary` | `#EAE6DF` | Light beige - secondary surfaces, tags |
| `--border` | `#D8D3C8` | Warm gray - all borders |
| `--destructive` | `#B3261E` | Red - delete, errors |
| `--success` | `#2F7A54` | Green - completed, positive |
| `--warning` | `#B7791F` | Amber - warnings, high priority |
| `--muted-foreground` | `#6B6860` | Gray - secondary text |
| `--foreground` | `#27272A` | Near-black - primary text |

### Sidebar Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--sidebar` | `#1B2A4A` | Sidebar background (same as primary) |
| `--sidebar-foreground` | `#ffffff` | Sidebar text |
| `--sidebar-primary` | `#9C7A3C` | Sidebar active indicator |
| `--sidebar-accent` | `#253657` | Sidebar hover/active background |

### Status Colors (5 statuses)

Each status has a background and text color pair. Aligned with backend `StatutDossier` enum.

| Status | Label | Background Token | Text Token |
|--------|-------|-----------------|------------|
| `en_attente` | En attente | `--status-attente-bg` (#FEF3C7) | `--status-attente-text` (#92400E) |
| `en_attente_affectation` | En attente d'affectation | `--status-attente-bg` (#FEF3C7) | `--status-attente-text` (#92400E) |
| `en_cours` | En cours | `--status-en-cours-bg` (#D1FAE5) | `--status-en-cours-text` (#064E3B) |
| `termine` | Termine | `--status-cloture-bg` (#374151) | `--status-cloture-text` (#F9FAFB) |
| `archive` | Archive | `--status-archive-bg` (#F3F4F6) | `--status-archive-text` (#9CA3AF) |

### How to use tokens

```jsx
// Good - use Tailwind utility classes referencing tokens
<div className="bg-primary text-primary-foreground p-4">
<button className="border border-border rounded hover:bg-secondary">

// Good - for dynamic values, use inline style
<div style={{ width: `${pct}%` }}>

// NEVER hardcode colors that exist as tokens
<div className="bg-[#1B2A4A]">  // BAD - use bg-primary instead
```

### Typography & Spacing

- Font: Inter (system-ui fallback)
- Base font size: 16px
- Border radius: `0.375rem` (6px) - NOT rounded-2xl (that was PR-2's mistake)
- Small text: `text-[11px]`, `text-[13px]`
- Medium text: `text-sm` (14px)

---

## 5. Component Library Reference

### Button (`components/ui/Button.jsx`)

```jsx
import Button from "@/components/ui/Button";

// Variants
<Button variant="default">Primary</Button>        // bg-primary text-primary-foreground
<Button variant="destructive">Delete</Button>     // bg-destructive
<Button variant="outline">Cancel</Button>          // border, transparent bg
<Button variant="secondary">Draft</Button>         // bg-secondary
<Button variant="ghost">Ghost</Button>             // no bg, hover only
<Button variant="link">Link</Button>               // underlined

// Sizes
<Button size="default">Normal</Button>    // h-10 px-4
<Button size="sm">Small</Button>          // h-9 px-3
<Button size="lg">Large</Button>          // h-11 px-8
<Button size="icon"><Plus /></Button>     // h-10 w-10

// With icon
<Button><Plus size={16} /> New</Button>

// asChild (renders as child element)
<Button asChild><a href="/link">Link</a></Button>
```

### Badge (`components/ui/Badge.jsx`)

```jsx
<Badge variant="default">Default</Badge>         // bg-primary
<Badge variant="secondary">Secondary</Badge>     // bg-secondary
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="success">OK</Badge>              // bg-success
<Badge variant="warning">Warn</Badge>            // bg-warning
<Badge variant="info">Info</Badge>               // bg-accent
```

### Dialog (`components/ui/Dialog.jsx`) - Radix-based

```jsx
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
  DialogFooter, DialogClose
} from "@/components/ui/Dialog";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <div>{/* body */}</div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Tabs (`components/ui/Tabs.jsx`) - Radix-based

```jsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Avatar (`components/ui/Avatar.jsx`)

```jsx
import Avatar from "@/components/ui/Avatar";

// Deterministic color based on name
<Avatar nom="Fatou Diop" size={40} />   // 40px circle, navy bg, "FD" initials
<Avatar nom="Moussa Sow" size={32} />   // 32px circle, different color
```

### StatusBadge (`components/ui/StatusBadge.jsx`)

```jsx
import StatusBadge from "@/components/ui/StatusBadge";

<StatusBadge statut="en_cours" />   // Renders "En cours" with green pill
<StatusBadge statut="nouveau" />    // Renders "Nouveau" with gray pill
```

### cn() utility (`lib/utils.js`)

```jsx
import { cn } from "@/lib/utils";

// Merges Tailwind classes intelligently (dedupes conflicts)
<div className={cn("base-class", conditional && "conditional-class", undefined)}>
```

---

## 6. Backend Contract

### API Base URL

```
http://localhost:8000/api
```

Configured via `VITE_API_URL` env var (defaults to `http://localhost:8000`).

### Authentication Flow

1. **Login**: `POST /api/auth/login` with `application/x-www-form-urlencoded` body:
   - `username` = email (NOT `email` field - OAuth2 spec uses `username`)
   - `password` = password
   - Returns: `{ access_token, refresh_token, token_type: "bearer" }`

2. **Profile**: `GET /api/auth/me` with `Authorization: Bearer <access_token>`
   - Returns: `{ id, nom, prenom, email, role, agence_id, actif, created_at, last_login }`

3. **Refresh**: `POST /api/auth/refresh` with `Authorization: Bearer <refresh_token>`
   - Returns new access + refresh tokens

4. **Token storage**: localStorage keys `access_token` and `refresh_token`

5. **Auto-refresh**: Axios interceptor in `services/api.js` catches 401s and retries with refresh token

### All API Endpoints

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/auth/register` | None | `{ nom, prenom, email, password, agence_id?, role }` | `UserResponse` |
| POST | `/api/auth/chef_central/register` | ChefCentral | `{ nom, prenom, email, password, agence_id?, role }` | `UserResponse` |
| POST | `/api/auth/chef_agence/register` | ChefAgence | `{ nom, prenom, email, password, agence_id? }` | `UserResponse` (role forced to avocat) |
| POST | `/api/auth/login` | None | form-urlencoded: `username` + `password` | `TokenResponse` |
| POST | `/api/auth/refresh` | Bearer(refresh) | -- | `TokenResponse` |
| GET | `/api/auth/me` | Bearer | -- | `UserResponse` |
| POST | `/api/client/create` | Bearer | `{ type_client, nom, telephone, email, nin?, rccm? }` | `ClientRead` |
| GET | `/api/client/all` | Bearer | -- | `list[ClientRead]` |
| GET | `/api/client/{id}` | Bearer | -- | `ClientRead` |
| PUT | `/api/client/{id}` | Bearer | `{ type_client?, nom?, telephone?, email? }` | `ClientRead` |
| POST | `/api/agence/create` | ChefCentral | `{ nom, adresse, ville, telephone, est_siege?, actif? }` | `AgenceResponse` |
| GET | `/api/agence/all` | Bearer | -- | `list[AgenceResponse]` |
| GET | `/api/agence/{id}` | Bearer | -- | `AgenceResponse` |
| PATCH | `/api/agence/{id}` | ChefCentral | `{ nom?, adresse?, ville?, telephone?, est_siege?, actif? }` | `AgenceResponse` |
| GET | `/api/agence/{id}/users` | Bearer | -- | `list[UserResponse]` |
| GET | `/api/user/all` | Bearer | -- | `list[UserResponse]` |
| GET | `/api/user/{id}` | ChefCentral | -- | `UserResponse` |
| PATCH | `/api/user/{id}` | ChefCentral | `{ nom?, prenom?, password?, actif?, role?, agence_id? }` | `UserResponse` |
| GET | `/api/referentiel/type_affaires` | Bearer | -- | `list[TypeAffaireRead]` |
| POST | `/api/referentiel/type_affaires/create` | Bearer | `{ libelle }` | `TypeAffaireRead` |
| GET | `/api/referentiel/specialites` | Bearer | -- | `list[SpecialiteRead]` |
| POST | `/api/referentiel/specialites/create` | Bearer | `{ libelle, description? }` | `SpecialiteRead` |
| POST | `/api/dossier/create` | Chef | `{ client_id, type_affaire_id, titre, description_initiale?, priorite? }` | `DossierRead` |
| GET | `/api/dossier/all` | Bearer | -- | `list[DossierRead]` |
| GET | `/api/dossier/{id}` | Bearer | -- | `DossierRead` |
| PATCH | `/api/dossier/{id}/affecter` | Chef | `{ agence_assigne_id, avocat_assigne_id }` | `DossierRead` |
| PATCH | `/api/dossier/{id}/statut` | Bearer | `{ statut }` | `DossierRead` |
| PATCH | `/api/dossier/{id}/transfer` | Chef | `{ motif }` | `DossierRead` |
| DELETE | `/api/dossier/{id}` | Chef | -- | 204 |

Note: `agence_receptrice_id` and `avocat_en_chef_id` are auto-set server-side from the current user's JWT. The frontend does not need to send them.

### Backend Enums

```python
# UserRole (app/models/User.py)
class UserRole(str, Enum):
    CHEF_CENTRAL = "chef_central"
    CHEF_AGENCE = "chef_agence"
    AVOCAT = "avocat"

# ClientType (app/models/Client.py)
class ClientType(str, Enum):
    PHYSIQUE = "physique"    # NOTE: lowercase in backend
    MORAL = "moral"          # NOTE: lowercase in backend
```

### Frontend-Backend Enum Mismatch (IMPORTANT)

The frontend mock data uses `"PHYSIQUE"` and `"MORALE"` (uppercase) for `type_client`, but the backend enum uses `"physique"` and `"moral"` (lowercase, no E). **When integrating with the real API, normalize to backend values.**

### Backend Models (14 total)

| Model | Table | Key Fields | Has API Routes |
|-------|-------|------------|----------------|
| User | `user` | id, nom, prenom, email, password_hash, role, agence_id, actif | Auth + User CRUD |
| Agence | `agence` | id, nom, adresse, ville, telephone, est_siege, actif | CRUD |
| Client | `client` | id, type_client, nom, telephone, email, nin, rccm | CRUD |
| Dossier | `dossier` | id, reference, titre, statut, priorite, client_id, agence_receptrice_id, agence_assigne_id, avocat_assigne_id, type_affaire_id, date_reception, date_affectation, date_cloture, description_initiale | CRUD + Affectation + Transfer |
| TypeAffaire | `type_affaire` | id, libelle, code | Read + Create |
| Specialite | `specialite` | id, libelle, description | Read + Create |
| UserSpecialite | `user_specialite` | user_id, specialite_id, niveau (composite PK) | **NO** (hors MVP) |
| Document | `document` | id, dossier_id, uploaded_by_id, nom_fichier, chemin_stockage, type_mime, taille_octets, description, confidentiel | **NO** (hors MVP) |
| AnalyseIa | `analyse_ia` | id, dossier_id, resume_genere, type_detecte, mots_cles (JSONB), agence_suggeree_id, avocat_suggere_id, score_confiance, modele_ia, validee | **NO** (hors MVP) |
| HistoriqueAction | `historique_action` | id, dossier_id, user_id, action, ancienne_valeur, nouvelle_valeur, commentaire | **NO** (hors MVP) |
| Discussion | `discussion` | id, dossier_id, created_by_id, sujet | **NO** (hors MVP) |
| MessageDiscussion | `message_discussion` | id, discussion_id, auteur_id, contenu, parent_message_id | **NO** (hors MVP) |
| Notification | `notification` | id, destinataire_id, dossier_id, type, contenu, lue | **NO** (hors MVP) |

---

## 7. Domain Model

### French Legal Terminology Glossary

| French | English | Context |
|--------|---------|---------|
| Dossier | Case/File | A legal case assigned to a lawyer |
| Agence | Office/Branch | Physical office (1 headquarters + 2 branches) |
| Avocat | Lawyer | Legal professional |
| Chef d'agence | Office Manager | Manages one office (avocat_en_chef) |
| Gérant Central | Managing Partner | Top-level, sees everything |
| Affectation | Assignment | Assigning a dossier to a lawyer |
| Statut | Status | Current state of a dossier |
| Priorité | Priority | 1 (very low) to 5 (very high) |
| Référence | Reference | Unique dossier ID (e.g., DOS-2026-001) |
| Type d'affaire | Case Type | Legal specialty area |
| File d'affectation | Assignment Queue | Dossiers waiting to be assigned |
| Transfert | Transfer | Moving a dossier to another office |
| Clôturé | Closed | Case resolved |
| Archivé | Archived | Case stored for records |
| Analyse IA | AI Analysis | Automatic case classification |
| Client | Client | Person or company the firm represents |
| Personne physique | Individual | Natural person |
| Personne morale | Company | Legal entity (SARL, SA, etc.) |
| NIN | National ID Number | Senegalese national identification |
| RCCM | Business Registration | Registre du Commerce et du Crédit Mobilier |

### Dossier Lifecycle

```
en_attente → en_attente_affectation → en_cours → termine → archive
                                  ↑
                     (transfert clears assignment)
```

**Status descriptions** (aligned with backend `StatutDossier` enum):
1. `en_attente` - Just created, waiting for initial processing
2. `en_attente_affectation` - Waiting for office/lawyer assignment (or after transfer)
3. `en_cours` - Lawyer actively working on the case
4. `termine` - Case resolved and closed
5. `archive` - Stored for historical records

### Role Permissions

| Feature | Gérant Central | Chef d'Agence | Avocat |
|---------|---------------|---------------|--------|
| Dashboard | Global KPIs, all agences | Agence-level view | Personal dossiers |
| Dossiers | All dossiers | Agence dossiers | Assigned only |
| File d'affectation | All pending | Agence pending | No access |
| Agences CRUD | Yes | No | No |
| Users CRUD | Yes | No | No |
| Spécialités | Yes | No | No |
| Transfer approval | Yes | Own agence | No |
| AI analysis validation | Yes | Yes | No |

### Sidebar Navigation by Role

```js
chef_central:  ["dashboard", "dossiers", "clients", "file", "agences", "utilisateurs", "specialites", "parametres"]
chef_agence:   ["dashboard", "dossiers", "clients", "file", "parametres"]
avocat:        ["dashboard", "dossiers", "clients", "parametres"]
```

---

## 8. Routing

### Route Table

| Path | Component | Auth | Notes |
|------|-----------|------|-------|
| `/login` | Login | Public | Redirects to /dashboard if already logged in |
| `/` | -- | Protected | Redirects to /dashboard |
| `/dashboard` | Dashboard | Protected | Role-based rendering |
| `/dossiers` | DossiersList | Protected | Table with search + filters |
| `/dossiers/:reference` | DossierDetail | Protected | Tabbed detail view |
| `/file` | FileAffectation | Protected | Assignment queue |
| `/clients` | Clients | Protected | Grid/list view + create dialog |
| `/clients/:id` | ClientDetail | Protected | Client info + associated dossiers |
| `/agences` | Agences | Protected | Grid/list view + create dialog (chef_central) |
| `/agences/:id` | AgenceDetail | Protected | Agence info + user list |
| `/utilisateurs` | Utilisateurs | Protected | Grid/list view + create dialog (chef_central) |
| `/utilisateurs/:id` | UtilisateurDetail | Protected | User info + agence + role |
| `/specialites` | PlaceholderPage | Protected | **TODO** |
| `/parametres` | PlaceholderPage | Protected | **TODO** |
| `*` | -- | -- | Redirects to /dashboard |

### Auth Patterns

```jsx
// PublicRoute - redirects away if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

// ProtectedRoute - wraps AppLayout, redirects to /login if not authenticated
<ProtectedRoute><AppLayout /></ProtectedRoute>
```

---

## 9. Mock Data

All data lives in `src/data/mockData.js`. When integrating with the real backend, replace these imports with API service calls.

### Data Shapes

```js
// Agence
{ id: "ag-1", nom: "Cabinet Diop & Associés - Siège", ville: "Dakar", est_siege: true }

// Utilisateur
{ id: "u-1", nom: "Fatou Diop", prenom: "Fatou", role: "chef_central", agence_id: "ag-1", email: "f.diop@cabinet.sn", specialites: [...], charge_actuelle: 4 }

// Client
{ id: "c-1", type_client: "PHYSIQUE", nom: "Ousmane Kane", telephone: "+221 77 123 45 67", email: "o.kane@email.sn", nin: "1234567890123" }

// Dossier
{
  id: "d-1", reference: "DOS-2026-001", titre: "Litige contractuel...",
  client_id: "c-2", type_affaire: "Droit commercial", statut: "nouveau",
  priorite: 3, agence_receptrice_id: "ag-1", agence_assigne_id: null,
  avocat_assigne_id: null, description_initiale: "...",
  date_reception: "2026-01-15T09:30:00", date_affectation: null,
  date_cloture: null, motif_transfert: null,
  analyse_ia: {
    resume_genere: "...", type_detecte: "Recouvrement de créances",
    mots_cles: ["impayés", "fournisseur"], agence_suggeree_id: "ag-1",
    avocat_suggere_id: "u-3", score_confiance: 0.92,
    modele_ia: "legal-assistant-v2", justification: "...", validee: true
  }
}
```

### Demo Accounts

| Email | Password | Role | Name |
|-------|----------|------|------|
| f.diop@cabinet.sn | demo123 | chef_central | Fatou Diop |
| m.sow@cabinet.sn | demo123 | chef_agence | Moussa Sow |
| a.ba@cabinet.sn | demo123 | avocat | Aïssatou Ba |

### Helper Functions

```js
getClient(id)        // Find client by ID
getAgence(id)        // Find agence by ID
getUtilisateur(id)   // Find user by ID
getDossier(ref)      // Find dossier by reference
```

---

## 10. Code Conventions

### Naming

- **Files**: PascalCase for components (`StatusBadge.jsx`), camelCase for utilities (`mockData.js`)
- **Exports**: Default exports for components, named exports for utilities/constants
- **Components**: PascalCase function names matching filename
- **Constants**: UPPER_SNAKE_CASE (`STATUT_LABELS`, `ROLE_LABELS`)

### French Field Names

All field names use French to match the backend:
- `nom` (name), `prenom` (first name), `actif` (active)
- `statut` (status), `priorite` (priority), `reference`
- `type_affaire` (case type), `type_client` (client type)
- `date_reception`, `date_affectation`, `date_cloture`
- `agence_receptrice_id`, `agence_assigne_id`, `avocat_assigne_id`

### Import Order

```jsx
// 1. React
import { useState, useMemo, useEffect } from "react";

// 2. Router
import { useNavigate, useParams } from "react-router-dom";

// 3. Icons (lucide-react ONLY)
import { Search, X, Plus } from "lucide-react";

// 4. Internal services/contexts
import { useAuth } from "../../hooks/useAuth";
import { dossiers, getClient } from "../../data/mockData";

// 5. Constants/utils
import { STATUT_LABELS, ROLE_LABELS } from "../../lib/constants";
import { cn, formatDate } from "../../lib/utils";

// 6. Components
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
```

### Styling Rules

1. **Always use design tokens** via Tailwind classes (`bg-primary`, `text-accent`, `border-border`)
2. **Never use react-icons** - use `lucide-react`
3. **Use `cn()`** for conditional class merging
4. **Small font sizes**: Use `text-[11px]`, `text-[13px]` for compact UI (not arbitrary Tailwind sizes)
5. **Border radius**: `rounded` (4px) or `rounded-md` (6px). Avoid `rounded-2xl` (too round for this design)
6. **Input height**: `h-9` or `h-10` - consistent with Figma
7. **Touch targets**: Minimum `min-h-[44px]` for interactive elements

---

## 11. Gotchas & Anti-Patterns

### Critical Mistakes to Avoid

| Mistake | Why it's wrong | Correct approach |
|---------|---------------|-----------------|
| Using UPPERCASE roles (`CHEF_CENTRAL`) | Backend uses lowercase (`chef_central`) | Always use `ROLES.chef_central` from constants |
| Using react-icons (`FiSearch`) | Package removed, causes build failure | Use lucide-react (`Search`) |
| Importing from `utils/helpers.js` | File deleted | Use `lib/constants.js` and `lib/utils.js` |
| Importing from `components/modals/` | Directory deleted | Use `components/dossiers/` |
| Hardcoding colors (`bg-[#1B2A4A]`) | Breaks design system | Use `bg-primary` |
| Using `rounded-2xl` | PR-2's mistake, doesn't match Figma | Use `rounded` or `rounded-md` |
| Using `tailwind.config.js` | Tailwind v4 doesn't use it | All config is in `index.css` `@theme inline` |
| Putting `username` field in login body | OAuth2 spec uses `username` | `formData.append("username", email)` |
| Using `ClientType.MORALE` | Backend uses `"moral"` (no E) | Check backend enum before hardcoding |
| Creating components without reading existing ones | May duplicate or conflict | Always check `components/ui/` first |

### Tailwind v4 Specifics

```css
/* This is the config - NOT tailwind.config.js */
@theme inline {
  --color-primary: var(--primary);
  --color-accent: var(--accent);
  /* ... all token mappings */
}

/* Base styles */
@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}
```

### Radix Dialog Gotcha

Radix Dialog renders in a portal. If you need to position it relative to a parent, use `modal={false}` or Portal customizations.

---

## 12. What's Built vs What's Not

### Built

- Login (split-screen, demo accounts, JWT auth)
- Dashboard (3 role-based views with KPIs, charts, shortcuts)
- Dossiers list (search, 4 filters, sort, pagination)
- Dossier detail (tabbed: Apercu/Documents/Historique/Messagerie)
- File d'affectation (assignment queue with IA suggestions)
- Clients (grid/list view, create dialog, detail page) -- API-integrated
- Agences (grid/list view, create dialog, detail page with user list) -- API-integrated
- Utilisateurs (grid/list view with role/agence filters, create dialog, detail page) -- API-integrated
- Full design token system (60+ tokens)
- shadcn-style component library (19 components)
- Auth flow (JWT + auto-refresh interceptor)
- Backend API integration for: clients, agences, utilisateurs, dossiers, referentiel, user CRUD

### Not Built (hors MVP)

- Documents tab (upload, preview)
- Historique tab (audit timeline)
- Messagerie tab (intra-office messaging)
- Specialites management page
- Parametres page
- UserSpecialite assignment (specialites per user with level)
- Password reset (admin)
- Error handling / toast notifications
- Code splitting (bundle is ~550KB)
- Real-time updates / push notifications
- Responsive mobile (admin pages are desktop-only for MVP)
- Skeleton loading (currently uses text "Chargement...")

---

## 13. API Integration Guide

When replacing mock data with real API calls, follow this pattern.

### Step 1: Create a service file

```js
// src/services/dossierService.js
import api from "./api";

export async function getDossiers(params = {}) {
  const { data } = await api.get("/api/dossiers", { params });
  return data;
}

export async function getDossier(reference) {
  const { data } = await api.get(`/api/dossiers/${reference}`);
  return data;
}

export async function createDossier(payload) {
  const { data } = await api.post("/api/dossiers", payload);
  return data;
}

export async function affecterDossier(reference, agenceId, avocatId) {
  const { data } = await api.patch(`/api/dossiers/${reference}/affecter`, {
    agence_assigne_id: agenceId,
    avocat_assigne_id: avocatId,
  });
  return data;
}
```

### Step 2: Replace mock imports in pages

```jsx
// BEFORE (mock)
import { dossiers, getClient, getAgence } from "../../data/mockData";

// AFTER (API)
import { getDossiers } from "../../services/dossierService";
import { getClient } from "../../services/clientService";

// In component
const [dossiers, setDossiers] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  getDossiers()
    .then(setDossiers)
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);
```

### Step 3: Handle loading and error states

```jsx
if (loading) return <div className="p-8 text-muted-foreground">Chargement...</div>;
if (error) return <div className="p-8 text-destructive">Erreur: {error.message}</div>;
```

### Step 4: Handle auth errors

The axios interceptor in `services/api.js` already handles 401 → refresh → retry. If refresh fails, it redirects to `/login`. No additional handling needed in components.

### API Response Shape Mapping

When the real API returns data, map backend fields to frontend expectations:

```js
// Backend returns { id: 1, nom: "...", prenom: "...", role: "chef_central" }
// Frontend mock uses string IDs like "u-1"
// When integrating, update:
//   - ID handling (backend uses int, mock uses strings)
//   - Client type values ("physique" vs "PHYSIQUE")
//   - analyse_ia is a related object on Dossier, may need separate fetch
```

### New Backend Endpoints Needed

These features exist in the frontend but have no backend endpoints yet:

| Feature | Endpoint needed | Notes |
|---------|----------------|-------|
| Document upload | `POST /api/dossiers/:id/documents` | File attachment |
| Historique | `GET /api/dossiers/:id/historique` | Audit trail |
| Notifications | `GET/PATCH /api/notifications` | User notifications |
| User CRUD | `GET/POST/PATCH/DELETE /api/users` | User management |

---

## 14. How to Extend

### Adding a New Page

1. Create `src/pages/MyPage.jsx` (or `src/pages/MyPage/index.jsx` for multi-file)
2. Export default function `MyPage()`
3. Add route in `src/routes/AppRouter.jsx`:
   ```jsx
   <Route path="my-page" element={<MyPage />} />
   ```
4. Add nav item in `src/components/layout/Sidebar.jsx` `ALL_NAV` array
5. Add role access in `NAV_BY_ROLE` object

### Adding a New API Service

1. Create `src/services/myService.js`
2. Import `api` from `./api`
3. Export async functions that call `api.get/post/patch/delete`
4. Use in components with `useEffect` + state

### Adding a New UI Component

1. Check if existing component can be extended first
2. Create in `src/components/ui/MyComponent.jsx`
3. Use `cn()` for class merging, design tokens for colors
4. Export default
5. Document variants with CVA if applicable

### Adding a New Modal

1. Create in `src/components/{domain}/MyModal.jsx`
2. Use Radix Dialog from `components/ui/Dialog`
3. Accept `open` and `onClose` props
4. Handle form state internally

---

*Last updated: July 15, 2026*
*Branch: develop*
