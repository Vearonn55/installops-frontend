# Command palette — scope and status

## Current state (implemented)

`AppShell` uses `CommandPalette` (`src/components/CommandPalette.tsx`): an inline top-bar search with a dropdown.

- **Pages** — navigation items from the sidebar (role-filtered); select → `navigate(path)`
- **Commands** — e.g. new installation, profile, settings, sign out (role-dependent; “new order” links to `/app/orders/new`, which is still a placeholder page)
- **Help** — help centre and keyboard shortcuts → `/app/coming-soon` with a feature key

Filtering is client-side over the static item list. **No API calls** for entity search.

i18n: `commandPalette.*` in `src/locales/en/common.ts` and `tr/common.ts`.

## Frontend vs backend

| Capability | Backend needed? |
|------------|-----------------|
| Go to page, run client commands, static help links | **No** — done |
| Search orders / customers / installations in the palette | **Yes** — would use existing list/search APIs (not built) |
| Recent items | Optional — `localStorage` or a future API |

## Possible phase 2

Add a palette section that queries `GET /orders`, `GET /installations`, or Netsis search when the user types an order id — reusing endpoints the manager UI already calls. Not implemented today.
