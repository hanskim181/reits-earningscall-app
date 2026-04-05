import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'path';

/**
 * Clear cache for a specific REIT/quarter so it can be used as a cold-fetch demo target.
 * Usage: DOTENV_CONFIG_PATH=.env.local npx tsx scripts/clear_demo.ts TICKER YEAR QUARTER
 */

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: npx tsx scripts/clear_demo.ts TICKER YEAR QUARTER');
  console.error('Example: npx tsx scripts/clear_demo.ts VTR 2025 3');
  process.exit(1);
}

const [ticker, yearStr, quarterStr] = args;
const year = parseInt(yearStr, 10);
const quarter = parseInt(quarterStr, 10);

const DB_PATH = path.join(process.cwd(), 'data', 'cache.db');
const db = new Database(DB_PATH);

// Clear transcript cache
const tc = db.prepare('DELETE FROM transcript_cache WHERE ticker = ? AND year = ? AND quarter = ?').run(ticker, year, quarter);
console.log(`transcript_cache: deleted ${tc.changes} entries`);

// Clear Claude cache (all 5 analysis types)
import crypto from 'crypto';
const kinds = ['baseline', 'summary', 'sentiment', 'signals', 'kpi_extraction'];
let ccTotal = 0;
for (const kind of kinds) {
  const hash = crypto.createHash('sha256').update(`${kind}:1:${ticker}:${year}:${quarter}`).digest('hex');
  const cc = db.prepare('DELETE FROM claude_cache WHERE prompt_hash = ?').run(hash);
  ccTotal += cc.changes;
}
console.log(`claude_cache: deleted ${ccTotal} entries`);

// Clear API cache for related endpoints
const patterns = [
  `%"ticker":"${ticker}"%`,
  `%${ticker}%`,
];
let acTotal = 0;
for (const pattern of patterns) {
  const ac = db.prepare('DELETE FROM api_cache WHERE params LIKE ?').run(pattern);
  acTotal += ac.changes;
}
console.log(`api_cache: deleted ${acTotal} entries`);

console.log(`\n✅ Cleared all cache for ${ticker} Q${quarter} ${year}`);
db.close();
