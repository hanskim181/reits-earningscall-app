import YahooFinance from 'yahoo-finance2';
import { getApiCache, setApiCache } from '@/lib/cache/sqlite';
import type { EarningsTiming } from '@/lib/types';

const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

export type OHLC = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type HorizonReturn = {
  stock: number | null;
  nareit: number | null;  // FTSE Nareit proxy (USRT)
  vnq: number | null;
  alpha_vs_nareit: number | null;
  alpha_vs_vnq: number | null;
};

export type PriceReactionResult = {
  ticker: string;
  earnings_date: string;
  earnings_timing: EarningsTiming;
  t_label: string;
  summary: {
    t_plus_1: HorizonReturn;
    t_plus_5: HorizonReturn;
    t_plus_20: HorizonReturn;
  };
  chart_series: Array<{
    date: string;
    stock_indexed: number;
    nareit_indexed: number;  // FTSE Nareit (USRT)
    vnq_indexed: number;
  }>;
  source: 'Yahoo Finance';
};

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

async function fetchHistorical(ticker: string, period1: string, period2: string): Promise<OHLC[]> {
  const cacheKey = JSON.stringify({ ticker, period1, period2 });
  const cached = getApiCache('yahoo_historical', cacheKey);
  if (cached) {
    console.log(`[yahoo] CACHE_HIT ${ticker} ${period1} → ${period2}`);
    return cached as OHLC[];
  }

  const result = await yf.historical(ticker, {
    period1,
    period2,
    interval: '1d',
  });

  const bars: OHLC[] = result.map((bar: Record<string, unknown>) => ({
    date: formatDate(new Date(bar.date as string)),
    open: Number(bar.open),
    high: Number(bar.high),
    low: Number(bar.low),
    close: Number(bar.close ?? bar.adjClose),
    volume: Number(bar.volume),
  }));

  bars.sort((a, b) => a.date.localeCompare(b.date));

  setApiCache('yahoo_historical', cacheKey, bars);
  console.log(`[yahoo] Fetched ${ticker} ${period1} → ${period2}: ${bars.length} bars`);
  return bars;
}

function getReferenceIndex(
  timing: EarningsTiming,
  bars: OHLC[],
  earningsDate: string
): { t_index: number; t_label: string } {
  const idx = bars.findIndex((b) => b.date === earningsDate);

  if (idx < 0) {
    // Earnings date might be a non-trading day — find closest prior trading day
    const closestIdx = bars.findIndex((b) => b.date > earningsDate) - 1;
    const useIdx = closestIdx >= 0 ? closestIdx : bars.length - 1;

    switch (timing) {
      case 'after_market':
        return { t_index: useIdx, t_label: `Close on nearest trading day (call after market)` };
      case 'before_market':
      case 'during_market':
        return { t_index: Math.max(0, useIdx - 1), t_label: `Prior close (call ${timing.replace('_', ' ')})` };
    }
  }

  switch (timing) {
    case 'after_market':
      return { t_index: idx, t_label: `Close on earnings day (call after market)` };
    case 'before_market':
      return { t_index: Math.max(0, idx - 1), t_label: `Prior close (call before market)` };
    case 'during_market':
      return { t_index: Math.max(0, idx - 1), t_label: `Prior close (call during market)` };
  }
}

function computeReturn(bars: OHLC[], baseIdx: number, targetIdx: number): number | null {
  if (baseIdx < 0 || targetIdx < 0 || baseIdx >= bars.length || targetIdx >= bars.length) {
    return null;
  }
  return (bars[targetIdx].close - bars[baseIdx].close) / bars[baseIdx].close;
}

export async function fetchPriceReaction(
  ticker: string,
  earningsDate: string,
  earningsTiming: EarningsTiming
): Promise<PriceReactionResult> {
  const period1 = addDays(earningsDate, -15);
  const period2 = addDays(earningsDate, 35);

  // Fetch all 3 tickers in parallel:
  // 1. The REIT itself
  // 2. USRT (iShares Core U.S. REIT ETF — tracks FTSE Nareit Equity REITs Index)
  // 3. VNQ (Vanguard Real Estate ETF)
  const [stockBars, nareitBars, vnqBars] = await Promise.all([
    fetchHistorical(ticker, period1, period2),
    fetchHistorical('USRT', period1, period2),
    fetchHistorical('VNQ', period1, period2),
  ]);

  const { t_index: stockT, t_label } = getReferenceIndex(earningsTiming, stockBars, earningsDate);
  const { t_index: nareitT } = getReferenceIndex(earningsTiming, nareitBars, earningsDate);
  const { t_index: vnqT } = getReferenceIndex(earningsTiming, vnqBars, earningsDate);

  // Compute returns at each horizon
  const computeHorizon = (offset: number): HorizonReturn => {
    const stockRet = computeReturn(stockBars, stockT, stockT + offset);
    const nareitRet = computeReturn(nareitBars, nareitT, nareitT + offset);
    const vnqRet = computeReturn(vnqBars, vnqT, vnqT + offset);
    return {
      stock: stockRet,
      nareit: nareitRet,
      vnq: vnqRet,
      alpha_vs_nareit: stockRet !== null && nareitRet !== null ? stockRet - nareitRet : null,
      alpha_vs_vnq: stockRet !== null && vnqRet !== null ? stockRet - vnqRet : null,
    };
  };

  // Build indexed chart series — all 3 lines indexed to 100 at T-1
  const baselineIdx = Math.max(0, stockT - 1);
  const stockBase = stockBars[baselineIdx]?.close ?? 1;
  const nareitBase = nareitBars[Math.max(0, nareitT - 1)]?.close ?? 1;
  const vnqBase = vnqBars[Math.max(0, vnqT - 1)]?.close ?? 1;

  const chartStart = Math.max(0, stockT - 5);
  const chart_series: PriceReactionResult['chart_series'] = [];

  for (let i = chartStart; i < stockBars.length; i++) {
    const stockBar = stockBars[i];
    const nareitBar = nareitBars.find((v) => v.date === stockBar.date);
    const vnqBar = vnqBars.find((v) => v.date === stockBar.date);
    chart_series.push({
      date: stockBar.date,
      stock_indexed: (stockBar.close / stockBase) * 100,
      nareit_indexed: nareitBar ? (nareitBar.close / nareitBase) * 100 : 100,
      vnq_indexed: vnqBar ? (vnqBar.close / vnqBase) * 100 : 100,
    });
  }

  return {
    ticker,
    earnings_date: earningsDate,
    earnings_timing: earningsTiming,
    t_label,
    summary: {
      t_plus_1: computeHorizon(1),
      t_plus_5: computeHorizon(5),
      t_plus_20: computeHorizon(20),
    },
    chart_series,
    source: 'Yahoo Finance',
  };
}
