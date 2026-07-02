import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getDb } from './db.js'
import { searchCharities, getCharityByKey, getUniqueValues, getTotalCount, getFavoriteCount } from './queries.js'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60
const rateMap = new Map()

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(key)
  }
}, 5 * 60_000).unref()

function checkRateLimit(apiKey) {
  const now = Date.now()
  const entry = rateMap.get(apiKey) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS
  }
  entry.count++
  rateMap.set(apiKey, entry)
  return entry.count <= RATE_LIMIT_MAX
}

function validateApiKey(key) {
  if (!key) return false
  const db = getDb()
  const row = db.prepare('SELECT * FROM api_keys WHERE key = ? AND revoked = 0').get(key)
  if (!row) return false
  db.prepare('UPDATE api_keys SET last_used_at = datetime(\'now\') WHERE key = ?').run(key)
  return true
}

export function createMcpServer() {
  const server = new McpServer({
    name: 'charity-register',
    version: '1.0.0',
  })

  server.tool(
    'search_charities',
    'Search the UK charity register by name, activities, address, or other text. Returns matching charities with key details.',
    {
      query: z.string().describe('Full-text search query (searches name, address, activities, objects, etc.)'),
      status: z.string().optional().describe('Filter by status (e.g. "Registered")'),
      type: z.string().optional().describe('Filter by charity type (e.g. "CIO", "Trust")'),
      constituency: z.string().optional().describe('Filter by constituency (partial match)'),
      has_website: z.boolean().optional().describe('If true, only return charities with a website'),
      has_email: z.boolean().optional().describe('If true, only return charities with an email'),
      has_phone: z.boolean().optional().describe('If true, only return charities with a phone number'),
      min_income: z.number().optional().describe('Minimum income in pounds'),
      max_income: z.number().optional().describe('Maximum income in pounds'),
      limit: z.number().optional().describe('Max results to return (default 20, max 100)'),
    },
    async (args) => {
      const limit = Math.min(args.limit || 20, 100)
      const filters = {}
      if (args.status) filters.status = [args.status]
      if (args.type) filters.type = [args.type]
      if (args.constituency) filters.constituency = args.constituency
      if (args.min_income != null) filters.incomeMin = args.min_income
      if (args.max_income != null) filters.incomeMax = args.max_income
      if (args.has_website) filters.field_website = 'with'
      if (args.has_email) filters.field_email = 'with'
      if (args.has_phone) filters.field_phone = 'with'

      const result = searchCharities({
        search: args.query || '',
        filters,
        sortBy: 'name',
        limit,
        offset: 0,
      })

      const summary = result.charities.map(c => ({
        name: c.name,
        charityNumber: c.charityNumber,
        status: c.status,
        type: c.type,
        income: c.income,
        constituency: c.constituency,
        website: c.website,
        email: c.email,
        phone: c.phone,
      }))

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalMatches: result.total,
            returned: summary.length,
            charities: summary,
          }, null, 2),
        }],
      }
    }
  )

  server.tool(
    'get_charity',
    'Get full details for a specific charity by its charity number (and optional subsidiary number).',
    {
      charity_number: z.string().describe('The charity registration number'),
      subsidiary_number: z.number().optional().describe('Subsidiary number (default 0)'),
    },
    async (args) => {
      const sub = args.subsidiary_number || 0
      const key = `${args.charity_number}-${sub}`
      const charity = getCharityByKey(key)
      if (!charity) {
        return { content: [{ type: 'text', text: `No charity found with number ${args.charity_number} (sub: ${sub}).` }] }
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(charity, null, 2),
        }],
      }
    }
  )

  server.tool(
    'get_charity_stats',
    'Get summary statistics about the charity register — total count, favorites count, and breakdown by status/type.',
    {},
    async () => {
      const db = getDb()
      const total = getTotalCount()
      const favorites = getFavoriteCount()
      const statusBreakdown = db.prepare(
        'SELECT status, COUNT(*) as count FROM charities GROUP BY status ORDER BY count DESC'
      ).all()
      const typeBreakdown = db.prepare(
        'SELECT type, COUNT(*) as count FROM charities GROUP BY type ORDER BY count DESC'
      ).all()

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalCharities: total,
            favorites: favorites,
            byStatus: statusBreakdown,
            byType: typeBreakdown,
          }, null, 2),
        }],
      }
    }
  )

  server.tool(
    'list_filter_options',
    'List available filter values with counts for a given field (status, type, or whatDoes).',
    {
      field: z.enum(['status', 'type', 'whatDoes']).describe('Which field to get filter options for'),
    },
    async (args) => {
      const values = getUniqueValues(args.field)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ field: args.field, options: values }, null, 2),
        }],
      }
    }
  )

  return server
}

export { validateApiKey, checkRateLimit }
