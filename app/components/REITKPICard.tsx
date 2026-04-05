'use client';

import type { ClaudeKPI } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceBadge } from './SourceBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const METRIC_LABELS: Record<string, string> = {
  FFO: 'FFO',
  AFFO: 'AFFO',
  same_store_noi: 'Same-Store NOI',
  occupancy: 'Occupancy',
  leasing_spread: 'Leasing Spread',
  rent_growth: 'Rent Growth',
  cap_rate: 'Cap Rate',
  development_pipeline: 'Dev. Pipeline',
};

type Props = {
  kpis: ClaudeKPI[] | null;
  loading: boolean;
  onHighlightSentence: (id: string | null) => void;
};

export function REITKPICard({ kpis, loading, onHighlightSentence }: Props) {
  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-700 p-4">
        <Skeleton className="h-4 w-24 bg-zinc-800 mb-3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 bg-zinc-800 mb-1.5" />
        ))}
      </Card>
    );
  }

  if (!kpis || kpis.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800 border-dashed p-4">
        <p className="text-zinc-500 text-sm text-center">No REIT KPIs extracted</p>
      </Card>
    );
  }

  // Group by context (period) for visual grouping
  const grouped = new Map<string, ClaudeKPI[]>();
  for (const kpi of kpis) {
    const key = kpi.context || 'Other';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(kpi);
  }

  return (
    <Card className="bg-zinc-900 border-zinc-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          REIT KPIs
        </h3>
        <SourceBadge source="Claude analysis" />
      </div>
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([context, items]) => (
          <div key={context}>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{context}</p>
            <div className="space-y-0.5">
              {items.map((kpi, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger>
                    <div className="w-full text-left flex items-center justify-between px-2 py-1 rounded hover:bg-zinc-800 transition-colors">
                      <span className="text-xs text-zinc-400">
                        {METRIC_LABELS[kpi.metric] ?? kpi.metric}
                      </span>
                      <span className="text-sm font-mono font-medium text-zinc-100">
                        {kpi.value}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs bg-zinc-800 text-zinc-200 text-xs">
                    <p className="italic">&ldquo;{kpi.source_sentence}&rdquo;</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
