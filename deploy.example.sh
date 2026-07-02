#!/bin/bash
set -euo pipefail

# ===== Configuration =====
SSH_KEY="$HOME/.ssh/id_ed25519"
SSH_USER="your-ssh-user"
SSH_HOST="your-vps-ip"
REMOTE_DIR="/home/your-user/htdocs/your-domain.com"
APP_PORT="3064"
DOMAIN="your-domain.com"
REPO_URL="https://github.com/your-username/your-repo.git"
ADMIN_TOKEN="your-admin-token-here"

SSH_BASE="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new"
SSH_CMD="$SSH_BASE $SSH_USER@$SSH_HOST"

# NVM must be sourced on the remote side
REMOTE_PREFIX="export NVM_DIR=~/.nvm; source ~/.nvm/nvm.sh"

echo "========================================="
echo "  Deploying Charity Register to VPS"
echo "  Domain: $DOMAIN"
echo "  Port: $APP_PORT"
echo "========================================="

# ===== Step 1: Check SSH connectivity =====
echo ""
echo "[1/6] Checking SSH connection..."
if ! $SSH_CMD "echo OK" >/dev/null 2>&1; then
  echo "ERROR: Cannot connect via SSH. Check your key and network."
  exit 1
fi
echo "SSH connection OK."

# ===== Step 2: Verify Node.js and install PM2 =====
echo ""
echo "[2/6] Verifying Node.js and PM2..."
$SSH_CMD "$REMOTE_PREFIX; bash -s" <<'REMOTE_SCRIPT'
echo "Node version: $(node -v 2>/dev/null || echo 'NOT FOUND')"
echo "npm version: $(npm -v 2>/dev/null || echo 'NOT FOUND')"

if ! command -v pm2 &>/dev/null; then
  echo "Installing PM2..."
  npm install -g pm2
fi
echo "PM2 version: $(pm2 -v 2>/dev/null || echo 'NOT FOUND')"
REMOTE_SCRIPT

# ===== Step 3: Clone or pull the repo =====
echo ""
echo "[3/6] Cloning/updating repository..."
$SSH_CMD "REMOTE_DIR='$REMOTE_DIR' REPO_URL='$REPO_URL' bash -s" <<'REMOTE_SCRIPT'
export REMOTE_DIR REPO_URL
mkdir -p "$(dirname "$REMOTE_DIR")"
if [ -d "$REMOTE_DIR/.git" ]; then
  echo "Repo exists, pulling latest..."
  cd "$REMOTE_DIR"
  git pull origin main
else
  echo "Cloning repo..."
  rm -rf "$REMOTE_DIR"
  git clone "$REPO_URL" "$REMOTE_DIR"
fi
REMOTE_SCRIPT

# ===== Step 4: Install deps, create .env, build =====
echo ""
echo "[4/6] Installing dependencies and building..."
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

echo "Building frontend..."
npm run build
REMOTE_SCRIPT

# ===== Step 5: Start/restart with PM2 =====
echo ""
echo "[5/6] Starting/restarting app with PM2..."
$SSH_CMD "$REMOTE_PREFIX; REMOTE_DIR='$REMOTE_DIR' APP_PORT='$APP_PORT' ADMIN_TOKEN='$ADMIN_TOKEN' bash -s" <<'REMOTE_SCRIPT'
export REMOTE_DIR APP_PORT ADMIN_TOKEN
cd "$REMOTE_DIR"
pm2 delete charity-register 2>/dev/null || true

# Create PM2 ecosystem config with env vars
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

# ===== Step 6: Verify app is responding =====
echo ""
echo "[6/6] Verifying app is responding..."
sleep 3
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
