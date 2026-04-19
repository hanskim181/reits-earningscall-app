'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/app/components/NavBar';
import { AIDisclosureFooter } from '@/app/components/AIDisclosureFooter';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getSectorColor, SECTOR_HEX } from '@/lib/universe/sector_colors';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type CalendarEvent = {
  ticker: string;
  company_name: string;
  sector: string;
  date: string;
  earnings_timing: string | null;
  actual_eps: number | null;
  estimated_eps: number | null;
};

function timingBadge(t: string | null): string {
  if (!t) return '';
  if (t === 'before_market') return 'BMO';
  if (t === 'after_market') return 'AMC';
  if (t === 'during_market') return 'DMH';
  return '';
}

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [mode, setMode] = useState<'past' | 'upcoming'>('past');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/calendar?mode=${mode}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          setEvents(Array.isArray(data) ? data : data.events ?? []);
        }
      } catch { /* swallow */ }
      setLoading(false);
    }
    load();
  }, [mode]);

  // Parse current month
  const [yearNum, monthNum] = currentMonth.split('-').map(Number);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(yearNum, monthNum - 1, 1);
    const lastDay = new Date(yearNum, monthNum, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const days: Array<{ date: string | null; dayNum: number }> = [];

    // Padding
    for (let i = 0; i < startPad; i++) {
      days.push({ date: null, dayNum: 0 });
    }
    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, dayNum: d });
    }
    return days;
  }, [yearNum, monthNum]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [events]);

  const prevMonth = () => {
    const d = new Date(yearNum, monthNum - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(yearNum, monthNum, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleEventClick = (ev: CalendarEvent) => {
    // Earnings calls report PRIOR quarter results.
    // Map the announcement date to the fiscal quarter being reported:
    //   Jan-Feb announcement → Q4 of prior year
    //   Mar-May announcement → Q1 of same year
    //   Jun-Aug announcement → Q2 of same year
    //   Sep-Nov announcement → Q3 of same year
    //   Dec announcement     → Q4 of same year (rare)
    const d = new Date(ev.date);
    const month = d.getMonth() + 1; // 1-12
    let reportYear = d.getFullYear();
    let reportQuarter: number;

    if (month <= 2) {
      // Jan-Feb → reporting Q4 of prior year
      reportQuarter = 4;
      reportYear -= 1;
    } else if (month <= 5) {
      reportQuarter = 1;
    } else if (month <= 8) {
      reportQuarter = 2;
    } else if (month <= 11) {
      reportQuarter = 3;
    } else {
      reportQuarter = 4;
    }

    router.push(`/analysis/${ev.ticker}/${reportYear}/${reportQuarter}`);
  };

  const monthLabel = new Date(yearNum, monthNum - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <NavBar />

      <main className="flex-1 overflow-auto p-6">
        {/* Top controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant={mode === 'past' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setMode('past')}>Past</Badge>
            <Badge variant={mode === 'upcoming' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setMode('upcoming')}>Upcoming</Badge>
          </div>
        </div>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="text-zinc-400 hover:text-zinc-200">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <button onClick={nextMonth} className="text-zinc-400 hover:text-zinc-200">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-24 bg-zinc-800 rounded" />
            ))}
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-[10px] text-zinc-500 font-semibold uppercase py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day.date) {
                  return <div key={`pad-${i}`} className="h-24 rounded bg-zinc-900/30" />;
                }
                const dayEvents = eventsByDate.get(day.date) ?? [];
                return (
                  <div
                    key={day.date}
                    className="h-24 rounded bg-zinc-900 border border-zinc-800 p-1 overflow-hidden"
                  >
                    <span className="text-[10px] text-zinc-500">{day.dayNum}</span>
                    <div className="space-y-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((ev, j) => {
                        const sectorColor = SECTOR_HEX[ev.sector] ?? '#6b7280';
                        return (
                          <button
                            key={j}
                            onClick={() => handleEventClick(ev)}
                            className="w-full text-left rounded px-1 py-0.5 text-[10px] truncate hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: sectorColor + '40', color: sectorColor.replace(/^#/, '') ? undefined : '#a1a1aa' }}
                            title={`${ev.ticker} — ${ev.company_name}`}
                          >
                            <span className="font-mono font-bold">{ev.ticker}</span>
                            {ev.earnings_timing && (
                              <span className="ml-1 opacity-70">{timingBadge(ev.earnings_timing)}</span>
                            )}
                          </button>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-zinc-500">+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Event list below calendar */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">
                {mode === 'past' ? 'Recent Earnings' : 'Upcoming Earnings'} ({events.length})
              </h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {events.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-zinc-500 text-sm">
                      {mode === 'upcoming'
                        ? 'No upcoming earnings dates found yet. REIT earnings season typically runs late January through mid-February (Q4) and late April through mid-May (Q1).'
                        : 'No past earnings events found.'}
                    </p>
                  </div>
                )}
                {events.slice(0, 30).map((ev, i) => {
                  const colors = getSectorColor(ev.sector);
                  return (
                    <button
                      key={i}
                      onClick={() => handleEventClick(ev)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-800 transition-colors"
                    >
                      <span className="font-mono text-sm font-semibold text-zinc-100 w-12">{ev.ticker}</span>
                      <span className="text-xs text-zinc-400 flex-1 truncate">{ev.company_name}</span>
                      <Badge variant="outline" className={`text-[10px] ${colors.bg} ${colors.text} ${colors.border}`}>
                        {ev.sector}
                      </Badge>
                      <span className="text-xs text-zinc-500 font-mono w-20 text-right">{ev.date}</span>
                      {ev.actual_eps !== null && (
                        <span className="text-xs font-mono text-zinc-300 w-16 text-right">
                          ${ev.actual_eps.toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      <AIDisclosureFooter />
    </div>
  );
}
