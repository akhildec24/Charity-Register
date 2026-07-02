import { useRef, useState, useEffect } from 'react'

export default function Header({ search, onSearchChange, totalCount, favoriteCount, onImportFile, importStatus, onExport }) {
  const fileInputRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [tokenInput, setTokenInput] = useState('')
  const [tokenError, setTokenError] = useState('')

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPendingFile(file)
      setTokenInput('')
      setTokenError('')
    }
    e.target.value = ''
  }

  const handleImportSubmit = async () => {
    if (!tokenInput.trim()) {
      setTokenError('Please enter the admin token')
      return
    }
    await onImportFile(pendingFile, tokenInput.trim())
    setPendingFile(null)
    setTokenInput('')
    setTokenError('')
  }

  const handleImportCancel = () => {
    setPendingFile(null)
    setTokenInput('')
    setTokenError('')
  }

  const handleTokenKeyDown = (e) => {
    if (e.key === 'Enter') handleImportSubmit()
    if (e.key === 'Escape') handleImportCancel()
  }

  return (
    <header className="header">
      <div className="header-title">
        <svg className="header-logo" width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="7" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
          <path d="M16 7c-1.5-2.5-5-3-7-1s-2 5 0 7l7 7 7-7c2-2 2-5 0-7s-5.5-1.5-7 1z" fill="none" stroke="#e8b820" strokeWidth="2" strokeLinejoin="round"/>
          <rect x="12" y="22" width="8" height="2.5" rx="1" fill="#e8b820"/>
        </svg>
        Charity Register
      </div>
      <div className="header-search">
        <span className="search-icon">⌕</span>
        <input
          type="text"
          placeholder="Search by name, address, activities, objects…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button className="search-clear" onClick={() => onSearchChange('')} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>
      <div className="header-actions">
        <span className="header-count">{totalCount.toLocaleString('en-GB')} charities</span>
        {favoriteCount > 0 && (
          <span className="header-fav-count">★ {favoriteCount}</span>
        )}
        <button className="btn-secondary" onClick={onExport}>
          Export
        </button>
        <button className="btn-import" onClick={() => fileInputRef.current?.click()}>
          Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <div className="header-menu" ref={menuRef}>
          <button
            className={`help-btn ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Help & Info"
          >
            ?
          </button>
          {menuOpen && (
            <div className="help-dropdown">
              <a href="#/about" onClick={() => setMenuOpen(false)}>About</a>
              <a href="#/mcp" onClick={() => setMenuOpen(false)}>MCP Server</a>
              <a href="#/privacy" onClick={() => setMenuOpen(false)}>Privacy Policy</a>
              <a href="#/terms" onClick={() => setMenuOpen(false)}>Terms & Conditions</a>
            </div>
          )}
        </div>
      </div>
      {importStatus && (
        <div className={`import-status ${importStatus.type}`}>
          <span className="indicator" />
          {importStatus.message}
        </div>
      )}

      {pendingFile && (
        <div className="modal-overlay" onClick={handleImportCancel}>
          <div className="modal-content token-modal" onClick={e => e.stopPropagation()}>
            <h3>Import CSV</h3>
            <p className="token-modal-file">
              <strong>File:</strong> {pendingFile.name} ({(pendingFile.size / 1024).toFixed(0)} KB)
            </p>
            <label className="token-modal-label">Admin Token</label>
            <input
              type="password"
              className="token-modal-input"
              placeholder="Enter admin token…"
              value={tokenInput}
              onChange={e => { setTokenInput(e.target.value); setTokenError('') }}
              onKeyDown={handleTokenKeyDown}
              autoFocus
            />
            {tokenError && <p className="token-modal-error">{tokenError}</p>}
            <div className="token-modal-actions">
              <button className="btn-secondary" onClick={handleImportCancel}>Cancel</button>
              <button className="btn-primary" onClick={handleImportSubmit}>Import</button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
