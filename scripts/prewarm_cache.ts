import 'dotenv/config';

/**
 * Pre-warm cache for demo reliability.
 * Populates SQLite with full analysis for top REITs × recent quarters.
 * Run once before pitch day: DOTENV_CONFIG_PATH=.env.local npx tsx scripts/prewarm_cache.ts
 */

const BASE_URL = 'http://localhost:3000';

const DEMO_REITS = [
  { ticker: 'WELL', name: 'Welltower', sector: 'Health Care' },
  { ticker: 'PLD', name: 'Prologis', sector: 'Industrial' },
  { ticker: 'AMT', name: 'American Tower', sector: 'Telecommunications' },
  { ticker: 'EQIX', name: 'Equinix', sector: 'Data Centers' },
  { ticker: 'DLR', name: 'Digital Realty', sector: 'Data Centers' },
  { ticker: 'SPG', name: 'Simon Property', sector: 'Retail' },
  { ticker: 'PSA', name: 'Public Storage', sector: 'Self Storage' },
  { ticker: 'O', name: 'Realty Income', sector: 'Retail' },
  { ticker: 'AVB', name: 'AvalonBay', sector: 'Residential' },
  { ticker: 'VICI', name: 'VICI Properties', sector: 'Gaming' },
];

const QUARTERS = [
  { year: 2025, quarter: 3 },
  { year: 2025, quarter: 2 },
];

async function warmOne(ticker: string, year: number, quarter: number): Promise<{
  ok: boolean;
  elapsed: number;
  tokens: { input: number; output: number };
  error?: string;
}> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, year, quarter }),
    });
    const elapsed = Date.now() - t0;
    const data = await res.json();

    if (data.ok) {
      return {
        ok: true,
        elapsed,
        tokens: data.meta?.tokens ?? { input: 0, output: 0 },
      };
    }
    return { ok: false, elapsed, tokens: { input: 0, output: 0 }, error: data.error };
  } catch (e: unknown) {
    return {
      ok: false,
      elapsed: Date.now() - t0,
      tokens: { input: 0, output: 0 },
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

async function main() {
  console.log('\n🔥 RTIP Pre-Warm Cache Script\n');
  console.log(`REITs: ${DEMO_REITS.length}`);
  console.log(`Quarters: ${QUARTERS.map((q) => `Q${q.quarter} ${q.year}`).join(', ')}`);
  console.log(`Total analyses: ${DEMO_REITS.length * QUARTERS.length}`);
  console.log('='.repeat(60));

  // Check server is running
  try {
    const health = await fetch(`${BASE_URL}/dashboard`);
    if (!health.ok) throw new Error(`Status ${health.status}`);
  } catch {
    console.error('\n❌ Dev server not running at', BASE_URL);
    console.error('   Start it first: npm run dev\n');
    process.exit(1);
  }

  const t0 = Date.now();
  let totalSuccess = 0;
  let totalFail = 0;
  let totalInput = 0;
  let totalOutput = 0;

  // Process sequentially to avoid overwhelming Claude API
  for (const reit of DEMO_REITS) {
    for (const q of QUARTERS) {
      const label = `${reit.ticker} Q${q.quarter} ${q.year}`;
      process.stdout.write(`  ${label.padEnd(20)}`);

      const result = await warmOne(reit.ticker, q.year, q.quarter);

      if (result.ok) {
        totalSuccess++;
        totalInput += result.tokens.input;
        totalOutput += result.tokens.output;
        const cached = result.tokens.input === 0 ? ' (cached)' : '';
        console.log(`✅ ${(result.elapsed / 1000).toFixed(1)}s | in=${result.tokens.input} out=${result.tokens.output}${cached}`);
      } else {
        totalFail++;
        console.log(`❌ ${result.error}`);
      }
    }
  }

  const totalElapsed = Date.now() - t0;
  const estCost = (totalInput * 3 / 1_000_000) + (totalOutput * 15 / 1_000_000); // rough Sonnet pricing

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Complete: ${totalSuccess}/${totalSuccess + totalFail} analyses`);
  console.log(`⏱  Total time: ${(totalElapsed / 1000 / 60).toFixed(1)} minutes`);
  console.log(`🔤 Total tokens: in=${totalInput.toLocaleString()} out=${totalOutput.toLocaleString()}`);
  console.log(`💰 Estimated cost: $${estCost.toFixed(2)}`);
  if (totalFail > 0) {
    console.log(`\n⚠️  ${totalFail} analyses failed — re-run to retry (cached ones will be instant)`);
  }
}

main().catch(console.error);
