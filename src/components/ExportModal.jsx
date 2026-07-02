import { useState } from 'react'
import { EXPORTABLE_FIELDS } from '../lib/csvParser'

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

export default function ExportModal({ resultCount, onExport, onClose }) {
  const [preset, setPreset] = useState('all')
  const [selectedFields, setSelectedFields] = useState(new Set(PRESET_FIELDS.all))

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
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Export Filtered Results</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="modal-info">
            Exporting <strong>{resultCount.toLocaleString('en-GB')}</strong> {resultCount === 1 ? 'charity' : 'charities'} as CSV.
          </p>

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

          <div className="export-fields">
            <h4>Select Fields to Include</h4>
            <div className="export-field-grid">
              {EXPORTABLE_FIELDS.map(({ key, label }) => (
                <label key={key} className="filter-item export-field-item">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(key)}
                    onChange={() => toggleField(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <span className="export-field-count">
            {selectedFields.size} {selectedFields.size === 1 ? 'field' : 'fields'} selected
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
