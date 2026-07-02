import { useState, useEffect } from 'react'

export default function McpInfo() {
  const [keys, setKeys] = useState([])
  const [newKey, setNewKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, favorites: 0 })

  const baseUrl = window.location.origin

  useEffect(() => {
    refreshKeys()
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  const refreshKeys = async () => {
    try {
      const res = await fetch('/mcp/keys')
      const data = await res.json()
      setKeys(data.keys || [])
    } catch {}
    setLoading(false)
  }

  const generateKey = async () => {
    try {
      const res = await fetch('/mcp/generate-key', { method: 'POST' })
      const data = await res.json()
      setNewKey(data.key)
      refreshKeys()
    } catch {}
  }

  const revokeKey = async (key) => {
    if (!confirm('Revoke this key? AI agents using it will lose access immediately.')) return
    await fetch('/mcp/revoke-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    refreshKeys()
  }

  const copyKey = (key, e) => {
    navigator.clipboard.writeText(key)
    e.target.textContent = 'Copied!'
    setTimeout(() => { e.target.textContent = 'Copy' }, 2000)
  }

  return (
    <div className="info-page">
      <div className="info-page-content">
        <h1>MCP Server</h1>
        <p>
          Connect your AI agent (Claude, Cursor, Windsurf, etc.) to {stats.total.toLocaleString('en-GB')} UK charity records via the Model Context Protocol.
        </p>

        <div className="mcp-stats">
          <div className="mcp-stat"><strong>{stats.total.toLocaleString('en-GB')}</strong><span>Total Charities</span></div>
          <div className="mcp-stat"><strong>4</strong><span>MCP Tools</span></div>
          <div className="mcp-stat"><strong>60/min</strong><span>Rate Limit</span></div>
        </div>

        <h2>Available Tools</h2>
        <div className="mcp-tool">
          <h3>search_charities</h3>
          <p>Full-text search across the charity register.</p>
          <ul>
            <li><code>query</code> — search text (name, address, activities, objects)</li>
            <li><code>status</code> — filter by status (optional)</li>
            <li><code>type</code> — filter by charity type (optional)</li>
            <li><code>constituency</code> — partial match (optional)</li>
            <li><code>has_website</code> / <code>has_email</code> / <code>has_phone</code> — boolean filters</li>
            <li><code>min_income</code> / <code>max_income</code> — income range in pounds</li>
            <li><code>limit</code> — max results (default 20, max 100)</li>
          </ul>
        </div>
        <div className="mcp-tool">
          <h3>get_charity</h3>
          <p>Get full details for a specific charity.</p>
          <ul>
            <li><code>charity_number</code> — registration number</li>
            <li><code>subsidiary_number</code> — optional (default 0)</li>
          </ul>
        </div>
        <div className="mcp-tool">
          <h3>get_charity_stats</h3>
          <p>Summary statistics — total count, favorites, breakdowns by status and type.</p>
        </div>
        <div className="mcp-tool">
          <h3>list_filter_options</h3>
          <p>List available filter values with counts.</p>
          <ul>
            <li><code>field</code> — one of: <code>status</code>, <code>type</code>, <code>whatDoes</code></li>
          </ul>
        </div>

        <h2>API Keys</h2>
        <p>Generate a key, then copy it into your AI agent's MCP configuration. Keys are rate-limited to 60 requests/minute.</p>

        {newKey && (
          <div className="mcp-new-key">
            <strong>Your new API key:</strong>
            <div className="mcp-key-display">
              <code>{newKey}</code>
              <button className="mcp-copy-btn" onClick={(e) => copyKey(newKey, e)}>Copy</button>
            </div>
            <p className="info-note">Save this key now. You can revoke it later but cannot recover it if lost.</p>
          </div>
        )}

        <button className="mcp-generate-btn" onClick={generateKey}>Generate New Key</button>

        {keys.length > 0 && (
          <>
            <h3>Existing Keys</h3>
            <table className="mcp-key-table">
              <thead>
                <tr><th>Key</th><th>Created</th><th>Last Used</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.key} className={k.revoked ? 'revoked' : ''}>
                    <td><code>{k.revoked ? k.key.slice(0, 16) + '••••' : k.key}</code></td>
                    <td>{k.created_at}</td>
                    <td>{k.last_used_at || 'Never'}</td>
                    <td>{k.revoked ? 'Revoked' : 'Active'}</td>
                    <td>{!k.revoked && <button className="mcp-revoke-btn" onClick={() => revokeKey(k.key)}>Revoke</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {loading && <p className="info-note">Loading keys…</p>}
        {!loading && keys.length === 0 && !newKey && <p className="info-note">No keys yet. Generate one to get started.</p>}

        <h2>Setup Instructions</h2>
        <p>Add this to your AI agent's MCP configuration file:</p>

        <h3>Cursor / Windsurf</h3>
        <pre><code>{`{
  "mcpServers": {
    "charity-register": {
      "url": "${baseUrl}/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}</code></pre>

        <h3>Claude Desktop</h3>
        <pre><code>{`{
  "mcpServers": {
    "charity-register": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${baseUrl}/mcp"],
      "env": {
        "MCP_REMOTE_AUTH_HEADER": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}</code></pre>

        <p className="info-note">Replace <code>YOUR_API_KEY</code> with a key generated above.</p>

        <h2>Rate Limiting</h2>
        <p>Each API key is limited to <strong>60 requests per minute</strong>. If you hit the limit, wait 60 seconds and try again.</p>

        <a href="#/" className="btn-secondary info-back-link">← Back to Charity Register</a>
      </div>
    </div>
  )
}
