import { formatCurrency } from '../lib/format'

export default function CharityList({ charities, selectedKey, onSelect, favorites, onToggleFavorite, resultTotal }) {
  if (charities.length === 0) {
    return (
      <div className="list-panel">
        <div className="list-header">
          <span className="result-count">No results</span>
        </div>
        <div className="list-empty">
          No charities match your current filters.
          <br />
          Try adjusting your search or filters.
        </div>
      </div>
    )
  }

  return (
    <div className="list-panel">
      <div className="list-header">
        <span className="result-count">
          {resultTotal != null
            ? `${resultTotal.toLocaleString('en-GB')} ${resultTotal === 1 ? 'result' : 'results'}`
            : `${charities.length.toLocaleString('en-GB')} ${charities.length === 1 ? 'result' : 'results'}`}
        </span>
      </div>
      <div className="list-scroll">
        {charities.map((c) => (
          <div
            key={c._key}
            className={`charity-row ${selectedKey === c._key ? 'active' : ''}`}
            onClick={() => onSelect(c._key)}
          >
            <div className="charity-row-top">
              <div className="charity-row-name-wrap">
                <button
                  className={`fav-star ${favorites.has(c._key) ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(c._key) }}
                  aria-label="Toggle favorite"
                >
                  {favorites.has(c._key) ? '★' : '☆'}
                </button>
                <span className="charity-row-name">{c.name}</span>
              </div>
              <span className="charity-row-number">#{c.charityNumber}</span>
            </div>
            <div className="charity-row-meta">
              {c.constituency && (
                <span className="meta-item">
                  <span className="meta-label">Area:</span> {c.constituency}
                </span>
              )}
              {c.income != null && (
                <span className="meta-item">
                  <span className="meta-label">Income:</span> {formatCurrency(c.income)}
                </span>
              )}
              {c.type && (
                <span className="meta-item">
                  <span className="meta-label">Type:</span> {c.type}
                </span>
              )}
            </div>
            <div className="charity-row-tags">
              {c.status && (
                <span className={`tag status-${c.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {c.status}
                </span>
              )}
              {c.whatDoes && c.whatDoes.split(',').slice(0, 2).map((t, i) => (
                <span key={i} className="tag">{t.trim()}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
