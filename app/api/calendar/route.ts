import { NextRequest, NextResponse } from 'next/server';
import { fetchEarningsCalendar } from '@/lib/apis/ninjas';
import { fetchUpcomingEarningsBatch } from '@/lib/apis/yahoo';
import { getREITUniverse } from '@/lib/universe/loader';
import type { REIT } from '@/lib/types';

// --- Types ---

interface CalendarEvent {
  ticker: string;
  company_name: string;
  sector: string;
  date: string;
  earnings_timing: string | null;
  actual_eps: number | null;
  estimated_eps: number | null;
  source: 'API Ninjas (calendar)';
}

interface RawCalendarEntry {
  ticker?: string;
  pricedate?: string;
  earnings_date?: string;
  date?: string;
  earnings_timing?: string;
  actual_eps?: number;
  estimated_eps?: number;
  [key: string]: unknown;
}

// --- Helpers ---

function buildUniverseMap(reits: REIT[]): Map<string, REIT> {
  const map = new Map<string, REIT>();
  for (const r of reits) {
    map.set(r.ticker, r);
  }
  return map;
}

function extractDate(entry: RawCalendarEntry): string {
  return (entry.pricedate ?? entry.earnings_date ?? entry.date ?? '') as string;
}

// --- Mode handlers ---

async function handlePast(universe: REIT[], universeMap: Map<string, REIT>): Promise<CalendarEvent[]> {
  // Top 50 REITs by market cap for broader coverage
  const top50 = universe.slice(0, 50);

  const results = await Promise.allSettled(
    top50.map((reit) => fetchEarningsCalendar(reit.ticker, false, 4))
  );

  const events: CalendarEvent[] = [];

  for (let i = 0; i < results.length; i++) {
    const settled = results[i];
    const reit = top50[i];

    if (settled.status !== 'fulfilled' || !settled.value.ok) continue;

    const entries = settled.value.data as RawCalendarEntry[];
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      const date = extractDate(entry);
      if (!date) continue;

      events.push({
        ticker: reit.ticker,
        company_name: reit.company_name,
        sector: reit.sector,
        date,
        earnings_timing: entry.earnings_timing ?? null,
        actual_eps: entry.actual_eps ?? null,
        estimated_eps: entry.estimated_eps ?? null,
        source: 'API Ninjas (calendar)',
      });
    }
  }

  // Sort by date descending
  events.sort((a, b) => b.date.localeCompare(a.date));
  return events;
}

async function handleUpcoming(universe: REIT[], universeMap: Map<string, REIT>): Promise<CalendarEvent[]> {
  // Use Yahoo Finance calendarEvents for upcoming earnings dates.
  // Fetch top 50 REITs by market cap for broad coverage.
  const top50 = universe.slice(0, 50);
  const tickers = top50.map((r) => r.ticker);

  const yahooResults = await fetchUpcomingEarningsBatch(tickers);

  const today = new Date().toISOString().slice(0, 10);
  const events: CalendarEvent[] = [];

  for (const result of yahooResults) {
    // Only include future dates
    if (result.earnings_date <= today) continue;

    const reit = universeMap.get(result.ticker);
    if (!reit) continue;

    // Map Yahoo's BMO/AMC to earnings_timing format
    let earningsTiming: string | null = null;
    if (result.earnings_time === 'BMO') earningsTiming = 'before_market';
    else if (result.earnings_time === 'AMC') earningsTiming = 'after_market';

    events.push({
      ticker: reit.ticker,
      company_name: reit.company_name,
      sector: reit.sector,
      date: result.earnings_date,
      earnings_timing: earningsTiming,
      actual_eps: null, // upcoming — no actuals yet
      estimated_eps: result.eps_estimate_avg,
      source: 'API Ninjas (calendar)', // keep consistent label
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

async function handleMonth(
  month: string,
  universe: REIT[],
  universeMap: Map<string, REIT>
): Promise<CalendarEvent[]> {
  // Combine past + upcoming, then filter to the specified month (YYYY-MM)
  const [pastEvents, upcomingEvents] = await Promise.all([
    handlePast(universe, universeMap),
    handleUpcoming(universe, universeMap),
  ]);

  const all = [...pastEvents, ...upcomingEvents];

  // Deduplicate by ticker+date
  const seen = new Set<string>();
  const deduped: CalendarEvent[] = [];
  for (const evt of all) {
    const key = `${evt.ticker}:${evt.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(evt);
    }
  }

  // Filter to specified month
  const filtered = deduped.filter((evt) => evt.date.startsWith(month));

  // Sort by date ascending
  filtered.sort((a, b) => a.date.localeCompare(b.date));
  return filtered;
}

// --- Route handler ---

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get('mode');
  const month = searchParams.get('month');
  const sector = searchParams.get('sector');
  const limitParam = searchParams.get('limit');

  if (!mode || !['past', 'upcoming', 'month'].includes(mode)) {
    return NextResponse.json(
      { error: 'Missing or invalid mode param. Must be one of: past, upcoming, month' },
      { status: 400 }
    );
  }

  if (mode === 'month' && !month) {
    return NextResponse.json(
      { error: 'month param (YYYY-MM) is required when mode=month' },
      { status: 400 }
    );
  }

  try {
    const universe = getREITUniverse();
    const universeMap = buildUniverseMap(universe);

    let events: CalendarEvent[];

    switch (mode) {
      case 'past':
        events = await handlePast(universe, universeMap);
        break;
      case 'upcoming':
        events = await handleUpcoming(universe, universeMap);
        break;
      case 'month':
        events = await handleMonth(month!, universe, universeMap);
        break;
      default:
        events = [];
    }

    // Apply sector filter if provided
    if (sector) {
      events = events.filter(
        (evt) => evt.sector.toLowerCase() === sector.toLowerCase()
      );
    }

    // Apply limit if provided
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        events = events.slice(0, limit);
      }
    }

    return NextResponse.json({ events, count: events.length });
  } catch (err: unknown) {
    console.error('[/api/calendar] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
