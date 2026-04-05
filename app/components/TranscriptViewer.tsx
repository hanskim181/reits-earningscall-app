'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { FormattedTranscript } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, MessageCircle } from 'lucide-react';

type Props = {
  transcript: FormattedTranscript;
  highlightSentenceId?: string | null;
};

export function TranscriptViewer({ transcript, highlightSentenceId }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const highlightRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to highlighted sentence
  useEffect(() => {
    if (highlightSentenceId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightSentenceId]);

  // Search filter
  const matchingIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const ids = new Set<string>();
    for (const section of transcript.sections) {
      for (const s of section.sentences) {
        if (s.text.toLowerCase().includes(q) || s.speaker?.toLowerCase().includes(q)) {
          ids.add(s.id);
        }
      }
    }
    return ids;
  }, [searchQuery, transcript]);

  const matchCount = matchingIds?.size ?? 0;

  const sectionLabel = (type: string) => {
    switch (type) {
      case 'prepared': return 'Prepared Remarks';
      case 'qa': return 'Q&A Session';
      default: return 'Earnings Call Transcript';
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">Earnings Call Transcript</span>
          <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
            {transcript.total_sentences} turns
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-zinc-800 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
          {matchingIds && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
              {matchCount} match{matchCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Transcript body — native scroll */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 py-3 space-y-4">
          {transcript.sections.map((section, sIdx) => (
            <div key={`${section.type}-${sIdx}`}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3 sticky top-0 bg-zinc-950/95 py-1 z-10">
                {section.type === 'prepared' ? (
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                ) : section.type === 'qa' ? (
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-zinc-400" />
                )}
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {sectionLabel(section.type)}
                </span>
                <Badge variant="outline" className="text-[10px] text-zinc-600 border-zinc-700">
                  {section.sentences.length} turns
                </Badge>
              </div>

              {/* Sentences */}
              <div className="space-y-1">
                {section.sentences.map((sentence) => {
                  const isHighlighted = highlightSentenceId === sentence.id;
                  const isSearchMatch = matchingIds?.has(sentence.id);
                  const isHidden = matchingIds && !isSearchMatch;

                  return (
                    <div
                      key={sentence.id}
                      ref={isHighlighted ? highlightRef : undefined}
                      id={sentence.id}
                      className={`group rounded px-2 py-1 text-sm transition-colors ${
                        isHighlighted
                          ? 'bg-amber-900/30 ring-1 ring-amber-600/50'
                          : isSearchMatch
                            ? 'bg-blue-900/20'
                            : isHidden
                              ? 'opacity-30'
                              : 'hover:bg-zinc-800/50'
                      }`}
                    >
                      {sentence.speaker && (
                        <span className="font-semibold text-zinc-300 mr-1">
                          {sentence.speaker}:
                        </span>
                      )}
                      <span className="text-zinc-400">{sentence.text}</span>
                      <span className="invisible group-hover:visible ml-2 text-[10px] text-zinc-600 font-mono">
                        {sentence.id}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
