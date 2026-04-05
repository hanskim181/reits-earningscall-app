import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://api.api-ninjas.com/v1';
const API_KEY = process.env.API_NINJAS_KEY;

if (!API_KEY) {
  console.error('ERROR: API_NINJAS_KEY not set. Check .env.local');
  process.exit(1);
}

const headers = { 'X-Api-Key': API_KEY };

const FTSE_NAREIT_TOP30_TEST = [
  { ticker: 'WELL', sector: 'Health Care', mcap: 127389.4 },
  { ticker: 'VTR', sector: 'Health Care', mcap: 36347.9 },
  { ticker: 'PLD', sector: 'Industrial', mcap: 118459.0 },
  { ticker: 'EGP', sector: 'Industrial', mcap: 9501.0 },
  { ticker: 'AMT', sector: 'Telecommunications', mcap: 82191.0 },
  { ticker: 'CCI', sector: 'Telecommunications', mcap: 38658.5 },
  { ticker: 'SBAC', sector: 'Telecommunications', mcap: 20895.9 },
  { ticker: 'EQIX', sector: 'Data Centers', mcap: 74945.0 },
  { ticker: 'DLR', sector: 'Data Centers', mcap: 53143.1 },
  { ticker: 'SPG', sector: 'Retail', mcap: 60392.4 },
  { ticker: 'O', sector: 'Retail', mcap: 51539.4 },
  { ticker: 'KIM', sector: 'Retail', mcap: 13773.4 },
  { ticker: 'REG', sector: 'Retail', mcap: 12530.7 },
  { ticker: 'PSA', sector: 'Self Storage', mcap: 45524.4 },
  { ticker: 'EXR', sector: 'Self Storage', mcap: 27636.0 },
  { ticker: 'AVB', sector: 'Residential', mcap: 25812.9 },
  { ticker: 'EQR', sector: 'Residential', mcap: 23951.7 },
  { ticker: 'INVH', sector: 'Residential', mcap: 17032.0 },
  { ticker: 'SUI', sector: 'Residential', mcap: 15323.8 },
  { ticker: 'VICI', sector: 'Gaming', mcap: 30055.0 },
  { ticker: 'GLPI', sector: 'Gaming', mcap: 12647.6 },
  { ticker: 'IRM', sector: 'Specialty', mcap: 24467.6 },
  { ticker: 'WY', sector: 'Timberland', mcap: 17181.7 },
  { ticker: 'HST', sector: 'Lodging/Resorts', mcap: 12299.3 },
  { ticker: 'BXP', sector: 'Office', mcap: 10683.7 },
  { ticker: 'VNO', sector: 'Office', mcap: 6388.0 },
  { ticker: 'WPC', sector: 'Diversified', mcap: 14093.3 },
  { ticker: 'NLY', sector: 'Mortgage', mcap: 15272.6 },
  { ticker: 'AGNC', sector: 'Mortgage', mcap: 11499.6 },
  { ticker: 'STWD', sector: 'Mortgage', mcap: 6612.2 },
];

const TOP3 = ['WELL', 'PLD', 'AMT'];
const RECENT_4Q = [
  { year: 2025, quarter: 3 },
  { year: 2025, quarter: 2 },
  { year: 2025, quarter: 1 },
  { year: 2024, quarter: 4 },
];

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeGet(url: string, params?: Record<string, unknown>) {
  try {
    const res = await axios.get(url, { headers, params });
    return { ok: true as const, data: res.data, status: res.status };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      return {
        ok: false as const,
        data: err.response?.data ?? null,
        status: err.response?.status ?? 0,
        error: err.message,
      };
    }
    return { ok: false as const, data: null, status: 0, error: String(err) };
  }
}

