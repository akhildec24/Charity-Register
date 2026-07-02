#!/bin/bash
set -euo pipefail

# ===== Configuration =====
SSH_KEY="$HOME/.ssh/id_ed25519"
SSH_USER="coded-charityregister"
SSH_HOST="85.190.246.11"
REMOTE_DIR="/home/coded-charityregister/htdocs/charityregister.coded.gdn"
APP_PORT="3064"
DOMAIN="charityregister.coded.gdn"
ADMIN_TOKEN="ebe6945da4890e5ca6b68e8f6d423825328244459888901cf16260209db0a27a"

LOCAL_PORT="3001"

SSH_BASE="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new"
SSH_CMD="$SSH_BASE $SSH_USER@$SSH_HOST"

# NVM must be sourced on the remote side
REMOTE_PREFIX="export NVM_DIR=~/.nvm; source ~/.nvm/nvm.sh"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo "  Deploying Charity Register to VPS"
echo "  Domain: $DOMAIN"
echo "  Port: $APP_PORT"
echo "========================================="

# ===== Step 0: Export local DB to CSV =====
echo ""
echo "[0/5] Syncing local data..."

if curl -s "http://localhost:$LOCAL_PORT/api/stats" >/dev/null 2>&1; then
  echo "  Local server detected, exporting DB to CSV..."
  curl -s "http://localhost:$LOCAL_PORT/api/export-db" \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  echo ""
else
  echo "  Local server not running, skipping DB export."
  echo "  (Start local server to auto-export CSV before deploy)"
fi

# ===== Step 1: Build locally =====
echo ""
echo "[1/5] Building frontend locally..."
cd "$SCRIPT_DIR"
npm run build
echo "Build complete."

# ===== Step 2: Check SSH connectivity =====
echo ""
echo "[2/5] Checking SSH connection..."
if ! $SSH_CMD "echo OK" >/dev/null 2>&1; then
  echo "ERROR: Cannot connect via SSH. Check your key and network."
  exit 1
fi
echo "SSH connection OK."

# ===== Step 3: Sync files to VPS via rsync =====
echo ""
echo "[3/5] Syncing files to VPS..."
$SSH_CMD "mkdir -p $REMOTE_DIR"
rsync -avz --delete \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  --exclude='node_modules' \
  --exclude='data' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='deploy.sh' \
  "$SCRIPT_DIR/" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"
echo "Files synced."

# ===== Step 4: Install deps, create .env, restart PM2 =====
echo ""
echo "[4/5] Installing dependencies and restarting app..."
$SSH_CMD "$REMOTE_PREFIX; REMOTE_DIR='$REMOTE_DIR' APP_PORT='$APP_PORT' ADMIN_TOKEN='$ADMIN_TOKEN' bash -s" <<'REMOTE_SCRIPT'
export REMOTE_DIR APP_PORT ADMIN_TOKEN
cd "$REMOTE_DIR"

echo "Installing npm packages..."
npm install

echo "Creating .env..."
cat > "$REMOTE_DIR/.env" <<ENVEOF
PORT=$APP_PORT
ADMIN_TOKEN=$ADMIN_TOKEN
ENVEOF

pm2 delete charity-register 2>/dev/null || true

cat > "$REMOTE_DIR/ecosystem.config.cjs" <<ECOEOF
module.exports = {
  apps: [{
    name: 'charity-register',
    script: 'server/index.js',
    cwd: '$REMOTE_DIR',
    env: {
      PORT: '$APP_PORT',
      ADMIN_TOKEN: '$ADMIN_TOKEN'
    }
  }]
}
ECOEOF

pm2 start ecosystem.config.cjs
pm2 save
echo ""
echo "PM2 status:"
pm2 status
REMOTE_SCRIPT

# ===== Step 5: Re-import CSV to sync VPS database =====
echo ""
echo "[5/5] Syncing VPS database from CSV..."
sleep 2
IMPORT_RESULT=$($SSH_CMD "curl -s -X POST http://localhost:$APP_PORT/api/import -H 'Authorization: Bearer $ADMIN_TOKEN' -F 'file=@$REMOTE_DIR/public/charity-data.csv'")
echo "  Import: $IMPORT_RESULT"

# ===== Verify app is responding =====
sleep 2
$SSH_CMD "APP_PORT='$APP_PORT' bash -s" <<'REMOTE_SCRIPT'
export APP_PORT
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT/api/stats 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
  echo "App is running on port $APP_PORT — API responding OK"
  curl -s http://localhost:$APP_PORT/api/stats
  echo ""
else
  echo "WARNING: App not responding on port $APP_PORT (HTTP $RESPONSE)"
  echo "Check logs with: pm2 logs charity-register"
fi
REMOTE_SCRIPT

echo ""
echo "========================================="
echo "  Deployment complete!"
echo ""
echo "  App running on port $APP_PORT (localhost)"
echo "  Public URL: https://$DOMAIN"
echo "  (Nginx + SSL handled by your hosting panel)"
echo ""
echo "  Useful commands on the VPS:"
echo "    pm2 status                          # Check app status"
echo "    pm2 logs charity-register            # View logs"
echo "    pm2 restart charity-register         # Restart app"
echo "========================================="
