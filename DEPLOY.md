# Deployment Guide — VPS (Express + SQLite)

## Prerequisites
- Node.js 20+ on your VPS
- The CSV file at `public/charity-data.csv`

## Steps

### 1. Upload the project to your VPS
```bash
scp -r charity-info-parser user@your-vps:/var/www/
ssh user@your-vps
cd /var/www/charity-info-parser
```

### 2. Install dependencies
```bash
npm install
```

### 3. Build the React frontend
```bash
npm run build
```

### 4. Start the server
```bash
# Set ADMIN_TOKEN to protect CSV import (required for import to work)
export ADMIN_TOKEN="$(openssl rand -hex 32)"

# The server serves both the API and the built frontend
npm start
# or with a process manager:
ADMIN_TOKEN="your-secret-token" pm2 start server/index.js --name charity-register
```

The app will be available at `http://your-vps-ip:3001`

### 5. (Optional) Set up Nginx reverse proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # MCP endpoint needs streaming support (no buffering)
    location /mcp {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then add SSL with certbot:
```bash
sudo certbot --nginx -d your-domain.com
```

## MCP Server

The app includes a built-in MCP server for AI agent integration. After deployment:

1. Visit `https://your-domain.com/#/mcp` (or click the `?` icon in the header → MCP Server)
2. Generate an API key
3. Copy the setup config for your AI agent (Cursor, Windsurf, Claude Desktop)

The MCP endpoint is at `https://your-domain.com/mcp` and requires a Bearer token:
```
Authorization: Bearer mcp_yourkeyhere
```

### Rate limiting
- 60 requests/minute per API key
- Rate limits are in-memory and reset on server restart

### Key management
- Keys are stored in the SQLite database
- Generate/revoke from the in-app MCP page
- Revoked keys are permanently disabled

## Data Management

### The database
- SQLite database is stored at `data/charities.db`
- On first run, it auto-seeds from `public/charity-data.csv`
- To re-seed, delete `data/charities.db` and restart the server

### Importing new CSVs
- Use the "Import CSV" button in the app UI (requires admin token)
- Or POST a file to `/api/import` with `Authorization: Bearer YOUR_ADMIN_TOKEN` header
- Import is **disabled by default** — you must set `ADMIN_TOKEN` env var to enable it

### Backups
```bash
cp data/charities.db data/charities-backup-$(date +%Y%m%d).db
```

## Environment Variables
- `PORT` — server port (default: 3001)
- `ADMIN_TOKEN` — secret token required for CSV import (if not set, import is disabled)
