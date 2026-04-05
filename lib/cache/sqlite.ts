import Database from 'better-sqlite3';
import path from 'path';
import type { NinjasTranscriptResponse } from '@/lib/types';

const DB_PATH = path.join(process.cwd(), 'data', 'cache.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');

    // Create tables
    _db.exec(`
      CREATE TABLE IF NOT EXISTS transcript_cache (
        ticker TEXT NOT NULL,
        year INTEGER NOT NULL,
        quarter INTEGER NOT NULL,
        payload TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        PRIMARY KEY (ticker, year, quarter)
      );

      CREATE TABLE IF NOT EXISTS api_cache (
        endpoint TEXT NOT NULL,
        params TEXT NOT NULL,
        payload TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        PRIMARY KEY (endpoint, params)
      );

      CREATE TABLE IF NOT EXISTS claude_cache (
        prompt_hash TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_api_cache_endpoint ON api_cache(endpoint);
    `);
  }
  return _db;
}

// --- Transcript cache ---

export function getTranscriptCache(
  ticker: string,
  year: number,
  quarter: number
): NinjasTranscriptResponse | null {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT payload FROM transcript_cache WHERE ticker = ? AND year = ? AND quarter = ?'
    )
    .get(ticker, year, quarter) as { payload: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.payload);
}

export function setTranscriptCache(
  ticker: string,
  year: number,
  quarter: number,
  payload: NinjasTranscriptResponse
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO transcript_cache (ticker, year, quarter, payload, fetched_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(ticker, year, quarter, JSON.stringify(payload), new Date().toISOString());
}

// --- Generic API cache ---

export function getApiCache(endpoint: string, params: string): unknown | null {
  const db = getDb();
  const row = db
    .prepare('SELECT payload FROM api_cache WHERE endpoint = ? AND params = ?')
    .get(endpoint, params) as { payload: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.payload);
}

export function setApiCache(
  endpoint: string,
  params: string,
  payload: unknown
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO api_cache (endpoint, params, payload, fetched_at)
     VALUES (?, ?, ?, ?)`
  ).run(endpoint, params, JSON.stringify(payload), new Date().toISOString());
}

// --- Claude cache ---

export function getClaudeCache(promptHash: string): unknown | null {
  const db = getDb();
  const row = db
    .prepare('SELECT payload FROM claude_cache WHERE prompt_hash = ?')
    .get(promptHash) as { payload: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.payload);
}

export function setClaudeCache(
  promptHash: string,
  kind: string,
  payload: unknown
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO claude_cache (prompt_hash, kind, payload, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(promptHash, kind, JSON.stringify(payload), new Date().toISOString());
}
