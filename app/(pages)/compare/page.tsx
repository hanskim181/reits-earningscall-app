'use client';

import { useState, useCallback } from 'react';
import { NavBar } from '@/app/components/NavBar';
import { AIDisclosureFooter } from '@/app/components/AIDisclosureFooter';
import { getREITUniverse } from '@/lib/universe/loader';
import { getSectorColor } from '@/lib/universe/sector_colors';
import type {
  REIT,
  ClaudeBaselineAnalysis,
  ClaudeSummary,
  ClaudeSentiment,
  ClaudeSignal,
  ClaudeKPI,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, X, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type AnalysisResult = {
  baseline: ClaudeBaselineAnalysis | null;
  summary: ClaudeSummary | null;
  sentiment: ClaudeSentiment | null;
  signals: ClaudeSignal[] | null;
  kpis: ClaudeKPI[] | null;
};

type CompareEntry = {
  ticker: string;
  reit: REIT;
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
};

export default function ComparePage() {
  const reits = getREITUniverse();
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<CompareEntry[]>([]);
  const [year] = useState(2025);
  const [quarter] = useState(3);

  const filteredReits = search.trim()
    ? reits.filter(
        (r) =>
          r.ticker.toLowerCase().includes(search.toLowerCase()) ||
          r.company_name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 10)
    : [];

  const addReit = useCallback(async (reit: REIT) => {
    if (entries.length >= 3) return;
    if (entries.some((e) => e.ticker === reit.ticker)) return;

    const entry: CompareEntry = {
      ticker: reit.ticker,
      reit,
      analysis: null,
      loading: true,
      error: null,
    };
    setEntries((prev) => [...prev, entry]);
    setSearch('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: reit.ticker, year, quarter }),
      });
      if (res.ok) {
        const data = await res.json();
        setEntries((prev) =>
          prev.map((e) =>
            e.ticker === reit.ticker ? { ...e, analysis: data.analysis, loading: false } : e
          )
        );
      } else {
        setEntries((prev) =>
          prev.map((e) =>
            e.ticker === reit.ticker ? { ...e, error: 'Analysis failed', loading: false } : e
          )
        );
      }
    } catch {
      setEntries((prev) =>
        prev.map((e) =>
          e.ticker === reit.ticker ? { ...e, error: 'Network error', loading: false } : e
        )
      );
    }
  }, [entries, year, quarter]);

  const removeReit = (ticker: string) => {
    setEntries((prev) => prev.filter((e) => e.ticker !== ticker));
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <NavBar />

      {/* Compare controls */}
      <div className="border-b border-zinc-800/60 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-300">Compare REITs</h2>
          <Badge variant="outline" className="font-mono text-[10px] text-zinc-500 border-zinc-700/60">
            Q{quarter} {year}
          </Badge>
        </div>
        {entries.length < 3 && (
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              placeholder="Search and add REIT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-zinc-900/80 border-zinc-700/60 text-zinc-100"
            />
            {filteredReits.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg z-50 max-h-48 overflow-y-auto shadow-xl">
                {filteredReits.map((r) => {
                  const colors = getSectorColor(r.sector);
                  return (
                    <button
                      key={r.ticker}
                      onClick={() => addReit(r)}
                      className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 flex items-center gap-2 text-sm"
                    >
                      <span className="font-mono font-bold">{r.ticker}</span>
                      <span className="text-zinc-400 truncate flex-1">{r.company_name}</span>
                      <Badge variant="outline" className={`text-[10px] ${colors.bg} ${colors.text}`}>
                        {r.sector}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <main className="flex-1 overflow-auto p-6">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Card className="bg-zinc-900 border-zinc-700 p-8 text-center max-w-md">
              <Plus className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">Search and add 2-3 REITs to compare side by side</p>
              <p className="text-xs text-zinc-600 mt-2">Try EQIX + DLR (Data Centers) or WELL + VTR (Health Care)</p>
            </Card>
          </div>
        ) : (
          <div className={`grid gap-4 ${entries.length === 2 ? 'grid-cols-2' : entries.length === 3 ? 'grid-cols-3' : 'grid-cols-1 max-w-lg mx-auto'}`}>
            {entries.map((entry, colIdx) => (
              <CompareColumn key={entry.ticker} entry={entry} onRemove={removeReit} colIdx={colIdx} year={year} quarter={quarter} />
            ))}
          </div>
        )}
      </main>

      <AIDisclosureFooter />
    </div>
  );
}

function CompareColumn({ entry, onRemove, colIdx, year, quarter }: { entry: CompareEntry; onRemove: (t: string) => void; colIdx: number; year: number; quarter: number }) {
  const colors = getSectorColor(entry.reit.sector);
  const a = entry.analysis;
  const bg = colIdx % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-900/60';

  if (entry.loading) {
    return (
      <Card className={`${bg} border-zinc-700 p-4`}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono font-bold text-lg">{entry.ticker}</span>
          <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 bg-zinc-800" />
          ))}
        </div>
      </Card>
    );
  }

  if (entry.error) {
    return (
      <Card className={`${bg} border-zinc-700 p-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono font-bold">{entry.ticker}</span>
          <button onClick={() => onRemove(entry.ticker)} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-red-400">{entry.error}</p>
      </Card>
    );
  }

  const se = a?.sentiment;
  const kpis = a?.kpis ?? [];
  const signals = a?.signals ?? [];
  const themes = a?.summary?.key_themes ?? [];

  // Extract key KPIs
  const findKpi = (metric: string) => kpis.find((k) => k.metric === metric);
  const ffo = findKpi('FFO');
  const ssnoi = findKpi('same_store_noi');
  const occ = findKpi('occupancy');

  return (
    <Card className={`${bg} border-zinc-700 p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-mono font-bold text-lg">{entry.ticker}</span>
          <span className="text-xs text-zinc-400 ml-2">{entry.reit.company_name}</span>
        </div>
        <button onClick={() => onRemove(entry.ticker)} className="text-zinc-500 hover:text-zinc-300">
          <X className="h-4 w-4" />
        </button>
      </div>
      <Badge variant="outline" className={`text-[10px] mb-4 ${colors.bg} ${colors.text} ${colors.border}`}>
        {entry.reit.sector}
      </Badge>

      {/* Sentiment */}
      {se && (
        <Section title="Sentiment">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-mono font-bold ${scoreColor(se.overall.score)}`}>
              {se.overall.score > 0 ? '+' : ''}{se.overall.score.toFixed(2)}
            </span>
            <div className="text-xs text-zinc-500">
              <div>Prepared: {se.sections.prepared.toFixed(2)}</div>
              <div>Q&A: {se.sections.qa.toFixed(2)}</div>
            </div>
          </div>
        </Section>
      )}

      {/* Key KPIs */}
      <Section title="Key KPIs">
        <div className="space-y-1">
          <KpiRow label="FFO" value={ffo?.value} context={ffo?.context} />
          <KpiRow label="SS NOI" value={ssnoi?.value} context={ssnoi?.context} />
          <KpiRow label="Occupancy" value={occ?.value} context={occ?.context} />
        </div>
        <div className="text-[10px] text-zinc-600 mt-1">{kpis.length} total KPIs extracted</div>
      </Section>

      {/* Top Themes */}
      <Section title="Key Themes">
        {themes.slice(0, 3).map((t, i) => (
          <div key={i} className="mb-1.5">
            <p className="text-xs font-medium text-zinc-200">{t.title}</p>
            <p className="text-[10px] text-zinc-500">{t.rationale}</p>
          </div>
        ))}
      </Section>

      {/* Signal breakdown */}
      <Section title="Signals">
        <Link
          href={`/analysis/${entry.ticker}/${year}/${quarter}`}
          className="block hover:bg-zinc-800/50 rounded-md p-2 -mx-2 transition-colors group"
        >
          <div className="flex gap-2 text-xs">
            <span className="text-emerald-400">{signals.filter((s) => s.polarity === 'positive').length} positive</span>
            <span className="text-red-400">{signals.filter((s) => s.polarity === 'negative').length} negative</span>
            <span className="text-zinc-400">{signals.filter((s) => s.polarity === 'neutral').length} neutral</span>
          </div>
          <div className="flex gap-1 mt-1.5 text-[10px]">
            <Badge variant="outline" className="border-zinc-700">
              Sector: {signals.filter((s) => s.category === 'Sector').length}
            </Badge>
            <Badge variant="outline" className="border-zinc-700">
              Geo: {signals.filter((s) => s.category === 'Geography').length}
            </Badge>
            <Badge variant="outline" className="border-zinc-700">
              Macro: {signals.filter((s) => s.category === 'Macro').length}
            </Badge>
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="h-3 w-3" />
            View full signal analysis
          </div>
        </Link>
      </Section>

      {/* Guidance count */}
      {a?.baseline && (
        <Section title="Guidance & Risks">
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-zinc-500">Guidance: </span>
              <span className="font-mono text-zinc-200">{a.baseline.forward_guidance.length}</span>
            </div>
            <div>
              <span className="text-zinc-500">Risks: </span>
              <span className="font-mono text-zinc-200">{a.baseline.risk_factors.length}</span>
            </div>
            <div>
              <span className="text-zinc-500">People: </span>
              <span className="font-mono text-zinc-200">{a.baseline.participants.length}</span>
            </div>
          </div>
        </Section>
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{title}</h3>
      {children}
    </div>
  );
}

function KpiRow({ label, value, context }: { label: string; value?: string; context?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-400">{label}</span>
      <div className="text-right">
        <span className="text-sm font-mono text-zinc-100">{value ?? '—'}</span>
        {context && <span className="text-[10px] text-zinc-600 ml-1">{context.slice(0, 25)}</span>}
      </div>
    </div>
  );
}

function scoreColor(score: number) {
  if (score > 0.2) return 'text-emerald-400';
  if (score < -0.2) return 'text-red-400';
  return 'text-amber-400';
}
