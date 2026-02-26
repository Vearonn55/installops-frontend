#!/bin/bash
#
# Rebuild and deploy the frontend on the VDS after git pull.
# Run from repo root: ./scripts/deploy-frontend.sh
# Or: bash scripts/deploy-frontend.sh
#
set -e
cd "$(dirname "$0")/.."
echo "Installing dependencies..."
npm ci
echo "Building frontend..."
npm run build
echo "Done. Frontend built to dist/. Nginx serves from dist/ — users get the new version on next load."
echo "Optional: sudo systemctl reload nginx"
