# VDS server upgrade guide

Upgrading the **OS** (Ubuntu) or **Node.js** on your VDS. Run as `root` or with `sudo`.

---

## 1. Ubuntu (OS) upgrade

**Minor updates (security/patches, same release):**
```bash
sudo apt update
sudo apt upgrade -y
sudo reboot   # if kernel or critical packages were updated
```

**Major release upgrade (e.g. 22.04 → 24.04):**
```bash
# Backup first (see below). Then:
sudo apt update
sudo apt upgrade -y
sudo do-release-upgrade    # interactive; follow prompts
# Reboot when it asks
```

**Before a major upgrade:**
- Backup app data, DBs, and configs (`/var/www`, `/etc/nginx`, etc.).
- Note: Major upgrades can break Node/nginx; reinstall or fix configs after.

---

## 2. Node.js upgrade

Your backend runs on Node (port 8000). To install a newer Node version on Ubuntu:

**Option A – NodeSource (recommended):**
```bash
# Replace 22 with desired major version (20, 22, 23, etc.)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

**Option B – nvm (per-user, no sudo):**
```bash
# As the user that runs the app (e.g. root or deploy user)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc   # or reopen shell
nvm install 22
nvm use 22
nvm alias default 22
node -v
```

**After upgrading Node:**
```bash
cd /var/www/installops-frontend   # or your backend path
npm ci
# Restart the Node process (PM2, systemd, or whatever you use)
```

---

## 3. nginx upgrade

```bash
sudo apt update
sudo apt install --only-upgrade nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Quick checklist

| Goal              | Commands |
|-------------------|----------|
| OS security fixes | `sudo apt update && sudo apt upgrade -y` |
| OS major upgrade  | Backup → `sudo do-release-upgrade` |
| New Node major    | NodeSource or nvm → reinstall deps → restart app |
| nginx update      | `sudo apt install --only-upgrade nginx` |

Always run `nginx -t` after nginx changes and restart your Node app after Node/dependency changes.
