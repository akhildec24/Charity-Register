import { useState, useEffect, useCallback } from 'react'
import './App.css'
import Header from './components/Header'
import FilterSidebar from './components/FilterSidebar'
import CharityList from './components/CharityList'
import CharityDetail from './components/CharityDetail'
import ExportModal from './components/ExportModal'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import McpInfo from './pages/McpInfo'
import About from './pages/About'
import {
  fetchCharities,
  fetchCharity,
  fetchFilterOptions,
  fetchStats,
  importCsvFile,
  fetchFavorites,
  toggleFavoriteApi,
} from './lib/api'
import { exportToCsv } from './lib/csvParser'

const DEFAULT_FILTERS = {
  status: null,
  type: null,
  whatDoes: null,
  incomeMin: null,
  incomeMax: null,
  constituency: null,
  field_website: null,
  field_email: null,
  field_phone: null,
  field_income: null,
  field_postcode: null,
  field_address: null,
  favoritesOnly: false,
}

function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState('name')
  const [selectedKey, setSelectedKey] = useState(null)
  const [importStatus, setImportStatus] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [favorites, setFavorites] = useState(new Set())
  const [showExport, setShowExport] = useState(false)

  const [charities, setCharities] = useState([])
  const [resultTotal, setResultTotal] = useState(0)
  const [selectedCharity, setSelectedCharity] = useState(null)
  const [filterOptions, setFilterOptions] = useState({
    status: [],
    type: [],
    whatDoes: [],
  })

  // Hash routing
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Load favorites, stats, and filter options on mount
  useEffect(() => {
    Promise.all([
      fetchFavorites().then(data => setFavorites(new Set(data.keys))).catch(() => {}),
      fetchStats().then(data => setTotalCount(data.total)).catch(() => {}),
      Promise.all([
        fetchFilterOptions('status'),
        fetchFilterOptions('type'),
        fetchFilterOptions('whatDoes'),
      ]).then(([status, type, whatDoes]) => {
        setFilterOptions({ status, type, whatDoes })
      }).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // Fetch charities when search/filters/sort change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCharities({ search, filters, sortBy, limit: 500, offset: 0 })
        .then(data => {
          setCharities(data.charities)
          setResultTotal(data.total)
        })
        .catch(() => {})
    }, 200)

    return () => clearTimeout(timer)
  }, [search, filters, sortBy])

  // Fetch selected charity detail
  useEffect(() => {
    if (!selectedKey) {
      setSelectedCharity(null)
      return
    }
    fetchCharity(selectedKey).then(setSelectedCharity).catch(() => setSelectedCharity(null))
  }, [selectedKey])

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSearch('')
  }, [])

  const handleImportFile = useCallback(async (file, adminToken) => {
    if (!adminToken) return
    setImportStatus({ type: '', message: 'Importing CSV…' })
    try {
      const result = await importCsvFile(file, adminToken)
      setImportStatus({ type: 'success', message: result.message })
      fetchStats().then(data => setTotalCount(data.total)).catch(() => {})
      Promise.all([
        fetchFilterOptions('status'),
        fetchFilterOptions('type'),
        fetchFilterOptions('whatDoes'),
      ]).then(([status, type, whatDoes]) => {
        setFilterOptions({ status, type, whatDoes })
      }).catch(() => {})
    } catch (err) {
      setImportStatus({ type: 'error', message: err.message || 'Failed to import CSV.' })
    }
    setTimeout(() => setImportStatus(null), 5000)
  }, [])

  const toggleFavorite = useCallback(async (key) => {
    try {
      const result = await toggleFavoriteApi(key)
      setFavorites(prev => {
        const next = new Set(prev)
        if (result.isFavorite) next.add(key)
        else next.delete(key)
        return next
      })
    } catch {}
  }, [])

  const handleExport = useCallback((selectedFields) => {
    exportToCsv(charities, selectedFields)
    setShowExport(false)
  }, [charities])

  if (loading) {
    return (
      <div className="app">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading charity data…</p>
        </div>
      </div>
    )
  }

  if (route === '/about') return <About />
  if (route === '/privacy') return <Privacy />
  if (route === '/terms') return <Terms />
  if (route === '/mcp') return <McpInfo />

  return (
    <div className="app">
      <Header
        search={search}
        onSearchChange={setSearch}
        totalCount={totalCount}
        favoriteCount={favorites.size}
        onImportFile={handleImportFile}
        importStatus={importStatus}
        onExport={() => setShowExport(true)}
      />
      <div className="app-body">
        <FilterSidebar
          charities={[]}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          favoriteCount={favorites.size}
          filterOptions={filterOptions}
        />
        <CharityList
          charities={charities}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          resultTotal={resultTotal}
        />
        <CharityDetail
          charity={selectedCharity}
          isFavorite={selectedCharity ? favorites.has(selectedCharity._key) : false}
          onToggleFavorite={toggleFavorite}
        />
      </div>
      {showExport && (
        <ExportModal
          resultCount={charities.length}
          onExport={handleExport}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}

export default App
