import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscript } from '@/lib/apis/ninjas';
import { formatTranscript } from '@/lib/transcript/formatter';
import { askTranscript } from '@/lib/apis/anthropic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, year, quarter, question, history } = body;

    if (!ticker || !year || !quarter || !question) {
      return NextResponse.json(
        { error: 'Missing required fields: ticker, year, quarter, question' },
        { status: 400 }
      );
    }

    // Fetch transcript
    const transcriptResult = await fetchTranscript(ticker, year, quarter);
    if (!transcriptResult.ok) {
      return NextResponse.json(
        { error: `Transcript not found: ${transcriptResult.error}` },
        { status: transcriptResult.status }
      );
    }

    const formatted = formatTranscript(transcriptResult.data.transcript);
    const result = await askTranscript(
      transcriptResult.data,
      formatted,
      question,
      history
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ask] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
