import { useState, useEffect } from 'react'
import { formatCurrencyFull, formatNumber, ensureUrl, splitList } from '../lib/format'

function CharityDetailContent({ charity, isFavorite, onToggleFavorite }) {
  const whatDoesTags = splitList(charity.whatDoes)
  const whoHelpsTags = splitList(charity.whoHelps)
  const howHelpsTags = splitList(charity.howHelps)

  return (
    <>
      <div className="detail-header">
        <div className="status-row">
          <div className="status-tags">
            {charity.status && (
              <span className={`tag status-${charity.status.toLowerCase().replace(/\s+/g, '-')}`}>
                {charity.status}
              </span>
            )}
            {charity.type && <span className="tag">{charity.type}</span>}
          </div>
          <button
            className={`fav-star-large ${isFavorite ? 'active' : ''}`}
            onClick={() => onToggleFavorite(charity._key)}
            aria-label="Toggle favorite"
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>
        <h2>{charity.name}</h2>
        <div className="reg-number">
          Reg. No. {charity.charityNumber}
          {charity.subsidiaryNumber ? ` (Sub: ${charity.subsidiaryNumber})` : ''}
        </div>
      </div>

      <div className="detail-financials">
        <div className="financial-card income">
          <div className="label">Income</div>
          <div className="value">{formatCurrencyFull(charity.income)}</div>
        </div>
        <div className="financial-card expenditure">
          <div className="label">Expenditure</div>
          <div className="value">{formatCurrencyFull(charity.expenditure)}</div>
        </div>
      </div>

      {charity.financialYear && (
        <div className="detail-section">
          <h4>Financial Year</h4>
          <p>{charity.financialYear}</p>
        </div>
      )}

      {charity.activities && (
        <div className="detail-section">
          <h4>Activities</h4>
          <p>{charity.activities}</p>
        </div>
      )}

      {charity.objects && (
        <div className="detail-section">
          <h4>Charitable Objects</h4>
          <div className="detail-objects">{charity.objects}</div>
        </div>
      )}

      {whatDoesTags.length > 0 && (
        <div className="detail-section">
          <h4>What the Charity Does</h4>
          <div className="detail-tags">
            {whatDoesTags.map((t, i) => <span key={i} className="tag">{t}</span>)}
          </div>
        </div>
      )}

      {whoHelpsTags.length > 0 && (
        <div className="detail-section">
          <h4>Who the Charity Helps</h4>
          <div className="detail-tags">
            {whoHelpsTags.map((t, i) => <span key={i} className="tag">{t}</span>)}
          </div>
        </div>
      )}

      {howHelpsTags.length > 0 && (
        <div className="detail-section">
          <h4>How the Charity Helps</h4>
          <div className="detail-tags">
            {howHelpsTags.map((t, i) => <span key={i} className="tag">{t}</span>)}
          </div>
        </div>
      )}

      <div className="detail-section">
        <h4>Contact</h4>
        {charity.address && (
          <div className="detail-field">
            <span className="label">Address</span>
            <span className="value">{charity.address}</span>
          </div>
        )}
        {charity.postcode && (
          <div className="detail-field">
            <span className="label">Postcode</span>
            <span className="value">{charity.postcode.toUpperCase()}</span>
          </div>
        )}
        {charity.constituency && (
          <div className="detail-field">
            <span className="label">Constituency</span>
            <span className="value">{charity.constituency}</span>
          </div>
        )}
        {charity.phone && (
          <div className="detail-field">
            <span className="label">Phone</span>
            <span className="value">{charity.phone}</span>
          </div>
        )}
        {charity.email && (
          <div className="detail-field">
            <span className="label">Email</span>
            <span className="value">
              <a href={`mailto:${charity.email}`}>{charity.email}</a>
            </span>
          </div>
        )}
        {charity.website && (
          <div className="detail-field">
            <span className="label">Website</span>
            <span className="value">
              <a href={ensureUrl(charity.website)} target="_blank" rel="noopener noreferrer">
                {charity.website}
              </a>
            </span>
          </div>
        )}
      </div>
    </>
  )
}

