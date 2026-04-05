import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscript } from '@/lib/apis/ninjas';
import { formatTranscript } from '@/lib/transcript/formatter';
import {
  generateBaseline,
  generateSummary,
  analyzeSentiment,
  extractSignals,
  extractREITKPIs,
} from '@/lib/apis/anthropic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, year, quarter } = body;

    if (!ticker || !year || !quarter) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: ticker, year, quarter' },
        { status: 400 }
      );
    }

    // 1. Fetch transcript
    const transcriptResult = await fetchTranscript(ticker, year, quarter);
    if (!transcriptResult.ok) {
      return NextResponse.json(
        { ok: false, error: `Transcript not found: ${transcriptResult.error}` },
        { status: transcriptResult.status }
      );
    }

    const transcript = transcriptResult.data;

    // 2. Format
    const formatted = formatTranscript(transcript.transcript);

    // 3. Run all 5 Claude analyses in parallel
    const t0 = Date.now();
    const results = await Promise.allSettled([
      generateBaseline(transcript),
      generateSummary(transcript, formatted),
      analyzeSentiment(transcript, formatted),
      extractSignals(transcript, formatted),
      extractREITKPIs(transcript, formatted),
    ]);
    const elapsed = Date.now() - t0;

    // Extract results, handling partial failures
    const [baselineResult, summaryResult, sentimentResult, signalsResult, kpisResult] = results;

    const errors: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    const extract = <T>(r: PromiseSettledResult<{ result: T; inputTokens: number; outputTokens: number }>, name: string): T | null => {
      if (r.status === 'fulfilled') {
        totalInputTokens += r.value.inputTokens;
        totalOutputTokens += r.value.outputTokens;
        return r.value.result;
      }
      errors.push(`${name}: ${r.reason?.message ?? 'unknown error'}`);
      console.error(`[analyze] ${name} failed:`, r.reason);
      return null;
    };

    const baseline = extract(baselineResult, 'baseline');
    const summary = extract(summaryResult, 'summary');
    const sentiment = extract(sentimentResult, 'sentiment');
    const signals = extract(signalsResult, 'signals');
    const kpis = extract(kpisResult, 'kpis');

    console.log(
      `[analyze] ${ticker} Q${quarter} ${year} | ${elapsed}ms | tokens: in=${totalInputTokens} out=${totalOutputTokens} | errors: ${errors.length}`
    );

    return NextResponse.json({
      ok: true,
      meta: {
        ticker,
        year,
        quarter,
        date: transcript.date,
        earnings_timing: transcript.earnings_timing,
        fetched_at: new Date().toISOString(),
        elapsed_ms: elapsed,
        tokens: { input: totalInputTokens, output: totalOutputTokens },
      },
      transcript_preview: {
        sentence_count: formatted.total_sentences,
        prepared_count: formatted.sections.find((s) => s.type === 'prepared')?.sentences.length ?? 0,
        qa_count: formatted.sections.find((s) => s.type === 'qa')?.sentences.length ?? 0,
      },
      analysis: {
        baseline,
        summary,
        sentiment,
        signals,
        kpis,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze] Fatal error:', message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
