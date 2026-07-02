# Charity Register

A searchable, filterable interface for UK charity data focused on literature, reading, and writing. Built with React, Express, and SQLite (FTS5 full-text search). Data sourced from the Charity Commission for England and Wales. Includes an MCP server for AI agent integration.

## Features

- **Full-text search** across charity name, address, activities, objects, and more
- **Filters** — status, type, what they do, constituency, income range, field presence (website/email/phone/income/postcode/address)
- **Favorites** — star charities, persisted server-side in SQLite
- **CSV import** — upload new data via the UI
- **CSV export** — export filtered results
- **MCP server** — let AI agents (Claude, Cursor, Windsurf) query the charity register programmatically
- **API key management** — generate/revoke keys from the in-app MCP page
- **Rate limiting** — 60 requests/minute per API key

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite |
| Backend | Express.js, Node.js |
| Database | SQLite (better-sqlite3) with FTS5 |
| Search | SQLite full-text search (FTS5) |
| MCP | @modelcontextprotocol/sdk |
| CSV | PapaParse |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

Run both the Express server and Vite dev server together:

```bash
npm run dev:all
```

Or run them separately:

```bash
npm run dev:server   # Express API on :3001
npm run dev          # Vite dev server on :5173
```

The app will be available at `http://localhost:5173`. Vite proxies `/api` and `/mcp` requests to the Express server.

### Production

```bash
npm run build    # Build frontend to dist/
npm start        # Serve from Express on :3001
```

The Express server serves the built frontend and API from a single port.

## Database

The SQLite database is stored at `data/charities.db` (auto-created, gitignored). On first run, if the database is empty, it seeds from `public/charity-data.csv`.

### Schema

- **charities** — main table with charity number, name, address, income, status, type, activities, etc.
- **charities_fts** — FTS5 virtual table mirroring searchable text columns
- **favorites** — charity keys starred by users
- **api_keys** — MCP API keys with creation/revocation tracking

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/charities` | Search & filter charities |
| GET | `/api/charities/:key` | Get single charity by key |
| GET | `/api/filters/:field` | Get filter options (status, type, whatDoes) |
| GET | `/api/stats` | Total count + favorites count |
| POST | `/api/import` | Import CSV file |
| GET | `/api/favorites` | List favorite charity keys |
| POST | `/api/favorites/:key` | Toggle favorite |
| GET | `/mcp` | MCP info page (in-app) |
| GET | `/mcp/keys` | List API keys |
| POST | `/mcp/generate-key` | Generate new API key |
| POST | `/mcp/revoke-key` | Revoke an API key |
| POST | `/mcp` | MCP protocol endpoint (requires Bearer token) |

## MCP Tools

The MCP server exposes 4 tools to AI agents:

- **`search_charities`** — Full-text search with optional filters (status, type, constituency, income, field presence)
- **`get_charity`** — Full details for a specific charity by registration number
- **`get_charity_stats`** — Summary statistics (total, favorites, breakdowns)
- **`list_filter_options`** — Available filter values with counts

### MCP Setup

Visit the in-app **MCP Server** page (via the `?` icon in the header) to generate an API key and get copy-paste configuration for your AI agent.

## Project Structure

```
charity-info-parser/
├── server/
│   ├── index.js       # Express app, routes, MCP endpoint, key management
│   ├── db.js          # SQLite connection & schema
│   ├── queries.js     # Search, filter, favorites queries
│   ├── import.js      # CSV import logic
│   └── mcp.js         # MCP server & tool definitions
├── src/
│   ├── App.jsx        # Main app, routing, state
│   ├── App.css        # Global styles
│   ├── lib/
│   │   ├── api.js     # Frontend API client
│   │   └── csvParser.js  # CSV parse/export utilities
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── FilterSidebar.jsx
│   │   ├── CharityList.jsx
│   │   ├── CharityDetail.jsx
│   │   ├── SearchableSelect.jsx
│   │   └── ExportModal.jsx
│   └── pages/
│       ├── Privacy.jsx
│       ├── Terms.jsx
│       └── McpInfo.jsx
├── public/
│   ├── favicon.svg
│   └── charity-data.csv
├── data/              # SQLite DB (gitignored)
├── dist/              # Build output (gitignored)
├── vite.config.js
├── package.json
└── DEPLOY.md
```

## Deployment

See [DEPLOY.md](DEPLOY.md) for VPS deployment instructions with Nginx reverse proxy.

## Data Source

Charity data is from the [Charity Commission for England and Wales](https://register-of-charities.charitycommission.gov.uk/). It is publicly available and presented without modification.

## License

This project uses publicly available UK charity data. Check the Charity Commission's data reuse terms before redistributing.
