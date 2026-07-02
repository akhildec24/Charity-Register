import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'data', 'charities.db')

let db

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS charities (
      charity_number TEXT NOT NULL,
      subsidiary_number INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL,
      address TEXT,
      postcode TEXT,
      constituency TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      financial_year TEXT,
      income REAL,
      expenditure REAL,
      status TEXT,
      type TEXT,
      how_helps TEXT,
      what_does TEXT,
      who_helps TEXT,
      activities TEXT,
      objects TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (charity_number, subsidiary_number)
    );

    CREATE INDEX IF NOT EXISTS idx_charities_status ON charities(status);
    CREATE INDEX IF NOT EXISTS idx_charities_type ON charities(type);
    CREATE INDEX IF NOT EXISTS idx_charities_constituency ON charities(constituency);
    CREATE INDEX IF NOT EXISTS idx_charities_income ON charities(income);

    CREATE VIRTUAL TABLE IF NOT EXISTS charities_fts USING fts5(
      charity_number,
      name,
      address,
      postcode,
      constituency,
      activities,
      objects,
      what_does,
      who_helps,
      how_helps,
      content='charities',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS charities_ai AFTER INSERT ON charities BEGIN
      INSERT INTO charities_fts(rowid, charity_number, name, address, postcode, constituency, activities, objects, what_does, who_helps, how_helps)
      VALUES (new.rowid, new.charity_number, new.name, new.address, new.postcode, new.constituency, new.activities, new.objects, new.what_does, new.who_helps, new.how_helps);
    END;

    CREATE TRIGGER IF NOT EXISTS charities_ad AFTER DELETE ON charities BEGIN
      INSERT INTO charities_fts(charities_fts, rowid, charity_number, name, address, postcode, constituency, activities, objects, what_does, who_helps, how_helps)
      VALUES ('delete', old.rowid, old.charity_number, old.name, old.address, old.postcode, old.constituency, old.activities, old.objects, old.what_does, old.who_helps, old.how_helps);
    END;

    CREATE TRIGGER IF NOT EXISTS charities_au AFTER UPDATE ON charities BEGIN
      INSERT INTO charities_fts(charities_fts, rowid, charity_number, name, address, postcode, constituency, activities, objects, what_does, who_helps, how_helps)
      VALUES ('delete', old.rowid, old.charity_number, old.name, old.address, old.postcode, old.constituency, old.activities, old.objects, old.what_does, old.who_helps, old.how_helps);
      INSERT INTO charities_fts(rowid, charity_number, name, address, postcode, constituency, activities, objects, what_does, who_helps, how_helps)
      VALUES (new.rowid, new.charity_number, new.name, new.address, new.postcode, new.constituency, new.activities, new.objects, new.what_does, new.who_helps, new.how_helps);
    END;

    CREATE TABLE IF NOT EXISTS favorites (
      charity_key TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      key TEXT PRIMARY KEY,
      label TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_used_at TEXT,
      revoked INTEGER DEFAULT 0
    );
  `)
}

export function rowToCharity(row) {
  if (!row) return null
  return {
    charityNumber: row.charity_number,
    subsidiaryNumber: row.subsidiary_number,
    name: row.name,
    address: row.address || '',
    postcode: row.postcode || '',
    constituency: row.constituency || '',
    phone: row.phone || '',
    email: row.email || '',
    website: row.website || '',
    financialYear: row.financial_year || '',
    income: row.income,
    expenditure: row.expenditure,
    status: row.status || '',
    type: row.type || '',
    howHelps: row.how_helps || '',
    whatDoes: row.what_does || '',
    whoHelps: row.who_helps || '',
    activities: row.activities || '',
    objects: row.objects || '',
    _key: `${row.charity_number}-${row.subsidiary_number}`,
  }
}
