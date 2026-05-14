# Server update (InstallOps)

Adjust paths, branch names, and service names to match your host.

## 1. Backend API (Node)

```bash
cd /opt/installops-backend   # or your clone path
git pull origin main
npm ci
# Apply any new SQL under db/migrations/ if you use them on existing DBs
sudo systemctl restart installops-backend
# or: pm2 restart installops-backend
```

Smoke test:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/v1/health
# Expect 200. GET /orders without cookie → 401 (route exists), not 404:
curl -sS -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:8000/api/v1/orders?limit=5"
```

- **404** on `/api/v1/orders` → old code or wrong service; check `git log -1` and restart.
- **401** → expected without session cookie.

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

Production env (same-origin API):

```bash
# .env.production or build-time env
VITE_API_BASE_URL=/api/v1
```

## 4. HTTPS checks

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://YOUR_DOMAIN/api/v1/health
curl -sS -o /dev/null -w "%{http_code}\n" "https://YOUR_DOMAIN/api/v1/orders?limit=1"
```
