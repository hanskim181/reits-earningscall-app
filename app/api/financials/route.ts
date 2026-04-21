import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { fetchEarnings } from '@/lib/apis/ninjas';
import { getClaudeCache } from '@/lib/cache/sqlite';
import type { Sourced, SourceLabel, ClaudeKPI } from '@/lib/types';

// --- Types for the earnings API response ---

interface EarningsData {
  company_info: {
    ticker: string;
    cik: string;
    fiscal_year: number;
    company_name: string;
    fiscal_quarter: string;
  };
  income_statement: {
    total_revenue: number;
    net_income: number;
    earnings_per_share_diluted: number;
    operating_income: number | null;
    depreciation_and_amortization: number | null;
    interest_expense: number | null;
    [key: string]: unknown;
  };
  balance_sheet: {
    total_debt: number | null;
    long_term_debt: number | null;
    total_liabilities: number | null;
    cash_and_equivalents: number | null;
    total_assets: number | null;
    stockholders_equity: number | null;
    [key: string]: unknown;
  };
  cash_flow: {
    operating_cash_flow: number;
    free_cash_flow: number;
    dividends_paid: number | null;
    [key: string]: unknown;
  };
  filing_info: {
    filing_type: string;
    filing_date: string;
    period_end_date: string;
  };
}

// --- Helpers ---

function sourced<T>(value: T, source: SourceLabel, as_of_date: string): Sourced<T> {
  return { value, source, as_of_date };
}

type PriorQuarter = { year: number; quarter: number };

function getPriorQuarters(year: number, quarter: number, count: number): PriorQuarter[] {
  const result: PriorQuarter[] = [];
  let y = year;
  let q = quarter;
  for (let i = 0; i < count; i++) {
    q -= 1;
    if (q === 0) {
      q = 4;
      y -= 1;
    }
    result.push({ year: y, quarter: q });
  }
  return result;
}

