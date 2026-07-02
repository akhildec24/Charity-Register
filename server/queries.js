import { getDb, rowToCharity } from './db.js'

const SORT_MAP = {
  'name': 'name ASC',
  'name-desc': 'name DESC',
  'income-desc': 'income DESC',
  'income-asc': 'income ASC',
  'expenditure-desc': 'expenditure DESC',
  'expenditure-asc': 'expenditure ASC',
}

export function searchCharities({ search, filters, sortBy, limit, offset }) {
  const db = getDb()
  const conditions = []
  const params = []

  const hasSearch = search && search.trim()
  if (hasSearch) {
    conditions.push('charities.rowid IN (SELECT rowid FROM charities_fts WHERE charities_fts MATCH ?)')
    params.push(buildFtsQuery(search.trim()))
  }

  if (filters.status?.length) {
    const placeholders = filters.status.map(() => '?').join(',')
    conditions.push(`status IN (${placeholders})`)
    params.push(...filters.status)
  }

  if (filters.type?.length) {
    const placeholders = filters.type.map(() => '?').join(',')
    conditions.push(`type IN (${placeholders})`)
    params.push(...filters.type)
  }

  if (filters.whatDoes?.length) {
    const orParts = filters.whatDoes.map(() => "what_does LIKE '%' || ? || '%'").join(' OR ')
    conditions.push(`(${orParts})`)
    params.push(...filters.whatDoes)
  }

  if (filters.incomeMin != null && filters.incomeMin !== '') {
    conditions.push('income IS NOT NULL AND income >= ?')
    params.push(parseFloat(filters.incomeMin))
  }

  if (filters.incomeMax != null && filters.incomeMax !== '') {
    conditions.push('income IS NOT NULL AND income <= ?')
    params.push(parseFloat(filters.incomeMax))
  }

  if (filters.constituency?.trim()) {
    conditions.push('LOWER(constituency) LIKE ?')
    params.push(`%${filters.constituency.toLowerCase()}%`)
  }

  const fieldMap = {
    field_website: 'website',
    field_email: 'email',
    field_phone: 'phone',
    field_income: 'income',
    field_postcode: 'postcode',
    field_address: 'address',
  }

  for (const [filterKey, dbCol] of Object.entries(fieldMap)) {
    const mode = filters[filterKey]
    if (mode === 'with') {
      conditions.push(`${dbCol} IS NOT NULL AND TRIM(${dbCol}) != ''`)
    } else if (mode === 'without') {
      conditions.push(`(${dbCol} IS NULL OR TRIM(${dbCol}) = '')`)
    }
  }

  if (filters.favoritesOnly) {
    const favKeys = getFavoriteKeys()
    if (favKeys.length === 0) {
      return { charities: [], total: 0 }
    }
    const placeholders = favKeys.map(() => '?').join(',')
    conditions.push(`charity_number || '-' || subsidiary_number IN (${placeholders})`)
    params.push(...favKeys)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const order = hasSearch ? 'bm25(charities_fts) ASC' : (SORT_MAP[sortBy] || 'name ASC')

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM charities ${where}`).get(...params)
  const total = countRow.total

  let rows
  if (hasSearch) {
    rows = db.prepare(
      `SELECT charities.*, bm25(charities_fts) as fts_rank FROM charities JOIN charities_fts ON charities.rowid = charities_fts.rowid ${where} ORDER BY ${order} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset)
  } else {
    rows = db.prepare(
      `SELECT * FROM charities ${where} ORDER BY ${order} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset)
  }

  return {
    charities: rows.map(rowToCharity),
    total,
  }
}

function buildFtsQuery(query) {
  const words = query.split(/\s+/).filter(Boolean)
  if (words.length <= 1) {
    return '"' + query.replace(/"/g, '""') + '"'
  }
  return words.map(w => '"' + w.replace(/"/g, '""') + '"').join(' OR ')
}

export function getCharityByKey(key) {
  const db = getDb()
  const [charityNumber, subsidiaryNumber] = key.split('-')
  const row = db.prepare(
    'SELECT * FROM charities WHERE charity_number = ? AND subsidiary_number = ?'
  ).get(charityNumber, parseInt(subsidiaryNumber) || 0)
  return rowToCharity(row)
}

export function getUniqueValues(field) {
  const db = getDb()
  const columnMap = {
    status: 'status',
    type: 'type',
    whatDoes: 'what_does',
  }
  const col = columnMap[field]
  if (!col) return []

  const rows = db.prepare(
    `SELECT ${col} as value, COUNT(*) as count FROM charities WHERE ${col} IS NOT NULL AND TRIM(${col}) != '' GROUP BY ${col} ORDER BY count DESC`
  ).all()

  return rows.flatMap(r => {
    const parts = r.value.split(',').map(s => s.trim()).filter(Boolean)
    return parts.map(p => ({ value: p, count: r.count }))
  })
}

export function getTotalCount() {
  const db = getDb()
  return db.prepare('SELECT COUNT(*) as total FROM charities').get().total
}

// Favorites

export function getFavoriteKeys() {
  const db = getDb()
  const rows = db.prepare('SELECT charity_key FROM favorites').all()
  return rows.map(r => r.charity_key)
}

export function toggleFavorite(key) {
  const db = getDb()
  const existing = db.prepare('SELECT 1 FROM favorites WHERE charity_key = ?').get(key)
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE charity_key = ?').run(key)
    return false
  } else {
    db.prepare('INSERT OR IGNORE INTO favorites (charity_key) VALUES (?)').run(key)
    return true
  }
}

export function getFavoriteCount() {
  const db = getDb()
  return db.prepare('SELECT COUNT(*) as count FROM favorites').get().count
}
