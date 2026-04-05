import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscript } from '@/lib/apis/ninjas';

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

  const result = await fetchTranscript(
    ticker.toUpperCase(),
    parseInt(year, 10),
    parseInt(quarter, 10)
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data);
}