async function main() {
  console.log('\n🔍 Phase 0 — API Ninjas Coverage Verification\n');
  console.log('='.repeat(50));

  // ---- Step 1: Analytics ----
  console.log('\n📊 Step 1: Checking subscription tier...');
  const analyticsRes = await axios
    .get(`${BASE_URL}/analytics`, { params: { api_key: API_KEY } })
    .catch((e: any) => ({ data: null, status: e?.response?.status ?? 0 }));

  let subscriptionTier = 'unknown';
  let currentMonthUsage = -1;
  if (analyticsRes.data) {
    console.log('  Analytics response:', JSON.stringify(analyticsRes.data, null, 2));
    subscriptionTier =
      analyticsRes.data.subscription_tier ?? analyticsRes.data.tier ?? 'unknown';
    currentMonthUsage =
      analyticsRes.data.current_month_usage ?? analyticsRes.data.usage ?? -1;
  } else {
    console.log(
      '  ⚠️ Analytics endpoint returned no data. Status:',
      (analyticsRes as any).status
    );
  }

  // ---- Step 2: List all transcript companies ----
  console.log('\n📋 Step 2: Fetching transcript company list...');
  const listRes = await safeGet(`${BASE_URL}/earningstranscriptlist`);
  let allCompanies: Array<{ ticker: string; name?: string }> = [];
  let listEndpointWorked = false;

  if (listRes.ok && listRes.data) {
    if (Array.isArray(listRes.data)) {
      allCompanies = listRes.data;
      listEndpointWorked = true;
      console.log(
        `  ✅ earningstranscriptlist returned ${allCompanies.length} companies`
      );
      // Show a sample
      console.log(
        `  Sample (first 3): ${JSON.stringify(allCompanies.slice(0, 3))}`
      );
    } else if (typeof listRes.data === 'object') {
      // Maybe it returns an object with a key
      const keys = Object.keys(listRes.data);
      console.log(`  ⚠️ Response is object with keys: ${keys.join(', ')}`);
      console.log(`  Sample: ${JSON.stringify(listRes.data).slice(0, 500)}`);
      // Try to find an array in the response
      for (const key of keys) {
        if (Array.isArray(listRes.data[key])) {
          allCompanies = listRes.data[key];
          listEndpointWorked = true;
          console.log(
            `  ✅ Found array under "${key}" with ${allCompanies.length} entries`
          );
          break;
        }
      }
    }
  } else {
    console.log(
      `  ⚠️ earningstranscriptlist failed (status: ${listRes.status}).`
    );
    if (listRes.data) {
      console.log(`  Response: ${JSON.stringify(listRes.data).slice(0, 300)}`);
    }
  }

  // ---- Step 3: Universe coverage ----
  console.log('\n🌐 Step 3: Checking FTSE Nareit Top 30 coverage...');
  const allTickers = new Set(
    allCompanies.map((c) =>
      (typeof c === 'string' ? c : c.ticker)?.toUpperCase()
    )
  );

  const coverageResults: Record<string, boolean> = {};
  const uncoveredTickers: string[] = [];

  if (listEndpointWorked) {
    for (const reit of FTSE_NAREIT_TOP30_TEST) {
      const covered = allTickers.has(reit.ticker.toUpperCase());
      coverageResults[reit.ticker] = covered;
      if (!covered) uncoveredTickers.push(reit.ticker);
      console.log(
        `  ${covered ? '✅' : '❌'} ${reit.ticker} (${reit.sector})`
      );
    }
  } else {
    // Fallback: test each ticker directly
    console.log('  Using direct transcript fetch as fallback...');
    for (const reit of FTSE_NAREIT_TOP30_TEST) {
      const testRes = await safeGet(`${BASE_URL}/earningstranscript`, {
        ticker: reit.ticker,
        year: 2024,
        quarter: 3,
      });
      const covered = testRes.ok && testRes.data?.transcript;
      coverageResults[reit.ticker] = !!covered;
      if (!covered) uncoveredTickers.push(reit.ticker);
      console.log(
        `  ${covered ? '✅' : '❌'} ${reit.ticker} (${reit.sector}) — status: ${testRes.status}`
      );
      await delay(200);
    }
  }

  const coveredCount = Object.values(coverageResults).filter(Boolean).length;

  // ---- Step 4: Quarter availability ----
  console.log(
    '\n📅 Step 4: Checking quarter availability (earningstranscriptsearch)...'
  );
  const quarterAvailability: Record<
    string,
    {
      total_quarters: number;
      earliest: string;
      latest: string;
      last_4_covered: boolean;
      available: Array<{ year: number; quarter: number }>;
    }
  > = {};

  let searchEndpointWorked = true;
  let last4CoveredCount = 0;

  for (const reit of FTSE_NAREIT_TOP30_TEST) {
    if (!coverageResults[reit.ticker]) {
      console.log(`  ⏭️  ${reit.ticker} — skipped (not covered)`);
      continue;
    }

    const searchRes = await safeGet(`${BASE_URL}/earningstranscriptsearch`, {
      ticker: reit.ticker,
    });

    if (searchRes.status === 404 || searchRes.status === 400) {
      if (searchEndpointWorked) {
        searchEndpointWorked = false;
        console.log(
          `  ⚠️ earningstranscriptsearch returned ${searchRes.status}. Endpoint may not exist.`
        );
        console.log(
          `  Response: ${JSON.stringify(searchRes.data).slice(0, 300)}`
        );
      }
      quarterAvailability[reit.ticker] = {
        total_quarters: 0,
        earliest: 'N/A',
        latest: 'N/A',
        last_4_covered: false,
        available: [],
      };
      continue;
    }

    if (searchRes.ok && searchRes.data) {
      let quarters: Array<{ year: number; quarter: number }> = [];

      if (Array.isArray(searchRes.data)) {
        quarters = searchRes.data.map((q: any) => ({
          year: Number(q.year),
          quarter: Number(q.quarter),
        }));
      } else if (typeof searchRes.data === 'object') {
        // Might be a different format
        console.log(
          `  ⚠️ ${reit.ticker}: unexpected format: ${JSON.stringify(searchRes.data).slice(0, 200)}`
        );
      }

      if (quarters.length > 0) {
        quarters.sort(
          (a, b) => a.year * 10 + a.quarter - (b.year * 10 + b.quarter)
        );
        const earliest = `${quarters[0].year}-Q${quarters[0].quarter}`;
        const latest = `${quarters[quarters.length - 1].year}-Q${quarters[quarters.length - 1].quarter}`;
        const last4 = RECENT_4Q.every((rq) =>
          quarters.some(
            (q) => q.year === rq.year && q.quarter === rq.quarter
          )
        );
        if (last4) last4CoveredCount++;

        quarterAvailability[reit.ticker] = {
          total_quarters: quarters.length,
          earliest,
          latest,
          last_4_covered: last4,
          available: quarters,
        };
        console.log(
          `  ✅ ${reit.ticker}: ${quarters.length}Q (${earliest} → ${latest}) | Last 4Q: ${last4 ? '✅' : '❌'}`
        );
      } else {
        quarterAvailability[reit.ticker] = {
          total_quarters: 0,
          earliest: 'N/A',
          latest: 'N/A',
          last_4_covered: false,
          available: [],
        };
        console.log(`  ❌ ${reit.ticker}: no quarter data parsed`);
      }
    } else {
      quarterAvailability[reit.ticker] = {
        total_quarters: 0,
        earliest: 'N/A',
        latest: 'N/A',
        last_4_covered: false,
        available: [],
      };
      console.log(
        `  ❌ ${reit.ticker}: search failed (status: ${searchRes.status})`
      );
    }

    await delay(150);
  }

  // If search endpoint doesn't work, break out and note it
  if (!searchEndpointWorked) {
    console.log(
      '\n  ℹ️ earningstranscriptsearch is not available. Quarter availability will need fallback approach.'
    );
  }

  // ---- Step 5: Full transcript fetch for Top 3 ----
  console.log(
    '\n🔬 Step 5: Full transcript fetch for Top 3 (WELL, PLD, AMT)...'
  );
  const top3Results: Record<string, any> = {};

  for (const ticker of TOP3) {
    let fetchYear = 2025;
    let fetchQuarter = 3;
    let res = await safeGet(`${BASE_URL}/earningstranscript`, {
      ticker,
      year: fetchYear,
      quarter: fetchQuarter,
    });

    if (!res.ok || !res.data?.transcript) {
      console.log(
        `  ⚠️ ${ticker} Q3 2025 not available (${res.status}), trying Q3 2024...`
      );
      fetchYear = 2024;
      res = await safeGet(`${BASE_URL}/earningstranscript`, {
        ticker,
        year: fetchYear,
        quarter: fetchQuarter,
      });
    }

    if (!res.ok || !res.data?.transcript) {
      console.log(
        `  ⚠️ ${ticker} Q3 2024 not available (${res.status}), trying Q2 2024...`
      );
      fetchQuarter = 2;
      res = await safeGet(`${BASE_URL}/earningstranscript`, {
        ticker,
        year: fetchYear,
        quarter: fetchQuarter,
      });
    }

    const key = `${ticker}_Q${fetchQuarter}_${fetchYear}`;
    if (res.ok && res.data) {
      const d = res.data;
      const fields = Object.keys(d);
      const result = {
        fetched_quarter: `Q${fetchQuarter} ${fetchYear}`,
        fields_present: fields,
        transcript_length:
          typeof d.transcript === 'string' ? d.transcript.length : 0,
        has_participants: Array.isArray(d.participants),
        participants_count: Array.isArray(d.participants)
          ? d.participants.length
          : 0,
        has_summary:
          typeof d.summary === 'string' && d.summary.length > 0,
        summary_length:
          typeof d.summary === 'string' ? d.summary.length : 0,
        has_guidance:
          typeof d.guidance === 'string' && d.guidance.length > 0,
        guidance_length:
          typeof d.guidance === 'string' ? d.guidance.length : 0,
        has_risk_factors:
          typeof d.risk_factors === 'string' && d.risk_factors.length > 0,
        risk_factors_length:
          typeof d.risk_factors === 'string' ? d.risk_factors.length : 0,
        call_time: d.call_time ?? d.earnings_timing ?? 'N/A',
        date: d.date ?? 'N/A',
      };
      top3Results[key] = result;

      console.log(`\n  📄 ${key}:`);
      console.log(`     Fields: ${fields.join(', ')}`);
      console.log(`     Transcript: ${result.transcript_length} chars`);
      console.log(
        `     Participants: ${result.has_participants ? result.participants_count : '❌ NOT PRESENT'}`
      );
      console.log(
        `     Summary: ${result.has_summary ? `${result.summary_length} chars` : '❌ NOT PRESENT'}`
      );
      console.log(
        `     Guidance: ${result.has_guidance ? `${result.guidance_length} chars` : '❌ NOT PRESENT (or empty)'}`
      );
      console.log(
        `     Risk factors: ${result.has_risk_factors ? `${result.risk_factors_length} chars` : '❌ NOT PRESENT (or empty)'}`
      );
      console.log(`     Call time: ${result.call_time}`);

      if (Array.isArray(d.participants) && d.participants.length > 0) {
        console.log(
          `     First participant: ${JSON.stringify(d.participants[0])}`
        );
      }
    } else {
      top3Results[key] = { error: `Failed to fetch (status: ${res.status})` };
      console.log(`  ❌ ${key}: Failed (status: ${res.status})`);
    }
    await delay(300);
  }

  // ---- Step 6: Earnings endpoint ----
  console.log('\n💰 Step 6: Verifying earnings endpoint...');
  const earningsResults: Record<string, any> = {};

  for (const ticker of TOP3) {
    let res = await safeGet(`${BASE_URL}/earnings`, {
      ticker,
      year: 2025,
      period: 'q2',
    });

    if (!res.ok) {
      res = await safeGet(`${BASE_URL}/earnings`, {
        ticker,
        year: 2024,
        period: 'q2',
      });
    }

    if (res.ok && res.data) {
      const data = res.data;
      const isArray = Array.isArray(data);
      const fields = isArray
        ? Object.keys(data[0] ?? {})
        : Object.keys(data);
      earningsResults[ticker] = {
        fields,
        is_array: isArray,
        count: isArray ? data.length : 1,
        sample: JSON.stringify(data).slice(0, 500),
      };
      console.log(`  ✅ ${ticker}: Fields: ${fields.join(', ')}`);
    } else {
      earningsResults[ticker] = { error: `Failed (${res.status})` };
      console.log(`  ❌ ${ticker}: earnings endpoint failed (${res.status})`);
      if (res.data) {
        console.log(
          `     Response: ${JSON.stringify(res.data).slice(0, 300)}`
        );
      }
    }
    await delay(200);
  }

  // ---- Step 7: Earnings calendar ----
  console.log('\n📆 Step 7: Verifying earnings calendar endpoint...');
  const calendarRes = await safeGet(`${BASE_URL}/earningscalendar`, {
    ticker: 'WELL',
    show_upcoming: false,
    limit: 5,
  });
  let calendarResult: any = {};
  if (calendarRes.ok && calendarRes.data) {
    const data = calendarRes.data;
    const isArray = Array.isArray(data);
    calendarResult = {
      success: true,
      count: isArray ? data.length : 1,
      sample: JSON.stringify(data).slice(0, 500),
      fields: isArray ? Object.keys(data[0] ?? {}) : Object.keys(data),
    };
    console.log(`  ✅ Calendar: ${calendarResult.count} entries`);
    console.log(`  Fields: ${calendarResult.fields.join(', ')}`);
    console.log(`  Sample: ${calendarResult.sample}`);
  } else {
    calendarResult = {
      success: false,
      status: calendarRes.status,
      response: JSON.stringify(calendarRes.data).slice(0, 300),
    };
    console.log(
      `  ❌ Calendar endpoint failed (status: ${calendarRes.status})`
    );
    if (calendarRes.data) {
      console.log(
        `  Response: ${JSON.stringify(calendarRes.data).slice(0, 300)}`
      );
    }
  }

  // ---- Build report ----
  const report = {
    generated_at: new Date().toISOString(),
    subscription_tier: subscriptionTier,
    current_month_usage: currentMonthUsage,
    analytics_raw: analyticsRes.data,
    endpoints_verified: {
      earningstranscriptlist: listEndpointWorked,
      earningstranscriptsearch: searchEndpointWorked,
    },
    universe_coverage: {
      total_tested: 30,
      covered: coveredCount,
      coverage_rate: +(coveredCount / 30).toFixed(3),
      uncovered_tickers: uncoveredTickers,
    },
    quarter_availability: quarterAvailability,
    last_4_quarters_coverage: {
      total_with_last_4: last4CoveredCount,
      out_of: coveredCount,
    },
    schema_verification: {
      transcript_endpoint: top3Results,
      earnings_endpoint: earningsResults,
      calendar_endpoint: calendarResult,
    },
  };

  const reportPath = path.join(__dirname, 'coverage_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📁 Report written to: ${reportPath}`);

  // ---- Summary ----
  const allFetched = Object.values(top3Results).every(
    (r: any) => r.fields_present && !r.error
  );
  const hasParticipants = Object.values(top3Results).every(
    (r: any) => r.has_participants
  );
  const hasSummary = Object.values(top3Results).every(
    (r: any) => r.has_summary
  );

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Phase 0 — API Ninjas Coverage Verification     ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(
    `║  Subscription tier: ${subscriptionTier}`.padEnd(51) + '║'
  );
  console.log(
    `║  Universe coverage: ${coveredCount}/30 (${Math.round((coveredCount / 30) * 100)}%)`.padEnd(51) + '║'
  );
  console.log(
    `║  Uncovered: ${uncoveredTickers.length > 0 ? uncoveredTickers.join(', ') : 'none'}`.padEnd(51) + '║'
  );
  console.log(
    `║  /earningstranscriptlist: ${listEndpointWorked ? '✅' : '❌'}`.padEnd(51) + '║'
  );
  console.log(
    `║  /earningstranscriptsearch: ${searchEndpointWorked ? '✅' : '❌'}`.padEnd(51) + '║'
  );
  console.log(
    `║  Top 3 fetched: ${allFetched ? '✅' : '⚠️'}`.padEnd(51) + '║'
  );
  console.log(
    `║  participants field: ${hasParticipants ? '✅ present' : '❌ MISSING'}`.padEnd(51) + '║'
  );
  console.log(
    `║  summary field: ${hasSummary ? '✅ present' : '❌ MISSING'}`.padEnd(51) + '║'
  );
  console.log(
    `║  Last 4Q available: ${last4CoveredCount}/${coveredCount}`.padEnd(51) + '║'
  );
  console.log('╚══════════════════════════════════════════════════╝');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
