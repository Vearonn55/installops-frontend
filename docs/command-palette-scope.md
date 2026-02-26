# Command palette / VS Code–style search — scope (frontend vs backend)

## Current state

- **AppShell** (manager/admin layout) has a **global search bar** in the top bar. It is currently **non-functional**: a plain `<input type="search">` with `action="#"`, no handler, no state.
- **Per-page search** already exists on several screens (Users, Orders, Installations, Audit, Roles, Crew jobs). Those inputs filter **that page’s list** and often call the **backend** (e.g. `?q=...` or `search` param). So “search on this page” is already a **frontend + backend** feature where the backend provides the data.

Goal: make the **global** search behave like **VS Code** (quick open / command palette): one place to search, run commands, open pages, and (optionally) open help.

---

## Is it frontend or backend?

### Mostly **frontend** (no backend changes needed for core experience)

A VS Code–style experience can be implemented **entirely in the frontend** for:

| What | Description | Backend? |
|------|-------------|----------|
| **UI** | Modal/overlay, input, keyboard shortcut (e.g. `Ctrl+K` / `Cmd+K`), list with keyboard nav | No |
| **“Go to page”** | List of app routes (Dashboard, Orders, Installations, Calendar, Users, Audit, etc.); fuzzy filter by label; on select → `navigate(path)` | No — routes and labels are known in the app |
| **Commands** | List of actions: “New order”, “New installation”, “Sign out”, “Open settings”, etc.; on select → run action | No — actions are client-side |
| **Help** | Links like “Help centre”, “Documentation”, “Keyboard shortcuts”; on select → open URL or in-app help | No — static links or in-app content |
| **Filtering** | Fuzzy search over the above list (e.g. “ord” → Orders, “new inst” → New installation) | No — filter a static list in memory |

So: **search bar = command palette** with **navigation + commands + help** is a **frontend-only** feature. The “data” is the app’s routes, command definitions, and help links — all known at build time.

### When **backend** is needed

Backend only comes in if you want the palette to **search server-side data**:

| What | Description | Backend? |
|------|-------------|----------|
| **Search entities** | User types “order #123” or “customer Acme” and sees **API results** (orders, customers, installations) in the palette; selecting one opens the detail page | Yes — existing or new search/list endpoints (e.g. orders?q=, customers?q=, installations?q=) |
| **Recent / suggestions** | “Recent orders”, “Recently viewed installations” in the palette | Optional — can be frontend-only (e.g. localStorage) or backend (e.g. “recent” API) |
| **Help search** | Search inside help articles / docs | Yes if you have a help API; otherwise frontend can link to static docs |

So:

- **Phase 1 (recommended):** Command palette **frontend-only** — go to page, run commands, help links. No backend work.
- **Phase 2 (optional):** Add “Search orders / customers / installations” that **calls existing (or new) API** and shows results in the same palette; then backend is involved only for that search.

---

## Recommended scope for “first integrate”

1. **Frontend-only**
   - Replace the current dead search bar with a **command palette** that opens on:
     - Click/focus on the search bar, or
     - Shortcut (e.g. `Ctrl+K` / `Cmd+K`).
   - **Contents (static list):**
     - **Pages:** Dashboard, Orders, Installations, Calendar, Users, Audit, Reports, etc. (based on role).
     - **Commands:** e.g. “New order”, “New installation”, “Settings”, “Sign out”.
     - **Help:** e.g. “Help centre”, “Keyboard shortcuts” (link or in-app).
   - **Behaviour:** Type to fuzzy-filter; arrow keys + Enter to select; select = navigate or run command. No API calls.
2. **Later (optional)**  
   - Add a section or mode “Search orders / customers / installations” that uses your **existing** list/search APIs and shows results in the same palette (then we wire backend where those endpoints already exist).

If you confirm this frontend-first scope, next step is to implement the palette UI and the static list (routes + commands + help) in the frontend, then optionally add API-backed search in a second step.
