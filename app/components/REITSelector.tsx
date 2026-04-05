'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { REIT, AvailableQuarter } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSectorColor } from '@/lib/universe/sector_colors';
import { Search, ChevronRight, TrendingUp } from 'lucide-react';

type Props = { reits: REIT[] };

export function REITSelector({ reits }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [quarters, setQuarters] = useState<AvailableQuarter[]>([]);
  const [quartersLoading, setQuartersLoading] = useState(false);

  const sectors = useMemo(() => {
    const set = new Set(reits.map((r) => r.sector));
    return Array.from(set).sort();
  }, [reits]);

  const filtered = useMemo(() => {
    let list = reits;
    if (sectorFilter) list = list.filter((r) => r.sector === sectorFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.ticker.toLowerCase().includes(q) || r.company_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reits, search, sectorFilter]);

  const handleSelectREIT = useCallback(async (ticker: string) => {
    setSelectedTicker(ticker);
    setQuartersLoading(true);
    try {
      const res = await fetch(`/api/transcript/search?ticker=${ticker}`);
      if (res.ok) {
        const data: AvailableQuarter[] = await res.json();
        data.sort((a, b) => b.year * 10 + b.quarter - (a.year * 10 + a.quarter));
        setQuarters(data);
      } else { setQuarters([]); }
    } catch { setQuarters([]); }
    finally { setQuartersLoading(false); }
  }, []);

  const selectedReit = reits.find((r) => r.ticker === selectedTicker);

  return (
    <div className="flex gap-6 h-full">
      {/* Left: REIT list */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by ticker or company name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-zinc-900/80 border-zinc-700/60 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-600/50 focus:ring-blue-600/20"
          />
        </div>

        {/* Sector chips */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={sectorFilter === null ? 'default' : 'outline'}
            className="cursor-pointer text-xs px-2.5 py-0.5"
            onClick={() => setSectorFilter(null)}
          >
            All ({reits.length})
          </Badge>
          {sectors.map((s) => {
            const colors = getSectorColor(s);
            const count = reits.filter((r) => r.sector === s).length;
            return (
              <Badge
                key={s}
                variant="outline"
                className={`cursor-pointer text-xs px-2.5 py-0.5 transition-colors ${
                  sectorFilter === s
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : 'text-zinc-400 border-zinc-700/60 hover:border-zinc-500'
                }`}
                onClick={() => setSectorFilter(sectorFilter === s ? null : s)}
              >
                {s} ({count})
              </Badge>
            );
          })}
        </div>

        {/* Results count */}
        <p className="text-xs text-zinc-500">
          {filtered.length} {filtered.length === 1 ? 'REIT' : 'REITs'} shown
          {sectorFilter && ` in ${sectorFilter}`}
        </p>

        {/* REIT list */}
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
          {filtered.map((reit) => {
            const colors = getSectorColor(reit.sector);
            const isSelected = selectedTicker === reit.ticker;
            return (
              <button
                key={reit.ticker}
                onClick={() => handleSelectREIT(reit.ticker)}
                className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-all ${
                  isSelected
                    ? 'bg-zinc-800/80 ring-1 ring-blue-600/30 shadow-sm'
                    : 'hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-zinc-100">
                      {reit.ticker}
                    </span>
                    <span className="text-xs text-zinc-400 truncate">{reit.company_name}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] flex-shrink-0 ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  {reit.sector}
                </Badge>
                <span className="text-xs font-mono text-zinc-500 flex-shrink-0 w-14 text-right">
                  ${(reit.market_cap_musd / 1000).toFixed(1)}B
                </span>
                <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${isSelected ? 'text-blue-400' : 'text-zinc-700'}`} />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No REITs match your search</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quarter picker */}
      <div className="w-72 flex-shrink-0">
        <Card className="bg-zinc-900/60 border-zinc-700/60 h-full flex flex-col">
          {!selectedTicker ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-3 rounded-full bg-zinc-800/50 mb-3">
                <TrendingUp className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">Select a REIT to view<br />available earnings calls</p>
            </div>
          ) : quartersLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-32 bg-zinc-800" />
              <Skeleton className="h-3 w-24 bg-zinc-800" />
              <div className="mt-4 space-y-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full bg-zinc-800 rounded-lg" />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 pb-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-zinc-100">{selectedTicker}</span>
                  {selectedReit && (
                    <Badge variant="outline" className={`text-[10px] ${getSectorColor(selectedReit.sector).bg} ${getSectorColor(selectedReit.sector).text}`}>
                      {selectedReit.sector}
                    </Badge>
                  )}
                </div>
                {selectedReit && (
                  <p className="text-xs text-zinc-500 mt-0.5">{selectedReit.company_name}</p>
                )}
                <p className="text-[10px] text-zinc-600 mt-1.5">{quarters.length} earnings calls available</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-0.5">
                  {quarters.map((q) => (
                    <button
                      key={`${q.year}-${q.quarter}`}
                      onClick={() => router.push(`/analysis/${selectedTicker}/${q.year}/${q.quarter}`)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-800/60 transition-colors flex items-center justify-between group"
                    >
                      <span className="font-mono text-zinc-200">Q{q.quarter} {q.year}</span>
                      <ChevronRight className="h-3 w-3 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
