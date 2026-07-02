import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import multer from 'multer'
import Papa from 'papaparse'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import {
  searchCharities,
  getCharityByKey,
  getUniqueValues,
  getTotalCount,
  toggleFavorite,
  getFavoriteKeys,
  getFavoriteCount,
} from './queries.js'
import { importRows } from './import.js'
import { writeFileSync } from 'fs'
import { randomBytes } from 'crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer, validateApiKey, checkRateLimit } from './mcp.js'
import { getDb } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const CSV_PATH = join(__dirname, '..', 'public', 'charity-data.csv')

// Ensure data directory exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

// Initialize DB (creates schema)
getDb()

// Seed from CSV if database is empty
const db = getDb()
const count = db.prepare('SELECT COUNT(*) as total FROM charities').get().total
if (count === 0 && existsSync(CSV_PATH)) {
  console.log('Database empty — seeding from CSV...')
  const csvText = readFileSync(CSV_PATH, 'utf-8')
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  const stats = importRows(result.data)
  console.log(`Seeded ${stats.newCount} charities (new: ${stats.newCount}, updated: ${stats.updatedCount}, dup: ${stats.duplicateCount})`)
}

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
})

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
}))
app.use(cors())

// Parse JSON for all routes EXCEPT MCP POST (transport handles its own body)
app.use((req, res, next) => {
  if (req.path === '/mcp' && req.method === 'POST') {
    return next()
  }
  express.json({ limit: '10mb' })(req, res, next)
})

// Search & filter
app.get('/api/charities', (req, res) => {
  const {
    search = '',
    sortBy = 'name',
    limit: limitStr = '50',
    offset: offsetStr = '0',
    ...filterParams
  } = req.query

  const filters = {}

  // Parse array filters
  for (const key of ['status', 'type', 'whatDoes']) {
    if (filterParams[key]) {
      filters[key] = Array.isArray(filterParams[key]) ? filterParams[key] : filterParams[key].split(',')
    }
  }

  // Parse scalar filters
  filters.incomeMin = filterParams.incomeMin || null
  filters.incomeMax = filterParams.incomeMax || null
  filters.constituency = filterParams.constituency || null
  filters.favoritesOnly = filterParams.favoritesOnly === 'true'

  // Parse field filters
  for (const key of ['field_website', 'field_email', 'field_phone', 'field_income', 'field_postcode', 'field_address']) {
    if (filterParams[key]) filters[key] = filterParams[key]
  }

  const limit = Math.min(parseInt(limitStr) || 50, 500)
  const offset = parseInt(offsetStr) || 0

  const result = searchCharities({ search, filters, sortBy, limit, offset })
  res.json(result)
})

// Get single charity
app.get('/api/charities/:key', (req, res) => {
  const charity = getCharityByKey(req.params.key)
  if (!charity) return res.status(404).json({ error: 'Not found' })
  res.json(charity)
})

// Get filter options
app.get('/api/filters/:field', (req, res) => {
  const values = getUniqueValues(req.params.field)
  res.json(values)
})

// Get total count
app.get('/api/stats', (req, res) => {
  res.json({
    total: getTotalCount(),
    favorites: getFavoriteCount(),
  })
})

// Import CSV (admin only — requires ADMIN_TOKEN env var)
app.post('/api/import', upload.single('file'), (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken) {
    return res.status(403).json({ error: 'Import is disabled. Set ADMIN_TOKEN on the server to enable.' })
  }
  const provided = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.token
  if (provided !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const csvText = req.file.buffer.toString('utf-8')
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true })

  if (result.errors.length > 0) {
    console.warn('CSV parse warnings:', result.errors.slice(0, 5))
  }

  const stats = importRows(result.data)

  // Auto-export DB to seed CSV so data persists across redeploys
  try {
    exportDbToCsv()
    console.log('Seed CSV updated after import')
  } catch (e) {
    console.warn('Failed to update seed CSV:', e.message)
  }

  res.json({
    message: `Imported ${stats.newCount} new, ${stats.updatedCount} updated, ${stats.duplicateCount} duplicates skipped.`,
    ...stats,
  })
})

