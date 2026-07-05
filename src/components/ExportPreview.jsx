import { useState, useMemo, useCallback } from 'react'
import { EXPORTABLE_FIELDS, exportToCsv } from '../lib/csvParser'
import { formatCurrency, ensureUrl } from '../lib/format'

const PRESETS = [
  { id: 'all', label: 'All Information' },
  { id: 'contact', label: 'Contact Only' },
  { id: 'financial', label: 'Financial Only' },
  { id: 'basic', label: 'Basic Details' },
]

const PRESET_FIELDS = {
  all: EXPORTABLE_FIELDS.map(f => f.key),
  contact: ['charityNumber', 'name', 'address', 'postcode', 'constituency', 'phone', 'email', 'website'],
  financial: ['charityNumber', 'name', 'financialYear', 'income', 'expenditure'],
  basic: ['charityNumber', 'name', 'status', 'type', 'constituency'],
}

const LINKABLE_FIELDS = new Set(['website', 'email', 'phone'])

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async (e) => {
    e.stopPropagation()
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }, [value])

  if (!value) return null

  return (
    <button
      className={`copy-btn ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      title="Copy to clipboard"
      aria-label="Copy value"
    >
      {copied ? '✓' : '⧉'}
    </button>
  )
}

function CellValue({ fieldKey, value }) {
  if (value == null || value === '') return <span className="cell-empty">—</span>

  if (fieldKey === 'income' || fieldKey === 'expenditure') {
    return <span className="cell-currency">{formatCurrency(value)}</span>
  }

  if (fieldKey === 'website') {
    const url = ensureUrl(value)
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="cell-link" title={value}>
        {value}
      </a>
    )
  }

  if (fieldKey === 'email') {
    return (
      <a href={`mailto:${value}`} className="cell-link" title={value}>
        {value}
      </a>
    )
  }

  if (fieldKey === 'phone') {
    return (
      <a href={`tel:${value.replace(/\s/g, '')}`} className="cell-link" title={value}>
        {value}
      </a>
    )
  }

  if (fieldKey === 'charityNumber') {
    const url = `https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/${value}`
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="cell-link cell-reg" title="View on Charity Commission">
        {value}
      </a>
    )
  }

  const str = String(value)
  if (str.length > 80) {
    return <span className="cell-truncated" title={str}>{str.slice(0, 77)}…</span>
  }

  return <span>{str}</span>
}

export default function ExportPreview({ charities, onExport, onClose }) {
  const [preset, setPreset] = useState('all')
  const [selectedFields, setSelectedFields] = useState(new Set(PRESET_FIELDS.all))
  const [showAll, setShowAll] = useState(false)

  const orderedFields = useMemo(
    () => EXPORTABLE_FIELDS.filter(f => selectedFields.has(f.key)),
    [selectedFields]
  )

  const visibleCharities = useMemo(
    () => showAll ? charities : charities.slice(0, 50),
    [charities, showAll]
  )

  const applyPreset = (id) => {
    setPreset(id)
    setSelectedFields(new Set(PRESET_FIELDS[id]))
  }

  const toggleField = (key) => {
    setPreset(null)
    setSelectedFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleExport = () => {
    if (selectedFields.size === 0) return
    onExport([...selectedFields])
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal export-preview-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Export Preview</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body export-preview-body">
          <div className="export-controls">
            <div className="export-presets">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  className={`preset-btn ${preset === p.id ? 'active' : ''}`}
                  onClick={() => applyPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="export-field-chips">
              {EXPORTABLE_FIELDS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`field-chip ${selectedFields.has(key) ? 'selected' : ''}`}
                  onClick={() => toggleField(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="export-table-wrapper">
            <table className="export-table">
              <thead>
                <tr>
                  {orderedFields.map(({ key, label }) => (
                    <th key={key}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleCharities.map((charity) => (
                  <tr key={charity._key}>
                    {orderedFields.map(({ key }) => (
                      <td key={key} className={LINKABLE_FIELDS.has(key) ? 'td-linkable' : ''}>
                        <div className="cell-content">
                          <CellValue fieldKey={key} value={charity[key]} />
                          <CopyButton value={charity[key] != null ? String(charity[key]) : ''} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!showAll && charities.length > 50 && (
            <div className="export-show-more">
              <button className="btn-secondary" onClick={() => setShowAll(true)}>
                Show all {charities.length.toLocaleString('en-GB')} rows
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span className="export-field-count">
            {charities.length.toLocaleString('en-GB')} charities · {selectedFields.size} {selectedFields.size === 1 ? 'field' : 'fields'}
          </span>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn-primary"
              onClick={handleExport}
              disabled={selectedFields.size === 0}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
