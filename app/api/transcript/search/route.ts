import { NextRequest, NextResponse } from 'next/server';
import { searchTranscriptAvailability } from '@/lib/apis/ninjas';

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json(
      { error: 'Missing required param: ticker' },
      { status: 400 }
    );
  }

  const result = await searchTranscriptAvailability(ticker.toUpperCase());

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data);
}
