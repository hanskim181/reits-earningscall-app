'use client';

import { useState } from 'react';
import type {
  ClaudeBaselineAnalysis,
  ClaudeSummary,
  ClaudeSentiment,
  ClaudeSignal,
} from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SourceBadge } from './SourceBadge';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
  AlertTriangle,
  Quote,
  TrendingUp,
  MessageCircle,
  Send,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

type AnalysisData = {
  baseline: ClaudeBaselineAnalysis | null;
  summary: ClaudeSummary | null;
  sentiment: ClaudeSentiment | null;
  signals: ClaudeSignal[] | null;
};

type Props = {
  analysis: AnalysisData | null;
  loading: boolean;
  error: string | null;
  errors?: string[];
  onHighlightSentence: (sentenceId: string | null) => void;
  ticker: string;
  year: number;
  quarter: number;
};

export function InsightsPanel({
  analysis,
  loading,
  error,
  errors,
  onHighlightSentence,
  ticker,
  year,
  quarter,
}: Props) {
  if (loading) return <LoadingSkeleton />;

  if (error && !analysis) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">{error}</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="summary" className="h-full flex flex-col">
      <TabsList className="w-full justify-start rounded-none border-b border-zinc-800 bg-transparent px-4 flex-shrink-0">
        <TabsTrigger value="summary" className="text-xs data-[state=active]:bg-zinc-800">
          Summary
        </TabsTrigger>
        <TabsTrigger value="sentiment" className="text-xs data-[state=active]:bg-zinc-800">
          Sentiment & Signals
        </TabsTrigger>
        <TabsTrigger value="ask" className="text-xs data-[state=active]:bg-zinc-800">
          Ask
        </TabsTrigger>
      </TabsList>

      {errors && errors.length > 0 && (
        <div className="px-4 py-2 bg-amber-900/20 border-b border-amber-800/30">
          <p className="text-xs text-amber-400">Some analysis unavailable: {errors.join(', ')}</p>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <TabsContent value="summary" className="h-full m-0">
          <SummaryTab
            baseline={analysis?.baseline ?? null}
            summary={analysis?.summary ?? null}
            onHighlight={onHighlightSentence}
          />
        </TabsContent>
        <TabsContent value="sentiment" className="h-full m-0">
          <SentimentTab
            sentiment={analysis?.sentiment ?? null}
            signals={analysis?.signals ?? null}
            onHighlight={onHighlightSentence}
          />
        </TabsContent>
        <TabsContent value="ask" className="h-full m-0">
          <AskTab
            ticker={ticker}
            year={year}
            quarter={quarter}
            onHighlight={onHighlightSentence}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}

// ============================================================
// Summary Tab
// ============================================================

function SummaryTab({
  baseline,
  summary,
  onHighlight,
}: {
  baseline: ClaudeBaselineAnalysis | null;
  summary: ClaudeSummary | null;
  onHighlight: (id: string | null) => void;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Executive Summary */}
        {baseline?.executive_summary_paragraph && (
          <Card className="bg-zinc-900 border-zinc-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Executive Summary
              </h3>
              <SourceBadge source="Claude analysis" />
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {baseline.executive_summary_paragraph}
            </p>
          </Card>
        )}

        {/* Key Points */}
        {summary?.executive_summary && summary.executive_summary.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-700 p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Key Points
            </h3>
            <ul className="space-y-1.5">
              {summary.executive_summary.map((bullet, i) => (
                <li key={i} className="text-sm text-zinc-300 flex gap-2">
                  <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Key Themes */}
        {summary?.key_themes && summary.key_themes.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-700 p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Key Themes
            </h3>
            <div className="space-y-2">
              {summary.key_themes.map((theme, i) => (
                <div key={i} className="border-l-2 border-blue-600 pl-3">
                  <p className="text-sm font-medium text-zinc-200">{theme.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{theme.rationale}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Forward Guidance */}
        {baseline?.forward_guidance && baseline.forward_guidance.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Forward Guidance
              </h3>
              <SourceBadge source="Claude analysis" />
            </div>
            <div className="space-y-1.5">
              {baseline.forward_guidance.map((g, i) => (
                <button
                  key={i}
                  onClick={() => onHighlight(g.source_sentence_id)}
                  className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors"
                >
                  <DirectionIcon direction={g.direction} />
                  <span className="text-sm text-zinc-200 flex-1">{g.metric}</span>
                  <span className="text-sm font-mono text-zinc-100">{g.value}</span>
                  <Badge variant="outline" className={`text-[10px] ${directionColor(g.direction)}`}>
                    {g.direction}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Risk Factors */}
        {baseline?.risk_factors && baseline.risk_factors.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-700 p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Risk Factors
            </h3>
            <div className="space-y-1.5">
              {baseline.risk_factors.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onHighlight(r.source_sentence_id)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors"
                >
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${severityColor(r.severity)}`} />
                  <span className="text-sm text-zinc-300 flex-1">{r.risk}</span>
                  <Badge variant="outline" className={`text-[10px] ${severityBadge(r.severity)}`}>
                    {r.severity}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Notable Quotes */}
        {summary?.notable_quotes && summary.notable_quotes.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-700 p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Notable Quotes
            </h3>
            <div className="space-y-3">
              {summary.notable_quotes.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onHighlight(q.sentence_id)}
                  className="w-full text-left block hover:bg-zinc-800/50 rounded p-2 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <Quote className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-zinc-200 italic">&ldquo;{q.quote}&rdquo;</p>
                      <p className="text-xs text-zinc-500 mt-1">— {q.speaker}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}

// ============================================================
// Sentiment & Signals Tab
// ============================================================

function SentimentTab({
  sentiment,
  signals,
  onHighlight,
}: {
  sentiment: ClaudeSentiment | null;
  signals: ClaudeSignal[] | null;
  onHighlight: (id: string | null) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [polarityFilter, setPolarityFilter] = useState<string>('All');

  const filteredSignals = (signals ?? []).filter((s) => {
    if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
    if (polarityFilter !== 'All' && s.polarity !== polarityFilter) return false;
    return true;
  }).sort((a, b) => b.confidence - a.confidence);

  const categoryCounts = {
    Sector: (signals ?? []).filter((s) => s.category === 'Sector').length,
    Geography: (signals ?? []).filter((s) => s.category === 'Geography').length,
    Macro: (signals ?? []).filter((s) => s.category === 'Macro').length,
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Sentiment Section */}
        {sentiment && (
          <Card className="bg-zinc-900 border-zinc-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Sentiment Analysis
              </h3>
              <SourceBadge source="Claude analysis" />
            </div>

            {/* Overall score */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-3xl font-mono font-bold ${scoreColor(sentiment.overall.score)}`}>
                {sentiment.overall.score > 0 ? '+' : ''}{sentiment.overall.score.toFixed(2)}
              </div>
              <div>
                <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
                  {Math.round(sentiment.overall.confidence * 100)}% confidence
                </Badge>
              </div>
            </div>

            {/* Prepared vs Q&A */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <SentimentMini label="Prepared Remarks" score={sentiment.sections.prepared} />
              <SentimentMini label="Q&A Session" score={sentiment.sections.qa} />
            </div>

            {Math.abs(sentiment.sections.prepared - sentiment.sections.qa) > 0.2 && (
              <div className="bg-amber-900/20 border border-amber-800/30 rounded px-3 py-2 mb-4">
                <p className="text-xs text-amber-400">
                  Q&A sentiment {(sentiment.sections.prepared - sentiment.sections.qa).toFixed(2)} below prepared remarks — management may be more cautious than the script suggests.
                </p>
              </div>
            )}

            {/* Topic bars */}
            <div className="space-y-2 mb-3">
              {Object.entries(sentiment.topics).map(([topic, score]) => (
                <div key={topic} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-24 capitalize">{topic.replace('_', ' ')}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${score >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.abs(score) * 50 + 50}%`, marginLeft: score < 0 ? `${50 + score * 50}%` : '50%' }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-10 text-right ${scoreColor(score)}`}>
                    {score > 0 ? '+' : ''}{score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>

            {/* Rationale */}
            <p className="text-xs text-zinc-400 italic">{sentiment.rationale}</p>
          </Card>
        )}

        {/* Signals Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Signals
            </h3>
            <span className="text-[10px] text-zinc-500">
              Showing {filteredSignals.length} of {signals?.length ?? 0}
            </span>
          </div>

          {/* Filters */}
          <div className="space-y-1.5 mb-3">
            <div className="flex gap-1 flex-wrap">
              {['All', 'Sector', 'Geography', 'Macro'].map((cat) => (
                <Badge
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat} {cat !== 'All' ? `(${categoryCounts[cat as keyof typeof categoryCounts]})` : ''}
                </Badge>
              ))}
            </div>
            <div className="flex gap-1">
              {['All', 'positive', 'negative', 'neutral'].map((pol) => (
                <Badge
                  key={pol}
                  variant={polarityFilter === pol ? 'default' : 'outline'}
                  className={`cursor-pointer text-[10px] ${pol === 'positive' ? 'border-emerald-700' : pol === 'negative' ? 'border-red-700' : ''}`}
                  onClick={() => setPolarityFilter(pol)}
                >
                  {pol}
                </Badge>
              ))}
            </div>
          </div>

          {/* Signal cards */}
          <div className="space-y-1.5">
            {filteredSignals.map((signal, i) => (
              <button
                key={i}
                onClick={() => onHighlight(signal.sentence_id)}
                className="w-full text-left flex gap-2 px-2 py-2 rounded hover:bg-zinc-800 transition-colors"
              >
                <div className={`w-1 rounded-full flex-shrink-0 ${polarityBar(signal.polarity)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 line-clamp-2">{signal.sentence}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] border-zinc-700">
                      {signal.tag}
                    </Badge>
                    <span className="text-[10px] text-zinc-500">{signal.speaker}</span>
                    <div className="flex items-center gap-1 ml-auto">
                      <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${signal.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500">{Math.round(signal.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ============================================================
// Ask Tab
// ============================================================

function AskTab({
  ticker,
  year,
  quarter,
  onHighlight,
}: {
  ticker: string;
  year: number;
  quarter: number;
  onHighlight: (id: string | null) => void;
}) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; citations?: string[] }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const exampleQuestions = [
    'Did management discuss Sunbelt or Texas exposure?',
    'What drove the change in same-store NOI?',
    'How did management respond to questions about cap rates?',
    'What were the main risk factors raised by analysts?',
  ];

  const handleSend = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg = { role: 'user' as const, content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, year, quarter, question, history }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.answer, citations: data.citations },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I encountered an error processing your question.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500 text-center">Ask anything about this transcript</p>
              <div className="space-y-1.5">
                {exampleQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="w-full text-left text-sm text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded border border-zinc-800 hover:border-zinc-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-900/50 text-blue-100'
                    : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                <AskMessageContent content={msg.content} citations={msg.citations} onHighlight={onHighlight} />
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-zinc-800 p-3">
        <p className="text-[10px] text-zinc-600 mb-2 text-center">
          Answers are generated from this transcript only
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Ask about this earnings call..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm"
            disabled={loading}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            className="p-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AskMessageContent({
  content,
}: {
  content: string;
  citations?: string[];
  onHighlight: (id: string | null) => void;
}) {
  // Strip inline [s-NNNN] citation tags for clean display
  const cleaned = content.replace(/\s*\[s-\d+\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return <span>{cleaned}</span>;
}

// ============================================================
// Helpers
// ============================================================

function SentimentMini({ label, score }: { label: string; score: number }) {
  return (
    <div className="bg-zinc-800 rounded p-2">
      <p className="text-[10px] text-zinc-500 mb-1">{label}</p>
      <p className={`text-lg font-mono font-bold ${scoreColor(score)}`}>
        {score > 0 ? '+' : ''}{score.toFixed(2)}
      </p>
    </div>
  );
}

function DirectionIcon({ direction }: { direction: string }) {
  switch (direction) {
    case 'raised': return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />;
    case 'lowered': return <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />;
    case 'initiated': return <Plus className="h-3.5 w-3.5 text-blue-400" />;
    default: return <Minus className="h-3.5 w-3.5 text-zinc-400" />;
  }
}

function directionColor(d: string) {
  switch (d) {
    case 'raised': return 'text-emerald-400 border-emerald-700';
    case 'lowered': return 'text-red-400 border-red-700';
    case 'initiated': return 'text-blue-400 border-blue-700';
    default: return 'text-zinc-400 border-zinc-700';
  }
}

function severityColor(s: string) {
  switch (s) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-amber-500';
    default: return 'bg-zinc-500';
  }
}

function severityBadge(s: string) {
  switch (s) {
    case 'high': return 'text-red-400 border-red-700';
    case 'medium': return 'text-amber-400 border-amber-700';
    default: return 'text-zinc-400 border-zinc-700';
  }
}

function scoreColor(score: number) {
  if (score > 0.2) return 'text-emerald-400';
  if (score < -0.2) return 'text-red-400';
  return 'text-amber-400';
}

function polarityBar(polarity: string) {
  switch (polarity) {
    case 'positive': return 'bg-emerald-500';
    case 'negative': return 'bg-red-500';
    default: return 'bg-zinc-500';
  }
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-6 w-32 bg-zinc-800" />
      <Skeleton className="h-24 bg-zinc-800" />
      <Skeleton className="h-6 w-24 bg-zinc-800" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 bg-zinc-800" style={{ width: `${70 + Math.random() * 30}%` }} />
        ))}
      </div>
      <Skeleton className="h-32 bg-zinc-800" />
    </div>
  );
}
