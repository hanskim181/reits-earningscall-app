'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { TranscriptViewer } from '@/app/components/TranscriptViewer';
import { InsightsPanel } from '@/app/components/InsightsPanel';
import { FinancialDashboard } from '@/app/components/FinancialDashboard';
import { PriceReactionChart } from '@/app/components/PriceReactionChart';
import { SourceBadge } from '@/app/components/SourceBadge';
import { AIDisclosureFooter } from '@/app/components/AIDisclosureFooter';
import { formatTranscript } from '@/lib/transcript/formatter';
import { findREIT } from '@/lib/universe/loader';
import { getSectorColor } from '@/lib/universe/sector_colors';
import type {
  NinjasTranscriptResponse,
  FormattedTranscript,
  ClaudeBaselineAnalysis,
  ClaudeSummary,
  ClaudeSentiment,
  ClaudeSignal,
  ClaudeKPI,
  ClaudeParticipant,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, Users, Check, Loader2, Download } from 'lucide-react';
import Link from 'next/link';

type AnalysisResponse = {
  ok: boolean;
  meta: {
    ticker: string; year: number; quarter: number;
    date: string; earnings_timing: string;
    elapsed_ms: number; tokens: { input: number; output: number };
  };
  analysis: {
    baseline: ClaudeBaselineAnalysis | null;
    summary: ClaudeSummary | null;
    sentiment: ClaudeSentiment | null;
    signals: ClaudeSignal[] | null;
    kpis: ClaudeKPI[] | null;
  };
  errors?: string[];
};

