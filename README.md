# InstallOps Frontend

Web UI for furniture installation operations: manager/admin dashboards, Netsis-backed orders, installation scheduling, crew mobile workflow, and admin configuration.

## Roles and routes

Session cookie auth (`POST /auth/login`). The API returns role names `admin`, `manager`, and `crew`; the SPA maps them to `ADMIN`, `STORE_MANAGER`, and `CREW`.

| Role | Shell | Main routes |
|------|--------|-------------|
| **Admin** | `/app/*` | Dashboard, orders, installations, calendar, profile, settings; admin: users, roles, reports, stores (Netsis config), integrations hub, audit |
| **Store manager** | `/app/*` | Same except admin-only pages; scoped to the user’s store |
| **Crew** | `/crew/*` | Home, jobs list, job detail, checklist (with photo upload), order view, settings |

### Public auth pages

- `/auth/login` — working login
- `/auth/forgot-password`, `/auth/reset-password` — UI only (no backend reset API wired)

### Placeholder routes (not implemented)

- `/app/orders/new` — create order in InstallOps (orders come from Netsis)
- `/app/admin/capacity` — capacity settings
- `/crew/jobs/:id/capture`, `/crew/jobs/:id/issues`, `/crew/issues` — dedicated capture/issues pages (photos are uploaded from the checklist flow)

## Implemented features

- **Orders** — browse aggregated installations as orders (`GET /orders`) or live Netsis ItemSlips (`GET /integrations/netsis/orders/search`) with load-more pagination; order detail with installations, timeline, and optional Netsis document/lines
- **Installations** — list, create (linked to Netsis `external_order_id`), detail, edit, status changes, crew assignment, media gallery, stage (`pending`/`scheduled` → `staged`)
- **Calendar** — month/week views of installations (no capacity rules)
- **Dashboards** — admin and manager KPI-style summaries from installation data
- **Reports** (admin) — filtered installation report table
- **Users / roles** (admin) — user CRUD, role assignment
- **Stores & Netsis** (admin) — per-store Netsis URL, paths, credentials, test connection
- **Audit log** (admin) — read-only audit viewer
- **Crew app** — responsive job list, start job (`staged` → `in_progress`), fixed checklist with required photos, completion outcomes (`completed`, `failed`, `after_sale_service`)
- **Media** — upload from crew checklist; view on installation detail
- **i18n** — English and Turkish; date display preference in settings
- **Command palette** — top-bar search in `AppShell`: navigate pages, run commands, help links (frontend-only; no API entity search)

## Not implemented

Do not expect these in the current codebase:

- Warehouse role, inventory, pick lists, stock allocation
- Creating customer orders inside InstallOps (`POST /orders` does not exist)
- Configurable checklist templates in the UI (backend CRUD exists; crew uses a built-in checklist)
- Offline queue / background sync / installable PWA (`stores/offline.ts` is unused)
- Crew job accept/decline UI (backend supports assignment status; no frontend wiring)
- Password reset API
- Automated test suite (Vitest is configured; no `*.test.*` / `*.spec.*` files yet)
- Docker image for the frontend repo

## Stack

- React 19, TypeScript, Vite
- React Router, TanStack Query, Zustand
- React Hook Form + Zod, Tailwind CSS, Lucide icons, react-i18next

## Getting started

```bash
git clone <repository-url>
cd installops-frontend
npm install
npm run dev
```

Open `http://localhost:5173` (or the port Vite prints). Point the API at your backend:

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

In production behind nginx, `/api/v1` on the same origin is typical.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build → `dist/` |
| `npm run build:check` | `tsc` then build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (no tests committed yet) |

## API usage

- Client: `src/api/*` (Axios, `withCredentials: true`)
- Session cookie `sid` after login — not JWT
- Netsis: `src/api/integrations.ts`; field reading helpers in `src/lib/netsis-native.ts`
- Configure Netsis per store under **Admin → Stores** (not the integrations hub alone)

## Project layout

```
src/
├── api/              # HTTP clients
├── components/       # UI (layout, CommandPalette, modals, …)
├── hooks/
├── lib/              # utils, netsis-native, media-url, date-display
├── locales/          # en / tr
├── pages/
│   ├── admin/
│   ├── auth/
│   ├── crew/
│   ├── manager/
│   └── shared/
├── stores/           # auth (Zustand)
└── App.tsx
```

## Deployment

```bash
npm ci
npm run build
# serve dist/ via nginx or rsync to /var/www/...
```

See `scripts/DEPLOY_SERVER.md` for a typical VPS update flow.

## Related docs

- Backend API and Netsis: `../installops-backend/README.md`, `../installops-backend/docs/NETSIS.md`
- Command palette design notes: `docs/command-palette-scope.md`