// Export DB to CSV (admin only)
function exportDbToCsv() {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM charities ORDER BY name ASC').all()
  const headers = [
    'Charity Number','Charity Subsidiary Number','Charity Name','Charity Address',
    'Charity Postcode','Charity Constituency','Phone','Email','Website',
    'Last Recorded Financial Year','Last Recorded Income','Last Recorded Expenditure',
    'Charity Status','Charity Type','How the charity helps','What the charity does',
    'Who the charity helps','Activities','Charity Objects'
  ]
  const esc = v => {
    if (v == null) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push([
      r.charity_number, r.subsidiary_number, r.name, r.address,
      r.postcode, r.constituency, r.phone, r.email, r.website,
      r.financial_year, r.income, r.expenditure,
      r.status, r.type, r.how_helps, r.what_does,
      r.who_helps, r.activities, r.objects
    ].map(esc).join(','))
  }
  writeFileSync(CSV_PATH, lines.join('\n'))
  return rows.length
}

app.get('/api/export-db', (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken) {
    return res.status(403).json({ error: 'Export is disabled. Set ADMIN_TOKEN on the server.' })
  }
  const provided = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.token
  if (provided !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const count = exportDbToCsv()
  res.json({ message: `Exported ${count} charities to CSV.`, count })
})

// Favorites
app.get('/api/favorites', (req, res) => {
  res.json({ keys: getFavoriteKeys() })
})

app.post('/api/favorites/:key', (req, res) => {
  const isFav = toggleFavorite(req.params.key)
  res.json({ isFavorite: isFav })
})

// ===== API Key Management =====

function generateApiKey() {
  const key = 'mcp_' + randomBytes(24).toString('hex')
  const db = getDb()
  db.prepare("INSERT INTO api_keys (key, label, created_at) VALUES (?, ?, datetime('now'))").run(key, 'Generated via /mcp page')
  return key
}

function listApiKeys() {
  const db = getDb()
  return db.prepare('SELECT key, label, created_at, last_used_at, revoked FROM api_keys ORDER BY created_at DESC').all()
}

function revokeApiKey(key) {
  const db = getDb()
  db.prepare('UPDATE api_keys SET revoked = 1 WHERE key = ?').run(key)
}

// ===== MCP Info Page (server-rendered fallback) =====

app.get('/mcp/keys', (req, res) => {
  const keys = listApiKeys().map(k => ({
    ...k,
    key: k.revoked ? k.key.slice(0, 16) + '••••' : k.key,
  }))
  res.json({ keys })
})

app.get('/mcp', (req, res) => {
  const keys = listApiKeys().filter(k => !k.revoked)
  const allKeys = listApiKeys()
  const host = req.get('host') || `localhost:${PORT}`
  const protocol = req.protocol || 'http'
  const baseUrl = `${protocol}://${host}`

  res.setHeader('Content-Type', 'text/html')
  res.send(renderMcpPage(baseUrl, keys, allKeys))
})

app.post('/mcp/generate-key', (req, res) => {
  const db = getDb()
  const keyCount = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE revoked = 0').get().count
  if (keyCount >= 50) {
    return res.status(429).json({ error: 'Too many active keys. Revoke some before generating new ones.' })
  }
  const key = generateApiKey()
  res.json({ key })
})

app.post('/mcp/revoke-key', (req, res) => {
  const { key } = req.body || {}
  if (!key) return res.status(400).json({ error: 'Key required' })
  revokeApiKey(key)
  res.json({ success: true })
})

// ===== MCP HTTP Endpoint =====

app.post('/mcp', async (req, res) => {
  const authHeader = req.headers.authorization || ''
  const apiKey = authHeader.replace(/^Bearer\s+/i, '')

  if (!validateApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid or missing API key. Get one at /mcp' })
  }

  if (!checkRateLimit(apiKey)) {
    return res.status(429).json({ error: 'Rate limit exceeded (60 requests/minute). Try again shortly.' })
  }

  try {
    // Parse body manually since we skip express.json for /mcp
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
      if (Buffer.concat(chunks).length > 1024 * 1024) {
        return res.status(413).json({ error: 'Request body too large' })
      }
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'))

    const mcpServer = createMcpServer()
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    await mcpServer.connect(transport)
    await transport.handleRequest(req, res, body)
  } catch (err) {
    console.error('MCP error:', err)
    res.status(500).json({ error: 'MCP server error' })
  }
})