export default function AnalysisPage() {
  const params = useParams<{ ticker: string; year: string; quarter: string }>();
  const { ticker, year, quarter } = params;
  const yearNum = parseInt(year, 10);
  const quarterNum = parseInt(quarter, 10);

  // Transcript state
  const [rawTranscript, setRawTranscript] = useState<NinjasTranscriptResponse | null>(null);
  const [formatted, setFormatted] = useState<FormattedTranscript | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(true);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<AnalysisResponse['analysis'] | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisErrors, setAnalysisErrors] = useState<string[]>([]);
  const [analysisElapsed, setAnalysisElapsed] = useState<number | null>(null);

  // Financials state
  const [financials, setFinancials] = useState<Record<string, unknown> | null>(null);
  const [financialsLoading, setFinancialsLoading] = useState(true);
  const [financialsError, setFinancialsError] = useState<string | null>(null);

  // Price reaction state — starts false, set to true when transcript is ready
  const [priceData, setPriceData] = useState<Record<string, unknown> | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);

  const [highlightSentenceId, setHighlightSentenceId] = useState<string | null>(null);

  const reit = findREIT(ticker);
  const sectorColors = reit ? getSectorColor(reit.sector) : null;

  const handleHighlight = useCallback((id: string | null) => {
    setHighlightSentenceId(id);
    if (id) setTimeout(() => setHighlightSentenceId(null), 5000);
  }, []);

  // Fetch all data in parallel
  useEffect(() => {
    // 1. Transcript
    (async () => {
      setTranscriptLoading(true);
      setTranscriptError(null);
      try {
        const res = await fetch(`/api/transcript?ticker=${ticker}&year=${year}&quarter=${quarter}`);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setTranscriptError(d.error === 'not_found' ? `No transcript for ${ticker} Q${quarter} ${year}` : `Failed (${res.status})`);
          return;
        }
        const data: NinjasTranscriptResponse = await res.json();
        setRawTranscript(data);
        setFormatted(formatTranscript(data.transcript));
      } catch { setTranscriptError('Network error'); }
      finally { setTranscriptLoading(false); }
    })();

    // 2. Analysis
    (async () => {
      setAnalysisLoading(true);
      setAnalysisError(null);
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, year: yearNum, quarter: quarterNum }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setAnalysisError(d.error ?? `Failed (${res.status})`);
          return;
        }
        const data: AnalysisResponse = await res.json();
        setAnalysis(data.analysis);
        setAnalysisElapsed(data.meta.elapsed_ms);
        if (data.errors) setAnalysisErrors(data.errors);
      } catch { setAnalysisError('Network error'); }
      finally { setAnalysisLoading(false); }
    })();

    // 3. Financials
    (async () => {
      setFinancialsLoading(true);
      setFinancialsError(null);
      try {
        const res = await fetch(`/api/financials?ticker=${ticker}&year=${year}&quarter=${quarter}`);
        if (res.ok) {
          setFinancials(await res.json());
        } else {
          setFinancialsError('Failed to load financials');
        }
      } catch { setFinancialsError('Network error'); }
      finally { setFinancialsLoading(false); }
    })();

    // 4. Prices — needs earnings date, so we fetch after transcript is ready
    // We'll trigger it after transcript loads
  }, [ticker, year, quarter, yearNum, quarterNum]);

  // Fetch prices once we have transcript (need date + earnings_timing)
  useEffect(() => {
    if (!rawTranscript?.date || !rawTranscript?.earnings_timing) return;
    let cancelled = false;
    (async () => {
      setPricesLoading(true);
      setPricesError(null);
      try {
        const url = `/api/prices?ticker=${ticker}&date=${rawTranscript.date}&earnings_timing=${rawTranscript.earnings_timing}`;
        const res = await fetch(url);
        if (cancelled) return;
        if (res.ok) {
          setPriceData(await res.json());
        } else {
          const body = await res.text().catch(() => '');
          console.error('[prices] Failed:', res.status, body.slice(0, 200));
          setPricesError('Price data unavailable');
        }
      } catch (e) {
        if (!cancelled) setPricesError('Network error');
      } finally {
        if (!cancelled) setPricesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rawTranscript?.date, rawTranscript?.earnings_timing, ticker]);

  const participants: ClaudeParticipant[] = analysis?.baseline?.participants ?? [];
  const allDone = !transcriptLoading && !analysisLoading && !financialsLoading && !pricesLoading;
  const anyLoading = transcriptLoading || analysisLoading || financialsLoading || pricesLoading;

  // Show full progress narration while transcript is still loading
  if (transcriptLoading && !formatted) {
    return (
      <div className="flex flex-col h-screen bg-zinc-950">
        <Header ticker={ticker} year={year} quarter={quarter} reit={reit} sectorColors={sectorColors} />
        <div className="flex-1 flex items-center justify-center">
          <Card className="bg-zinc-900 border-zinc-700 p-8 max-w-lg">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Loading {ticker} Q{quarter} {year}...
            </h2>
            <div className="space-y-2">
              <ProgressLine done={false} label="Fetching transcript from API Ninjas" />
              <ProgressLine done={false} label="Running 5 parallel Claude analyses" sub="Baseline • Summary • Sentiment • Signals • KPIs" />
              <ProgressLine done={false} label="Fetching 8 quarters of financials" />
              <ProgressLine done={false} label="Computing post-earnings price reaction vs VNQ" />
            </div>
            <p className="text-[10px] text-zinc-600 mt-4">
              First analysis of a REIT takes ~60 seconds. Subsequent loads from cache are instant.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (transcriptError && !formatted) {
    return (
      <div className="flex flex-col h-screen bg-zinc-950">
        <Header ticker={ticker} year={year} quarter={quarter} reit={reit} sectorColors={sectorColors} />
        <div className="flex-1 flex items-center justify-center">
          <Card className="bg-zinc-900 border-zinc-700 p-8 max-w-md text-center">
            <p className="text-zinc-400 text-sm">{transcriptError}</p>
            <Link href="/" className="text-blue-400 text-sm hover:underline mt-4 block">Back to Dashboard</Link>
          </Card>
        </div>
        <AIDisclosureFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <Header
        ticker={ticker} year={year} quarter={quarter}
        reit={reit} sectorColors={sectorColors}
        date={rawTranscript?.date} earningsTiming={rawTranscript?.earnings_timing}
      />

      {/* Progress banner (shows during loading, auto-hides) */}
      {anyLoading && (
        <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-2 flex items-center gap-4 text-xs">
          <ProgressDot done={!transcriptLoading} label="Transcript" />
          <ProgressDot done={!analysisLoading} label="AI Analysis" />
          <ProgressDot done={!financialsLoading} label="Financials" />
          <ProgressDot done={!pricesLoading} label="Prices" />
          {analysisLoading && (
            <span className="text-zinc-500 ml-auto">First analysis takes ~60s...</span>
          )}
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left: Transcript (5 cols) */}
        <div className="col-span-5 border-r border-zinc-800 overflow-hidden flex flex-col min-h-0">
          {formatted && (
            <TranscriptViewer transcript={formatted} highlightSentenceId={highlightSentenceId} />
          )}
          <div className="border-t border-zinc-800 p-3 flex-shrink-0">
            {participants.length > 0 ? (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="h-3 w-3 text-zinc-500" />
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Participants ({participants.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {participants.map((p, i) => (
                    <Badge key={i} variant="outline"
                      className={`text-[10px] ${participantColor(p.speaker_type)}`}
                      title={`${p.role} — ${p.company}`}
                    >{p.name}</Badge>
                  ))}
                </div>
              </div>
            ) : analysisLoading ? (
              <Skeleton className="h-4 w-48 bg-zinc-800" />
            ) : (
              <p className="text-[10px] text-zinc-600 italic">No participants extracted</p>
            )}
          </div>
        </div>

        {/* Center: Insights (4 cols) */}
        <div className="col-span-4 overflow-hidden">
          <InsightsPanel
            analysis={analysis} loading={analysisLoading}
            error={analysisError} errors={analysisErrors}
            onHighlightSentence={handleHighlight}
            ticker={ticker} year={yearNum} quarter={quarterNum}
          />
        </div>

        {/* Right: Metadata + KPIs + Financials + Prices (3 cols) */}
        <div className="col-span-3 border-l border-zinc-800 overflow-y-auto p-4 space-y-4">
          <Card className="bg-zinc-900 border-zinc-700 p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Call Details</h3>
            <div className="space-y-2 text-sm">
              <MetadataRow label="Date" value={rawTranscript?.date ?? 'N/A'} />
              <MetadataRow label="Timing" value={rawTranscript?.earnings_timing?.replace(/_/g, ' ') ?? 'N/A'} />
              <MetadataRow label="CIK" value={rawTranscript?.cik ?? 'N/A'} />
              <MetadataRow label="Transcript" value={`${(rawTranscript?.transcript.length ?? 0).toLocaleString()} chars`} />
              <MetadataRow label="Turns" value={String(formatted?.total_sentences ?? 0)} />
            </div>
            <div className="mt-3"><SourceBadge source="API Ninjas (transcript)" /></div>
          </Card>

          <FinancialDashboard
            data={financials as any}
            loading={financialsLoading}
            error={financialsError}
          />

          <PriceReactionChart
            data={priceData as any}
            loading={pricesLoading}
            error={pricesError}
            ticker={ticker}
          />
        </div>
      </div>

      <AIDisclosureFooter />
    </div>
  );
}

// --- Helper components ---

function ProgressLine({ done, label, sub }: { done: boolean; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2">
      {done ? (
        <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
      ) : (
        <Loader2 className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />
      )}
      <div>
        <p className={`text-sm ${done ? 'text-zinc-400' : 'text-zinc-200'}`}>{label}</p>
        {sub && <p className="text-[10px] text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressDot({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1">
      {done ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
      )}
      <span className={`${done ? 'text-zinc-500' : 'text-zinc-300'}`}>{label}</span>
    </div>
  );
}

function Header({
  ticker, year, quarter, reit, sectorColors, date, earningsTiming,
}: {
  ticker: string; year: string; quarter: string;
  reit: ReturnType<typeof findREIT>;
  sectorColors: ReturnType<typeof getSectorColor> | null;
  date?: string; earningsTiming?: string;
}) {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm px-4 py-2.5 flex items-center gap-4 flex-shrink-0">
      <Link href="/dashboard" className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors">
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="flex items-center gap-2.5">
        <span className="font-mono font-bold text-base text-zinc-100">{ticker}</span>
        {reit && (
          <>
            <span className="text-sm text-zinc-400 hidden sm:inline">{reit.company_name}</span>
            {sectorColors && (
              <Badge variant="outline" className={`text-[10px] ${sectorColors.bg} ${sectorColors.text} ${sectorColors.border}`}>
                {reit.sector}
              </Badge>
            )}
          </>
        )}
      </div>

      <div className="h-4 w-px bg-zinc-800 mx-1" />

      <Badge variant="outline" className="font-mono text-[11px] text-zinc-300 border-zinc-700/60">
        Q{quarter} {year}
      </Badge>
      {date && (
        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
          <Calendar className="h-3 w-3" />{date}
        </span>
      )}
      {earningsTiming && (
        <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700/60">
          {earningsTiming.replace(/_/g, ' ')}
        </Badge>
      )}

      <div className="ml-auto">
        <a
          href={`/api/export/pdf?ticker=${ticker}&year=${year}&quarter=${quarter}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
        >
          <Download className="h-3.5 w-3.5" />
          Export PDF
        </a>
      </div>
    </header>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-300 font-mono text-xs">{value}</span>
    </div>
  );
}

function participantColor(type: string) {
  switch (type) {
    case 'executive': return 'text-blue-300 border-blue-700/50';
    case 'analyst': return 'text-amber-300 border-amber-700/50';
    case 'operator': return 'text-zinc-400 border-zinc-700';
    default: return 'text-zinc-400 border-zinc-700';
  }
}