// --- Route handler ---

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ticker = searchParams.get('ticker');
  const year = searchParams.get('year');
  const quarter = searchParams.get('quarter');

  if (!ticker || !year || !quarter) {
    return NextResponse.json(
      { error: 'Missing required params: ticker, year, quarter' },
      { status: 400 }
    );
  }

  const tickerUpper = ticker.toUpperCase();
  const yearNum = parseInt(year, 10);
  const quarterNum = parseInt(quarter, 10);

  if (isNaN(yearNum) || isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
    return NextResponse.json(
      { error: 'Invalid year or quarter' },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch current quarter earnings
    const period = `q${quarterNum}` as 'q1' | 'q2' | 'q3' | 'q4';
    const currentResult = await fetchEarnings(tickerUpper, yearNum, period);

    if (!currentResult.ok) {
      return NextResponse.json(
        { error: currentResult.error },
        { status: currentResult.status }
      );
    }

    const current = currentResult.data as EarningsData;

    // 2. Fetch 7 prior quarters in parallel for trailing 8Q trend
    const priorQuarters = getPriorQuarters(yearNum, quarterNum, 7);
    const priorResults = await Promise.allSettled(
      priorQuarters.map((pq) =>
        fetchEarnings(tickerUpper, pq.year, `q${pq.quarter}` as 'q1' | 'q2' | 'q3' | 'q4')
      )
    );

    // 3. Try to get cached Claude KPIs
    const cacheHash = crypto
      .createHash('sha256')
      .update(`kpi_extraction:1:${tickerUpper}:${yearNum}:${quarterNum}`)
      .digest('hex');
    const cachedKpis = getClaudeCache(cacheHash) as ClaudeKPI[] | null;

    // 4. Extract Claude KPI values if cached
    let ffoPerShare: Sourced<string> | null = null;
    let sameStoreNoiGrowth: Sourced<string> | null = null;
    let occupancy: Sourced<string> | null = null;

    if (cachedKpis && Array.isArray(cachedKpis)) {
      const kpiDate = current.filing_info?.period_end_date ?? new Date().toISOString().slice(0, 10);
      const ffoEntry = cachedKpis.find((k) => k.metric === 'FFO' || k.metric === 'AFFO');
      if (ffoEntry) {
        ffoPerShare = sourced(ffoEntry.value, 'Claude analysis', kpiDate);
      }
      const noiEntry = cachedKpis.find((k) => k.metric === 'same_store_noi');
      if (noiEntry) {
        sameStoreNoiGrowth = sourced(noiEntry.value, 'Claude analysis', kpiDate);
      }
      const occEntry = cachedKpis.find((k) => k.metric === 'occupancy');
      if (occEntry) {
        occupancy = sourced(occEntry.value, 'Claude analysis', kpiDate);
      }
    }

    // 5. Compute quarterly dividend (API Ninjas returns YTD cumulative — subtract prior quarter YTD)
    let dividendQuarterly: number | null = null;
    const currentYtdDividend = current.cash_flow?.dividends_paid ?? null;
    if (currentYtdDividend !== null) {
      if (quarterNum === 1) {
        // Q1 YTD = Q1 quarterly
        dividendQuarterly = currentYtdDividend;
      } else {
        // Q2-Q4: subtract prior quarter YTD
        const priorYtdSettled = priorResults[0]; // Q(n-1) at index 0
        if (priorYtdSettled.status === 'fulfilled' && priorYtdSettled.value.ok) {
          const priorData = priorYtdSettled.value.data as EarningsData;
          const priorYtdDividend = priorData.cash_flow?.dividends_paid ?? null;
          if (priorYtdDividend !== null) {
            dividendQuarterly = currentYtdDividend - priorYtdDividend;
          }
        }
      }
    }

    // 6. Build trailing 8Q array (current + 7 prior)
    const apiSource: SourceLabel = 'API Ninjas (earnings)';
    const filingDate = current.filing_info?.filing_date ?? new Date().toISOString().slice(0, 10);
    const periodEndDate = current.filing_info?.period_end_date ?? filingDate;

    const trailing8q: Array<{
      period: string;
      revenue: number | null;
      net_income: number | null;
      eps: number | null;
    }> = [];

    // Current quarter first
    trailing8q.push({
      period: `Q${quarterNum} ${yearNum}`,
      revenue: current.income_statement?.total_revenue ?? null,
      net_income: current.income_statement?.net_income ?? null,
      eps: current.income_statement?.earnings_per_share_diluted ?? null,
    });

    // Prior quarters
    for (let i = 0; i < priorResults.length; i++) {
      const pq = priorQuarters[i];
      const settled = priorResults[i];

      if (settled.status === 'fulfilled' && settled.value.ok) {
        const data = settled.value.data as EarningsData;
        trailing8q.push({
          period: `Q${pq.quarter} ${pq.year}`,
          revenue: data.income_statement?.total_revenue ?? null,
          net_income: data.income_statement?.net_income ?? null,
          eps: data.income_statement?.earnings_per_share_diluted ?? null,
        });
      } else {
        trailing8q.push({
          period: `Q${pq.quarter} ${pq.year}`,
          revenue: null,
          net_income: null,
          eps: null,
        });
      }
    }

    // 7. Build and return response
    const response = {
      ticker: tickerUpper,
      current_quarter: {
        period_label: `Q${quarterNum} ${yearNum}`,
        filing_date: filingDate,
        revenue: sourced(current.income_statement?.total_revenue ?? null, apiSource, periodEndDate),
        operating_income: sourced(current.income_statement?.operating_income ?? null, apiSource, periodEndDate),
        net_income: sourced(current.income_statement?.net_income ?? null, apiSource, periodEndDate),
        eps: sourced(current.income_statement?.earnings_per_share_diluted ?? null, apiSource, periodEndDate),
        depreciation_and_amortization: sourced(current.income_statement?.depreciation_and_amortization ?? null, apiSource, periodEndDate),
        interest_expense: sourced(current.income_statement?.interest_expense ?? null, apiSource, periodEndDate),
        total_assets: sourced(current.balance_sheet?.total_assets ?? null, apiSource, periodEndDate),
        total_debt: sourced(
          current.balance_sheet?.total_debt
            ?? current.balance_sheet?.long_term_debt
            ?? null,
          apiSource, periodEndDate
        ),
        cash: sourced(current.balance_sheet?.cash_and_equivalents ?? null, apiSource, periodEndDate),
        operating_cash_flow: sourced(current.cash_flow?.operating_cash_flow ?? null, apiSource, periodEndDate),
        dividend_quarterly: sourced(dividendQuarterly, apiSource, periodEndDate),
        ffo_per_share: ffoPerShare,
        same_store_noi_growth: sameStoreNoiGrowth,
        occupancy: occupancy,
      },
      trailing_8q: trailing8q,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error('[/api/financials] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
