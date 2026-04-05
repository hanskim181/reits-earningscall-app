'use client';

import type { PriceReactionResult } from '@/lib/apis/yahoo';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceBadge } from './SourceBadge';
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer,
  Tooltip as RTooltip, ReferenceLine, Legend,
} from 'recharts';

type Props = {
  data: PriceReactionResult | null;
  loading: boolean;
  error: string | null;
  ticker: string;
};

function fmtPct(val: number | null): string {
  if (val === null) return '—';
  return `${val > 0 ? '+' : ''}${(val * 100).toFixed(1)}%`;
}

function pctColor(val: number | null): string {
  if (val === null) return 'text-zinc-500';
  return val > 0 ? 'text-emerald-400' : val < 0 ? 'text-red-400' : 'text-zinc-400';
}

const SERIES_LABELS: Record<string, string> = {
  stock_indexed: '',   // filled dynamically with ticker
  nareit_indexed: 'FTSE Nareit',
  vnq_indexed: 'VNQ',
};

export function PriceReactionChart({ data, loading, error, ticker }: Props) {
  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-700 p-4">
        <Skeleton className="h-4 w-40 bg-zinc-800 mb-2" />
        <Skeleton className="h-[160px] bg-zinc-800 mb-2" />
        <Skeleton className="h-20 bg-zinc-800" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800 border-dashed p-4">
        <p className="text-zinc-500 text-sm text-center">{error ?? 'Price data unavailable'}</p>
      </Card>
    );
  }

  const { summary, chart_series, t_label, earnings_date } = data;

  // Dynamic label map
  const labelMap: Record<string, string> = {
    stock_indexed: ticker,
    nareit_indexed: 'FTSE Nareit',
    vnq_indexed: 'VNQ',
  };

  return (
    <Card className="bg-zinc-900 border-zinc-700 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Post-Earnings Price Reaction
        </h3>
        <SourceBadge source="Yahoo Finance" />
      </div>
      <p className="text-[10px] text-zinc-500 mb-3">{t_label}</p>

      {/* Chart — 3 lines */}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chart_series}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: '#71717a' }}
            interval="preserveStartEnd"
            tickFormatter={(d: string) => d.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#71717a' }}
            domain={['dataMin - 1', 'dataMax + 1']}
            width={35}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <RTooltip
            contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', fontSize: 11 }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(v, name) => [
              (v as number).toFixed(2),
              labelMap[name as string] ?? name,
            ]}
          />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: 10, color: '#a1a1aa' }}
            formatter={(value) => labelMap[value] ?? value}
          />
          <ReferenceLine
            x={earnings_date}
            stroke="#525252"
            strokeDasharray="3 3"
            label={{ value: 'Earnings', fill: '#71717a', fontSize: 9 }}
          />
          {/* 1. The REIT — solid blue, prominent */}
          <Line
            type="monotone"
            dataKey="stock_indexed"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="stock_indexed"
          />
          {/* 2. FTSE Nareit (USRT) — solid teal, medium weight */}
          <Line
            type="monotone"
            dataKey="nareit_indexed"
            stroke="#14b8a6"
            strokeWidth={1.5}
            dot={false}
            name="nareit_indexed"
          />
          {/* 3. VNQ — dashed gray, lightest */}
          <Line
            type="monotone"
            dataKey="vnq_indexed"
            stroke="#71717a"
            strokeWidth={1}
            dot={false}
            strokeDasharray="4 2"
            name="vnq_indexed"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Returns table — 6 columns now */}
      <div className="mt-3 border-t border-zinc-800 pt-2">
        <div className="grid grid-cols-6 gap-1 text-[10px] text-zinc-500 mb-1">
          <span>Horizon</span>
          <span className="text-right">{ticker}</span>
          <span className="text-right">Nareit</span>
          <span className="text-right">VNQ</span>
          <span className="text-right">vs Nareit</span>
          <span className="text-right">vs VNQ</span>
        </div>
        {[
          { label: 'T+1', d: summary.t_plus_1 },
          { label: 'T+5', d: summary.t_plus_5 },
          { label: 'T+20', d: summary.t_plus_20 },
        ].map(({ label, d }) => (
          <div key={label} className="grid grid-cols-6 gap-1 text-xs py-0.5">
            <span className="text-zinc-500 font-mono">{label}</span>
            <span className={`text-right font-mono ${pctColor(d.stock)}`}>{fmtPct(d.stock)}</span>
            <span className={`text-right font-mono ${pctColor(d.nareit)}`}>{fmtPct(d.nareit)}</span>
            <span className={`text-right font-mono ${pctColor(d.vnq)}`}>{fmtPct(d.vnq)}</span>
            <span className={`text-right font-mono font-semibold ${pctColor(d.alpha_vs_nareit)}`}>{fmtPct(d.alpha_vs_nareit)}</span>
            <span className={`text-right font-mono font-semibold ${pctColor(d.alpha_vs_vnq)}`}>{fmtPct(d.alpha_vs_vnq)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
