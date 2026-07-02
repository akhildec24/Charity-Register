import SearchableSelect from './SearchableSelect'

export default function FilterSidebar({ charities, filters, onFilterChange, onClearFilters, sortBy, onSortChange, favoriteCount, filterOptions }) {
  const statusOptions = filterOptions?.status || []
  const typeOptions = filterOptions?.type || []
  const whatDoesOptions = filterOptions?.whatDoes || []

  const toggleArrayFilter = (key, value) => {
    const current = filters[key] || []
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    onFilterChange(key, next.length ? next : null)
  }

  const hasActiveFilters = Object.values(filters).some(v => v != null && (Array.isArray(v) ? v.length > 0 : true))

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="clear-row">
          <h3>Sort By</h3>
        </div>
        <select className="sort-select" value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
          <option value="name">Name (A–Z)</option>
          <option value="name-desc">Name (Z–A)</option>
          <option value="income-desc">Income (High–Low)</option>
          <option value="income-asc">Income (Low–High)</option>
          <option value="expenditure-desc">Expenditure (High–Low)</option>
          <option value="expenditure-asc">Expenditure (Low–High)</option>
        </select>
      </div>

      <div className="sidebar-section">
        <div className="clear-row">
          <h3>Favorites</h3>
          {favoriteCount > 0 && <span className="count">{favoriteCount}</span>}
        </div>
        <label className="filter-item toggle-item">
          <span>Show favorites only</span>
          <button
            type="button"
            className={`toggle-switch ${filters.favoritesOnly ? 'on' : ''}`}
            onClick={() => onFilterChange('favoritesOnly', !filters.favoritesOnly)}
            aria-pressed={filters.favoritesOnly}
          >
            <span className="toggle-knob" />
          </button>
        </label>
      </div>

      <div className="sidebar-section">
        <div className="clear-row">
          <h3>Status</h3>
        </div>
        <div className="filter-group">
          {statusOptions.map(({ value, count }) => (
            <label key={value} className="filter-item">
              <input
                type="checkbox"
                checked={(filters.status || []).includes(value)}
                onChange={() => toggleArrayFilter('status', value)}
              />
              <span>{value}</span>
              <span className="count">{count}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="clear-row">
          <h3>Charity Type</h3>
        </div>
        <div className="filter-group">
          {typeOptions.map(({ value, count }) => (
            <label key={value} className="filter-item">
              <input
                type="checkbox"
                checked={(filters.type || []).includes(value)}
                onChange={() => toggleArrayFilter('type', value)}
              />
              <span>{value}</span>
              <span className="count">{count}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="clear-row">
          <h3>What They Do</h3>
          {filters.whatDoes?.length > 0 && <span className="count">{filters.whatDoes.length}</span>}
        </div>
        <SearchableSelect
          options={whatDoesOptions}
          selected={filters.whatDoes || []}
          onToggle={(val) => toggleArrayFilter('whatDoes', val)}
          placeholder="Search activities…"
        />
      </div>

      <div className="sidebar-section">
        <div className="clear-row">
          <h3>Income Range</h3>
        </div>
        <div className="range-inputs">
          <input
            type="number"
            placeholder="Min £"
            value={filters.incomeMin ?? ''}
            onChange={(e) => onFilterChange('incomeMin', e.target.value || null)}
          />
          <span>—</span>
          <input
            type="number"
            placeholder="Max £"
            value={filters.incomeMax ?? ''}
            onChange={(e) => onFilterChange('incomeMax', e.target.value || null)}
          />
        </div>
      </div>

      <div className="sidebar-section">
        <div className="clear-row">
          <h3>Constituency</h3>
        </div>
        <input
          type="text"
          placeholder="Filter by constituency…"
          value={filters.constituency || ''}
          onChange={(e) => onFilterChange('constituency', e.target.value || null)}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 14,
            outline: 'none',
          }}
        />
      </div>

      <div className="sidebar-section">
        <div className="clear-row">
          <h3>Field Filters</h3>
        </div>
        <div className="filter-group">
          {[
            { key: 'website', label: 'Website' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'income', label: 'Income data' },
            { key: 'postcode', label: 'Postcode' },
            { key: 'address', label: 'Address' },
          ].map(({ key, label }) => (
            <div key={key} className="field-filter-row">
              <span className="field-filter-label">{label}</span>
              <select
                className="field-filter-select"
                value={filters[`field_${key}`] || 'any'}
                onChange={(e) => onFilterChange(`field_${key}`, e.target.value === 'any' ? null : e.target.value)}
              >
                <option value="any">All</option>
                <option value="with">With only</option>
                <option value="without">Without only</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="sidebar-section" style={{ border: 'none', display: 'flex', justifyContent: 'center' }}>
          <button className="sidebar-clear" onClick={onClearFilters}>
            Clear All Filters
          </button>
        </div>
      )}
    </aside>
  )
}
