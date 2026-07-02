const API_BASE = '/api'

async function fetchJson(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export function fetchCharities({ search, filters, sortBy, limit = 50, offset = 0 }) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (sortBy) params.set('sortBy', sortBy)
  params.set('limit', String(limit))
  params.set('offset', String(offset))

  if (filters.status?.length) filters.status.forEach(s => params.append('status', s))
  if (filters.type?.length) filters.type.forEach(t => params.append('type', t))
  if (filters.whatDoes?.length) filters.whatDoes.forEach(w => params.append('whatDoes', w))
  if (filters.incomeMin != null && filters.incomeMin !== '') params.set('incomeMin', filters.incomeMin)
  if (filters.incomeMax != null && filters.incomeMax !== '') params.set('incomeMax', filters.incomeMax)
  if (filters.constituency?.trim()) params.set('constituency', filters.constituency)
  if (filters.favoritesOnly) params.set('favoritesOnly', 'true')

  for (const key of ['field_website', 'field_email', 'field_phone', 'field_income', 'field_postcode', 'field_address']) {
    if (filters[key]) params.set(key, filters[key])
  }

  return fetchJson(`${API_BASE}/charities?${params}`)
}

export function fetchCharity(key) {
  return fetchJson(`${API_BASE}/charities/${encodeURIComponent(key)}`)
}

export function fetchFilterOptions(field) {
  return fetchJson(`${API_BASE}/filters/${field}`)
}

export function fetchStats() {
  return fetchJson(`${API_BASE}/stats`)
}

export function importCsvFile(file, adminToken) {
  const formData = new FormData()
  formData.append('file', file)
  const headers = {}
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`
  return fetchJson(`${API_BASE}/import`, { method: 'POST', body: formData, headers })
}

export function fetchFavorites() {
  return fetchJson(`${API_BASE}/favorites`)
}

export function toggleFavoriteApi(key) {
  return fetchJson(`${API_BASE}/favorites/${encodeURIComponent(key)}`, { method: 'POST' })
}