// ===== MCP Page HTML =====

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderMcpPage(baseUrl, activeKeys, allKeys) {
  const totalCharities = getTotalCount()
  const keyRows = allKeys.map(k => `
    <tr class="${k.revoked ? 'revoked' : ''}">
      <td><code>${k.revoked ? escapeHtml(k.key.slice(0, 12)) + '&bull;&bull;&bull;&bull;' : escapeHtml(k.key)}</code></td>
      <td>${escapeHtml(k.label || '—')}</td>
      <td>${escapeHtml(k.created_at)}</td>
      <td>${escapeHtml(k.last_used_at || 'Never')}</td>
      <td>${k.revoked ? '<span class="badge revoked">Revoked</span>' : '<button class="revoke-btn" data-key="' + escapeHtml(k.key) + '">Revoke</button>'}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Charity Register — MCP Server</title>
<style>
  :root {
    --bg: #f5f5f3; --surface: #ffffff; --ink: #1a1a1a; --ink2: #555; --ink3: #999;
    --border: #e0ddd5; --yellow: #e8b820; --yellow-bg: #fff8e1; --red: #c8202d;
    --radius: 4px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--ink); line-height: 1.6; }
  .container { max-width: 760px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  h2 { font-size: 20px; margin: 32px 0 12px; }
  h3 { font-size: 16px; margin: 20px 0 8px; }
  p { color: var(--ink2); margin-bottom: 12px; }
  code { font-family: 'SF Mono', Monaco, monospace; font-size: 13px; background: var(--surface); padding: 2px 6px; border-radius: 3px; border: 1px solid var(--border); }
  pre { background: var(--ink); color: #e0e0e0; padding: 16px; border-radius: var(--radius); overflow-x: auto; font-size: 13px; line-height: 1.5; margin: 12px 0; }
  pre code { background: none; border: none; color: inherit; padding: 0; }
  .stat { display: inline-block; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 20px; margin: 4px 8px 4px 0; }
  .stat strong { display: block; font-size: 24px; }
  .stat span { font-size: 13px; color: var(--ink3); }
  .tool { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; margin: 8px 0; }
  .tool h3 { margin: 0 0 4px; font-family: 'SF Mono', Monaco, monospace; font-size: 14px; color: var(--yellow); }
  .tool p { margin: 0; font-size: 14px; }
  .tool ul { margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: var(--ink2); }
  .tool li { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { text-align: left; padding: 8px 10px; border-bottom: 2px solid var(--border); color: var(--ink3); text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
  td { padding: 8px 10px; border-bottom: 1px solid var(--border); }
  tr.revoked td { opacity: 0.5; }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 100px; }
  .badge.revoked { background: #fce8e8; color: var(--red); }
  .btn { display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 100px; border: none; cursor: pointer; transition: all 150ms; }
  .btn-primary { background: linear-gradient(180deg, #f0c414, #d4a800); color: #1a1a1a; }
  .btn-primary:hover { background: linear-gradient(180deg, #f5d028, #e0b200); }
  .revoke-btn { font-size: 12px; padding: 4px 12px; background: #fce8e8; color: var(--red); border: 1px solid rgba(200,32,45,0.2); border-radius: 100px; cursor: pointer; }
  .revoke-btn:hover { background: #f8d0d0; }
  .new-key-box { background: var(--yellow-bg); border: 1px solid rgba(232,184,32,0.3); border-radius: var(--radius); padding: 16px; margin: 12px 0; }
  .new-key-box code { font-size: 14px; word-break: break-all; }
  .copy-btn { font-size: 12px; padding: 4px 12px; background: var(--ink); color: #fff; border: none; border-radius: 100px; cursor: pointer; margin-left: 8px; }
  .note { font-size: 13px; color: var(--ink3); font-style: italic; }
  .config-block { margin: 12px 0; }
</style>
</head>
<body>
<div class="container">
  <h1>Charity Register — MCP Server</h1>
  <p>Connect your AI agent (Claude, Cursor, Windsurf, etc.) to ${totalCharities.toLocaleString('en-GB')} UK charity records via the Model Context Protocol.</p>

  <div style="margin: 20px 0;">
    <div class="stat"><strong>${totalCharities.toLocaleString('en-GB')}</strong><span>Total Charities</span></div>
    <div class="stat"><strong>4</strong><span>MCP Tools</span></div>
    <div class="stat"><strong>60/min</strong><span>Rate Limit</span></div>
  </div>

  <h2>Available Tools</h2>
  <div class="tool">
    <h3>search_charities</h3>
    <p>Full-text search across the charity register.</p>
    <ul>
      <li><code>query</code> — search text (name, address, activities, objects)</li>
      <li><code>status</code> — filter by status (optional)</li>
      <li><code>type</code> — filter by charity type (optional)</li>
      <li><code>constituency</code> — partial match (optional)</li>
      <li><code>has_website</code> / <code>has_email</code> / <code>has_phone</code> — boolean filters (optional)</li>
      <li><code>min_income</code> / <code>max_income</code> — income range in pounds (optional)</li>
      <li><code>limit</code> — max results (default 20, max 100)</li>
    </ul>
  </div>
  <div class="tool">
    <h3>get_charity</h3>
    <p>Get full details for a specific charity.</p>
    <ul>
      <li><code>charity_number</code> — registration number</li>
      <li><code>subsidiary_number</code> — optional (default 0)</li>
    </ul>
  </div>
  <div class="tool">
    <h3>get_charity_stats</h3>
    <p>Summary statistics — total count, favorites, breakdowns by status and type.</p>
  </div>
  <div class="tool">
    <h3>list_filter_options</h3>
    <p>List available filter values with counts.</p>
    <ul>
      <li><code>field</code> — one of: <code>status</code>, <code>type</code>, <code>whatDoes</code></li>
    </ul>
  </div>

  <h2>API Keys</h2>
  <p>Generate a key below, then copy it into your AI agent's MCP configuration. Keys are free and rate-limited to 60 requests/minute.</p>

  <div id="new-key-container"></div>

  <button class="btn btn-primary" id="generate-btn" onclick="generateKey()">Generate New Key</button>

  ${allKeys.length > 0 ? `
  <h3>Existing Keys</h3>
  <table>
    <thead><tr><th>Key</th><th>Label</th><th>Created</th><th>Last Used</th><th>Action</th></tr></thead>
    <tbody>${keyRows}</tbody>
  </table>
  ` : '<p class="note">No keys yet. Generate one to get started.</p>'}

  <h2>Setup Instructions</h2>
  <p>Add this to your AI agent's MCP configuration file:</p>

  <div class="config-block">
    <h3>Cursor / Windsurf (mcp_config.json)</h3>
<pre><code>{
  "mcpServers": {
    "charity-register": {
      "url": "${baseUrl}/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}</code></pre>
  </div>

  <div class="config-block">
    <h3>Claude Desktop (claude_desktop_config.json)</h3>
<pre><code>{
  "mcpServers": {
    "charity-register": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${baseUrl}/mcp"],
      "env": {
        "MCP_REMOTE_AUTH_HEADER": "Bearer YOUR_API_KEY"
      }
    }
  }
}</code></pre>
  </div>

  <p class="note">Replace <code>YOUR_API_KEY</code> with a key generated above.</p>

  <h2>Rate Limiting</h2>
  <p>Each API key is limited to <strong>60 requests per minute</strong>. This is per-key, so generating a new key gives a fresh budget. If you hit the limit, wait 60 seconds and try again.</p>

  <h2>Privacy</h2>
  <p>This page is publicly readable so anyone can set up MCP access. Keys can be revoked at any time. The underlying charity data is publicly available from the UK Charity Commission.</p>
</div>

<script>
  async function generateKey() {
    const btn = document.getElementById('generate-btn')
    btn.disabled = true
    btn.textContent = 'Generating…'
    try {
      const res = await fetch('/mcp/generate-key', { method: 'POST' })
      const data = await res.json()
      const container = document.getElementById('new-key-container')
      container.innerHTML = '<div class="new-key-box"><strong>Your new API key:</strong><br><br><code>' + data.key + '</code><button class="copy-btn" onclick="copyKey(\'' + data.key + '\')">Copy</button><br><br><span class="note">Save this key now. You can revoke it later but cannot recover it if lost.</span></div>'
      btn.textContent = 'Generate Another Key'
      btn.disabled = false
    } catch (e) {
      btn.textContent = 'Failed — try again'
      btn.disabled = false
    }
  }

  function copyKey(key) {
    navigator.clipboard.writeText(key)
    event.target.textContent = 'Copied!'
    setTimeout(() => event.target.textContent = 'Copy', 2000)
  }

  document.querySelectorAll('.revoke-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Revoke this key? AI agents using it will lose access immediately.')) return
      const key = btn.dataset.key
      await fetch('/mcp/revoke-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) })
      btn.closest('tr').classList.add('revoked')
      btn.outerHTML = '<span class="badge revoked">Revoked</span>'
    })
  })
</script>
</body>
</html>`
}

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Serve static files in production
const distPath = join(__dirname, '..', 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^\/(?!api|mcp).*/, (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
