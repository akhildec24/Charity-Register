import { useState, useRef, useEffect } from 'react'

export default function SearchableSelect({ options, selected, onToggle, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim()
    ? options.filter(o => o.value.toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <div className="searchable-select" ref={ref}>
      {selected.length > 0 && (
        <div className="searchable-chips">
          {selected.map(val => (
            <span key={val} className="searchable-chip">
              {val}
              <button onClick={() => onToggle(val)}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div className="searchable-input-wrap">
        <input
          type="text"
          className="searchable-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        {open && filtered.length > 0 && (
          <div className="searchable-dropdown">
            {filtered.slice(0, 50).map(({ value, count }) => (
              <button
                key={value}
                className={`searchable-option ${selected.includes(value) ? 'selected' : ''}`}
                onClick={() => onToggle(value)}
              >
                <span>{value}</span>
                <span className="count">{count}</span>
              </button>
            ))}
            {filtered.length > 50 && (
              <div className="searchable-more">{filtered.length - 50} more — keep typing to narrow down</div>
            )}
          </div>
        )}
        {open && filtered.length === 0 && (
          <div className="searchable-dropdown">
            <div className="searchable-empty">No matches found</div>
          </div>
        )}
      </div>
    </div>
  )
}
