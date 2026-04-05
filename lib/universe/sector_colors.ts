// Institutional-grade color palette for REIT sectors.
// Muted, professional tones — not consumer-bright.
export const SECTOR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Office':             { bg: 'bg-slate-800',   text: 'text-slate-200',   border: 'border-slate-600' },
  'Industrial':         { bg: 'bg-blue-900',    text: 'text-blue-200',    border: 'border-blue-700' },
  'Retail':             { bg: 'bg-emerald-900', text: 'text-emerald-200', border: 'border-emerald-700' },
  'Residential':        { bg: 'bg-violet-900',  text: 'text-violet-200',  border: 'border-violet-700' },
  'Diversified':        { bg: 'bg-amber-900',   text: 'text-amber-200',   border: 'border-amber-700' },
  'Lodging/Resorts':    { bg: 'bg-rose-900',    text: 'text-rose-200',    border: 'border-rose-700' },
  'Self Storage':       { bg: 'bg-cyan-900',    text: 'text-cyan-200',    border: 'border-cyan-700' },
  'Health Care':        { bg: 'bg-teal-900',    text: 'text-teal-200',    border: 'border-teal-700' },
  'Timberland':         { bg: 'bg-lime-900',    text: 'text-lime-200',    border: 'border-lime-700' },
  'Telecommunications': { bg: 'bg-indigo-900',  text: 'text-indigo-200',  border: 'border-indigo-700' },
  'Data Centers':       { bg: 'bg-sky-900',     text: 'text-sky-200',     border: 'border-sky-700' },
  'Gaming':             { bg: 'bg-fuchsia-900', text: 'text-fuchsia-200', border: 'border-fuchsia-700' },
  'Specialty':          { bg: 'bg-orange-900',  text: 'text-orange-200',  border: 'border-orange-700' },
  'Mortgage':           { bg: 'bg-zinc-800',    text: 'text-zinc-200',    border: 'border-zinc-600' },
};

export function getSectorColor(sector: string) {
  return SECTOR_COLORS[sector] ?? { bg: 'bg-gray-800', text: 'text-gray-200', border: 'border-gray-600' };
}

// Hex colors for Recharts and FullCalendar (which need CSS hex, not Tailwind classes)
export const SECTOR_HEX: Record<string, string> = {
  'Office':             '#475569',
  'Industrial':         '#1e3a5f',
  'Retail':             '#064e3b',
  'Residential':        '#4c1d95',
  'Diversified':        '#78350f',
  'Lodging/Resorts':    '#881337',
  'Self Storage':       '#164e63',
  'Health Care':        '#134e4a',
  'Timberland':         '#365314',
  'Telecommunications': '#312e81',
  'Data Centers':       '#0c4a6e',
  'Gaming':             '#701a75',
  'Specialty':          '#7c2d12',
  'Mortgage':           '#3f3f46',
};

export function getSectorHex(sector: string): string {
  return SECTOR_HEX[sector] ?? '#6b7280';
}
