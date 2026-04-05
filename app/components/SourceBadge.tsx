'use client';

import type { SourceLabel } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const SOURCE_STYLES: Record<SourceLabel, string> = {
  'API Ninjas (transcript)': 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  'API Ninjas (earnings)':   'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
  'API Ninjas (calendar)':   'bg-cyan-900/50 text-cyan-300 border-cyan-700/50',
  'Yahoo Finance':           'bg-purple-900/50 text-purple-300 border-purple-700/50',
  'Claude analysis':         'bg-amber-900/50 text-amber-300 border-amber-700/50',
};

export function SourceBadge({ source }: { source: SourceLabel }) {
  return (
    <Badge variant="outline" className={`text-[10px] font-mono ${SOURCE_STYLES[source]}`}>
      {source}
    </Badge>
  );
}
