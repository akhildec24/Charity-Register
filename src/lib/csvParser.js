import Papa from 'papaparse'

const COLUMN_MAP = {
  'Charity Number': 'charityNumber',
  'Charity Subsidiary Number': 'subsidiaryNumber',
  'Charity Name': 'name',
  'Charity Address': 'address',
  'Charity Postcode': 'postcode',
  'Charity Constituency': 'constituency',
  'Phone': 'phone',
  'Email': 'email',
  'Website': 'website',
  'Last Recorded Financial Year': 'financialYear',
  'Last Recorded Income': 'income',
  'Last Recorded Expenditure': 'expenditure',
  'Charity Status': 'status',
  'Charity Type': 'type',
  'How the charity helps': 'howHelps',
  'What the charity does': 'whatDoes',
  'Who the charity helps': 'whoHelps',
  'Activities': 'activities',
  'Charity Objects': 'objects',
}

function parseNumber(value) {
  if (!value || value === '') return null
  const cleaned = String(value).replace(/,/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function normalizeRow(row) {
  const charity = {}
  for (const [csvKey, fieldKey] of Object.entries(COLUMN_MAP)) {
    charity[fieldKey] = row[csvKey] != null ? String(row[csvKey]).trim() : ''
  }
  charity.income = parseNumber(charity.income)
  charity.expenditure = parseNumber(charity.expenditure)
  charity.subsidiaryNumber = parseNumber(charity.subsidiaryNumber) ?? 0
  charity._key = `${charity.charityNumber}-${charity.subsidiaryNumber}`
  charity._searchable = [
    charity.name,
    charity.address,
    charity.postcode,
    charity.constituency,
    charity.activities,
    charity.objects,
    charity.whatDoes,
    charity.whoHelps,
    charity.howHelps,
  ].join(' ').toLowerCase()
  return charity
}

export function parseCsvText(csvText) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const charities = results.data.map(normalizeRow).filter(c => c.charityNumber)
        resolve(charities)
      },
      error: reject,
    })
  })
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const charities = results.data.map(normalizeRow).filter(c => c.charityNumber)
        resolve(charities)
      },
      error: reject,
    })
  })
}

export function mergeCharities(existing, incoming) {
  const map = new Map()
  for (const c of existing) {
    map.set(c._key, c)
  }
  let newCount = 0
  let updatedCount = 0
  for (const c of incoming) {
    if (map.has(c._key)) {
      const prev = map.get(c._key)
      if (JSON.stringify(prev) !== JSON.stringify(c)) {
        updatedCount++
      }
      map.set(c._key, c)
    } else {
      map.set(c._key, c)
      newCount++
    }
  }
  return {
    charities: Array.from(map.values()),
    newCount,
    updatedCount,
    duplicateCount: incoming.length - newCount - updatedCount,
  }
}

export function extractUniqueValues(charities, field) {
  const counts = new Map()
  for (const c of charities) {
    const raw = c[field]
    if (!raw) continue
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
    for (const p of parts) {
      counts.set(p, (counts.get(p) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, count }))
}

const FIELD_LABELS = {
  charityNumber: 'Charity Number',
  subsidiaryNumber: 'Charity Subsidiary Number',
  name: 'Charity Name',
  address: 'Charity Address',
  postcode: 'Charity Postcode',
  constituency: 'Charity Constituency',
  phone: 'Phone',
  email: 'Email',
  website: 'Website',
  financialYear: 'Last Recorded Financial Year',
  income: 'Last Recorded Income',
  expenditure: 'Last Recorded Expenditure',
  status: 'Charity Status',
  type: 'Charity Type',
  howHelps: 'How the charity helps',
  whatDoes: 'What the charity does',
  whoHelps: 'Who the charity helps',
  activities: 'Activities',
  objects: 'Charity Objects',
}

export const EXPORTABLE_FIELDS = Object.entries(FIELD_LABELS).map(([key, label]) => ({ key, label }))

export function exportToCsv(charities, selectedFields) {
  const fields = selectedFields || EXPORTABLE_FIELDS.map(f => f.key)
  const headers = fields.map(f => FIELD_LABELS[f] || f)
  const rows = charities.map(c => fields.map(f => c[f] ?? ''))
  const csv = Papa.unparse([headers, ...rows])
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `charity-export-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
