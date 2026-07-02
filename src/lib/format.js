export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '—'
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`
  }
  return `£${value.toLocaleString('en-GB')}`
}

export function formatCurrencyFull(value) {
  if (value == null || isNaN(value)) return '—'
  return `£${value.toLocaleString('en-GB')}`
}

export function formatNumber(value) {
  if (value == null) return '—'
  return value.toLocaleString('en-GB')
}

export function formatPostcode(postcode) {
  if (!postcode) return '—'
  return postcode.toUpperCase()
}

export function ensureUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

export function splitList(value) {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}
