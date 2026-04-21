'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceBadge } from './SourceBadge';

type SourcedValue = {
  value: number | string | null;
  source: string;
  as_of_date: string;
};

type FinancialsData = {
  ticker: string;
  current_quarter: {
    period_label: string;
    filing_date: string;
    revenue: SourcedValue;
    operating_income: SourcedValue;
    net_income: SourcedValue;
    eps: SourcedValue;
    depreciation_and_amortization: SourcedValue;
    interest_expense: SourcedValue;
    total_assets: SourcedValue;
    total_debt: SourcedValue;
    cash: SourcedValue;
    operating_cash_flow: SourcedValue;
    dividend_quarterly: SourcedValue;
    ffo_per_share: SourcedValue | null;
    same_store_noi_growth: SourcedValue | null;
    occupancy: SourcedValue | null;
  };
  trailing_8q: Array<{
    period: string;
    revenue: number | null;
    net_income: number | null;
    eps: number | null;
  }>;
};

type Props = {
  data: FinancialsData | null;
  loading: boolean;
  error: string | null;
};

function formatNum(val: number | string | null | undefined, prefix = '', suffix = ''): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') return val;
  if (Math.abs(val) >= 1e9) return `${prefix}${(val / 1e9).toFixed(2)}B${suffix}`;
  if (Math.abs(val) >= 1e6) return `${prefix}${(val / 1e6).toFixed(1)}M${suffix}`;
  // Round to 2 decimal places to fix floating-point display (e.g. 0.41000000000000003 → 0.41)
  return `${prefix}${parseFloat(val.toFixed(2))}${suffix}`;
}

export function FinancialDashboard({ data, loading, error }: Props) {
  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-700 p-4">
        <Skeleton className="h-4 w-32 bg-zinc-800 mb-3" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 bg-zinc-800 mb-1.5" />
        ))}
        <Skeleton className="h-20 bg-zinc-800 mt-3" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800 border-dashed p-4">
        <p className="text-zinc-500 text-sm text-center">{error ?? 'Financials unavailable'}</p>
      </Card>
    );
  }

  const cq = data.current_quarter;
  const rows: Array<{ label: string; value: string; source: string; isReit?: boolean }> = [
    { label: 'Revenue', value: formatNum(cq.revenue.value, '$'), source: cq.revenue.source },
    { label: 'Operating Income', value: formatNum(cq.operating_income.value, '$'), source: cq.operating_income.source },
    { label: 'Net Income', value: formatNum(cq.net_income.value, '$'), source: cq.net_income.source },
    { label: 'EPS (Diluted)', value: formatNum(cq.eps.value, '$'), source: cq.eps.source },
    { label: 'D&A', value: formatNum(cq.depreciation_and_amortization.value, '$'), source: cq.depreciation_and_amortization.source },
    { label: 'Interest Expense', value: formatNum(cq.interest_expense.value, '$'), source: cq.interest_expense.source },
    { label: 'Total Assets', value: formatNum(cq.total_assets.value, '$'), source: cq.total_assets.source },
    { label: 'Debt', value: formatNum(cq.total_debt.value, '$'), source: cq.total_debt.source },
    { label: 'Cash', value: formatNum(cq.cash.value, '$'), source: cq.cash.source },
    { label: 'Dividend', value: formatNum(cq.dividend_quarterly.value, '$'), source: cq.dividend_quarterly.source },
  ];

  // Claude-extracted KPIs (FFO, SSNOI, Occupancy) are shown in the Insights Panel
  // rather than here, to avoid displaying inconsistently formatted values from
  // different transcript styles.

  return (
    <Card className="bg-zinc-900 border-zinc-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Financial Snapshot
        </h3>
        <span className="text-[10px] text-zinc-500">{cq.period_label}</span>
      </div>

      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-0.5">
            <span className={`text-xs ${row.isReit ? 'text-amber-400' : 'text-zinc-500'}`}>
              {row.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono text-zinc-100">{row.value}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${row.source.includes('Claude') ? 'bg-amber-500' : 'bg-blue-500'}`}
                title={row.source}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1 flex gap-2 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />API Ninjas</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Claude</span>
      </div>

    </Card>
  );
}