function CharityModalContent({ charity, isFavorite, onToggleFavorite }) {
  const whatDoesTags = splitList(charity.whatDoes)
  const whoHelpsTags = splitList(charity.whoHelps)
  const howHelpsTags = splitList(charity.howHelps)

  return (
    <div className="modal-grid">
      {/* Header — full width, condensed */}
      <div className="detail-header modal-header">
        <h2>{charity.name}</h2>
        <div className="reg-number">
          Reg. No. {charity.charityNumber}
          {charity.subsidiaryNumber ? ` (Sub: ${charity.subsidiaryNumber})` : ''}
        </div>
        <div className="status-row">
          <div className="status-tags">
            {charity.status && (
              <span className={`tag status-${charity.status.toLowerCase().replace(/\s+/g, '-')}`}>
                {charity.status}
              </span>
            )}
            {charity.type && <span className="tag">{charity.type}</span>}
          </div>
          <button
            className={`fav-star-large ${isFavorite ? 'active' : ''}`}
            onClick={() => onToggleFavorite(charity._key)}
            aria-label="Toggle favorite"
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* Financials — full width row */}
      <div className="detail-financials modal-financials">
        <div className="financial-card income">
          <div className="label">Income</div>
          <div className="value">{formatCurrencyFull(charity.income)}</div>
        </div>
        <div className="financial-card expenditure">
          <div className="label">Expenditure</div>
          <div className="value">{formatCurrencyFull(charity.expenditure)}</div>
        </div>
        {charity.financialYear && (
          <div className="financial-card year">
            <div className="label">Financial Year</div>
            <div className="value">{charity.financialYear}</div>
          </div>
        )}
      </div>

      {/* Left column — long text */}
      <div className="modal-col-left">
        {charity.activities && (
          <div className="detail-section">
            <h4>Activities</h4>
            <p>{charity.activities}</p>
          </div>
        )}
        {charity.objects && (
          <div className="detail-section">
            <h4>Charitable Objects</h4>
            <div className="detail-objects">{charity.objects}</div>
          </div>
        )}
      </div>

      {/* Right column — tags */}
      <div className="modal-col-right">
        {whatDoesTags.length > 0 && (
          <div className="detail-section">
            <h4>What the Charity Does</h4>
            <div className="detail-tags">
              {whatDoesTags.map((t, i) => <span key={i} className="tag">{t}</span>)}
            </div>
          </div>
        )}
        {whoHelpsTags.length > 0 && (
          <div className="detail-section">
            <h4>Who the Charity Helps</h4>
            <div className="detail-tags">
              {whoHelpsTags.map((t, i) => <span key={i} className="tag">{t}</span>)}
            </div>
          </div>
        )}
        {howHelpsTags.length > 0 && (
          <div className="detail-section">
            <h4>How the Charity Helps</h4>
            <div className="detail-tags">
              {howHelpsTags.map((t, i) => <span key={i} className="tag">{t}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* Contact — full width, existing detail-field style */}
      <div className="detail-section modal-contact">
        <h4>Contact</h4>
        {charity.address && (
          <div className="detail-field">
            <span className="label">Address</span>
            <span className="value">{charity.address}</span>
          </div>
        )}
        {charity.postcode && (
          <div className="detail-field">
            <span className="label">Postcode</span>
            <span className="value">{charity.postcode.toUpperCase()}</span>
          </div>
        )}
        {charity.constituency && (
          <div className="detail-field">
            <span className="label">Constituency</span>
            <span className="value">{charity.constituency}</span>
          </div>
        )}
        {charity.phone && (
          <div className="detail-field">
            <span className="label">Phone</span>
            <span className="value">{charity.phone}</span>
          </div>
        )}
        {charity.email && (
          <div className="detail-field">
            <span className="label">Email</span>
            <span className="value">
              <a href={`mailto:${charity.email}`}>{charity.email}</a>
            </span>
          </div>
        )}
        {charity.website && (
          <div className="detail-field">
            <span className="label">Website</span>
            <span className="value">
              <a href={ensureUrl(charity.website)} target="_blank" rel="noopener noreferrer">
                {charity.website}
              </a>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CharityDetail({ charity, isFavorite, onToggleFavorite }) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [expanded])

  if (!charity) {
    return (
      <div className="detail-panel">
        <div className="detail-empty">
          <span className="icon">⌖</span>
          <p>Select a charity from the list to view full details.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="detail-panel">
        <div className="detail-content">
          <CharityDetailContent
            charity={charity}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
        <button
          className="detail-expand-btn"
          onClick={() => setExpanded(true)}
          aria-label="Expand detail view"
          title="Expand"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2h5M2 2v5M14 2H9M14 2v5M2 14h5M2 14v-5M14 14H9M14 14v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="detail-modal-overlay" onClick={() => setExpanded(false)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            <button
              className="detail-modal-close"
              onClick={() => setExpanded(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="detail-modal-body">
              <CharityModalContent
                charity={charity}
                isFavorite={isFavorite}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
