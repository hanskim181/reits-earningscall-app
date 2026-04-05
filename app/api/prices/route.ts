import { NextRequest, NextResponse } from 'next/server';
import { fetchPriceReaction } from '@/lib/apis/yahoo';
import type { EarningsTiming } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ticker = searchParams.get('ticker');
  const date = searchParams.get('date');
  const earningsTiming = searchParams.get('earnings_timing') as EarningsTiming | null;

  if (!ticker || !date || !earningsTiming) {
    return NextResponse.json(
      { error: 'Missing required params: ticker, date, earnings_timing' },
      { status: 400 }
    );
  }

  try {
    const result = await fetchPriceReaction(ticker, date, earningsTiming);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[prices] Error for ${ticker}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
