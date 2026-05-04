# Server update (InstallOps)

Adjust paths, branch names, and process manager (`pm2` / `systemd`) to match your host.

## 1. Backend API (Node)

```bash
cd /path/to/installops-backend/backend
git pull origin main
npm ci
# Apply new SQL (e.g. migration 006) — use your normal migration process, or once:
#   psql "$DATABASE_URL" -f db/migrations/006_stores_netsis_order_detail_paths.sql
sudo systemctl restart installops-api
# or: pm2 restart installops-api
```

Smoke test from the server (after logging in via browser once, or use a session cookie):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/v1/health
# Expect 200. Then GET /orders must exist (may be 401 without cookie — not 404):
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/v1/orders?limit=5
```

- **404** on `/api/v1/orders` → old code still running; confirm `git log -1` and restart the correct service.
- **401** on `/api/v1/orders` → route exists; auth is required (expected).

## 2. Nginx (proxy `/api/` before SPA)

```bash
sudo cp /path/to/installops-frontend/scripts/nginx-installops-frontend.conf /etc/nginx/sites-available/installops-frontend.conf
sudo nginx -t && sudo systemctl reload nginx
```

## 3. Frontend (Vite build)

```bash
cd /path/to/installops-frontend
git pull origin main
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/installops-frontend/dist/
```

Ensure production env includes API base (usually same-origin):

```bash
# In repo .env.production or CI env:
# VITE_API_BASE_URL=/api/v1
```

## 4. One-line checks (HTTPS)

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://YOUR_DOMAIN/api/v1/health
curl -sS -o /dev/null -w "%{http_code}\n" https://YOUR_DOMAIN/api/v1/orders?limit=1
```
