import { getDb } from './db.js'

const COLUMN_MAP = {
  'Charity Number': 'charity_number',
  'Charity Subsidiary Number': 'subsidiary_number',
  'Charity Name': 'name',
  'Charity Address': 'address',
  'Charity Postcode': 'postcode',
  'Charity Constituency': 'constituency',
  'Phone': 'phone',
  'Email': 'email',
  'Website': 'website',
  'Last Recorded Financial Year': 'financial_year',
  'Last Recorded Income': 'income',
  'Last Recorded Expenditure': 'expenditure',
  'Charity Status': 'status',
  'Charity Type': 'type',
  'How the charity helps': 'how_helps',
  'What the charity does': 'what_does',
  'Who the charity helps': 'who_helps',
  'Activities': 'activities',
  'Charity Objects': 'objects',
}

function parseNumber(value) {
  if (!value || value === '') return null
  const cleaned = String(value).replace(/,/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export function importRows(rows) {
  const db = getDb()
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO charities (
      charity_number, subsidiary_number, name, address, postcode, constituency,
      phone, email, website, financial_year, income, expenditure,
      status, type, how_helps, what_does, who_helps, activities, objects, updated_at
    ) VALUES (
      @charity_number, @subsidiary_number, @name, @address, @postcode, @constituency,
      @phone, @email, @website, @financial_year, @income, @expenditure,
      @status, @type, @how_helps, @what_does, @who_helps, @activities, @objects, datetime('now')
    )
  `)

  let newCount = 0
  let updatedCount = 0
  let duplicateCount = 0

  const importAll = db.transaction((rows) => {
    for (const row of rows) {
      const obj = {}
      for (const [csvKey, dbCol] of Object.entries(COLUMN_MAP)) {
        obj[dbCol] = row[csvKey] != null ? String(row[csvKey]).trim() : ''
      }
      if (!obj.charity_number) continue

      obj.subsidiary_number = parseNumber(obj.subsidiary_number) ?? 0
      obj.income = parseNumber(obj.income)
      obj.expenditure = parseNumber(obj.expenditure)

      const existing = db.prepare(
        'SELECT * FROM charities WHERE charity_number = ? AND subsidiary_number = ?'
      ).get(obj.charity_number, obj.subsidiary_number)

      if (existing) {
        const changed = Object.keys(obj).some(k => String(existing[k] ?? '') !== String(obj[k] ?? ''))
        if (changed) {
          updatedCount++
        } else {
          duplicateCount++
        }
      } else {
        newCount++
      }

      insertStmt.run(obj)
    }
  })

  importAll(rows)
  return { newCount, updatedCount, duplicateCount }
}
