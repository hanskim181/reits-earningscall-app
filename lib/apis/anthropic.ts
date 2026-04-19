import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { getClaudeCache, setClaudeCache } from '@/lib/cache/sqlite';
import { formatTranscript } from '@/lib/transcript/formatter';
import type {
  NinjasTranscriptResponse,
  FormattedTranscript,
  ClaudeBaselineAnalysis,
  ClaudeSummary,
  ClaudeSentiment,
  ClaudeSignal,
  ClaudeKPI,
  ClaudeParticipant,
} from '@/lib/types';

// --- Client singleton ---

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

const PRIMARY_MODEL = 'claude-sonnet-4-6';
let _activeModel = PRIMARY_MODEL;

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// --- Prompt loader ---

const PROMPTS: Record<string, { system: string; version: number }> = {};

function loadPrompt(kind: string): { system: string; version: number } {
  if (PROMPTS[kind]) return PROMPTS[kind];
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(process.cwd(), 'prompts', `${kind}.md`);
  const raw = fs.readFileSync(filePath, 'utf-8');

  // Parse YAML frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error(`Invalid prompt file: ${kind}.md`);

  const frontmatter = fmMatch[1];
  const body = fmMatch[2].trim();

  const versionMatch = frontmatter.match(/prompt_version:\s*(\d+)/);
  const version = versionMatch ? parseInt(versionMatch[1], 10) : 1;

  PROMPTS[kind] = { system: body, version };
  return PROMPTS[kind];
}

// --- Core JSON caller with cache + retry ---

async function callClaudeForJSON<T>(
  promptKind: string,
  ticker: string,
  year: number,
  quarter: number,
  userPrompt: string,
  maxTokens: number,
  validator: (raw: unknown) => T
): Promise<{ result: T; inputTokens: number; outputTokens: number }> {
  const { system, version } = loadPrompt(promptKind);
  const hash = sha256(`${promptKind}:${version}:${ticker}:${year}:${quarter}`);

  // Check cache
  const cached = getClaudeCache(hash);
  if (cached) {
    console.log(`[claude] CACHE_HIT ${promptKind} ${ticker} ${year}Q${quarter}`);
    return { result: validator(cached), inputTokens: 0, outputTokens: 0 };
  }

  const attempt = async (strict: boolean) => {
    const systemPrompt = system + (strict
      ? '\n\nCRITICAL: Return ONLY raw JSON. No prose, no markdown fences, no explanation. The response must be parseable by JSON.parse() as-is.'
      : '');

    const t0 = Date.now();
    const response = await getClient().messages.create({
      model: _activeModel,
      max_tokens: maxTokens,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const elapsed = Date.now() - t0;

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;

    console.log(
      `[claude] ${promptKind} ${ticker} ${year}Q${quarter} | ${elapsed}ms | in:${inputTokens} out:${outputTokens} | model:${_activeModel}`
    );

    // Robust JSON extraction:
    // 1. Strip markdown code fences
    // 2. Find the outermost JSON object or array
    // 3. Ignore any trailing prose after the JSON
    let cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    // Find the first { or [ and extract the matching JSON structure
    const jsonStart = cleaned.search(/[{\[]/);
    if (jsonStart > 0) {
      cleaned = cleaned.slice(jsonStart);
    }

    // Try parsing as-is first
    try {
      return { parsed: JSON.parse(cleaned), inputTokens, outputTokens };
    } catch {
      // If that fails, try to find the end of the JSON by matching braces/brackets
      const startChar = cleaned[0];
      const endChar = startChar === '{' ? '}' : ']';
      let depth = 0;
      let inString = false;
      let escape = false;
      let endPos = -1;

      for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === startChar) depth++;
        if (ch === endChar) {
          depth--;
          if (depth === 0) { endPos = i; break; }
        }
      }

      if (endPos > 0) {
        const extracted = cleaned.slice(0, endPos + 1);
        return { parsed: JSON.parse(extracted), inputTokens, outputTokens };
      }

      // Last resort: throw to trigger retry
      throw new Error(`Could not extract valid JSON from response (length: ${cleaned.length})`);
    }
  };

  let result;
  try {
    result = await attempt(false);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Model not found -> try fallback
    if (msg.includes('model') && msg.includes('not found')) {
      console.warn(`[claude] Model ${_activeModel} not found, this is the only model we try`);
      throw e;
    }
    console.warn(`[claude] JSON parse failed for ${promptKind} ${ticker} ${year}Q${quarter}: ${msg}, retrying strict`);
    result = await attempt(true);
  }

  const validated = validator(result.parsed);
  setClaudeCache(hash, promptKind, validated);
  return { result: validated, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
}

// --- Transcript context builder ---

function buildTranscriptContext(
  transcript: NinjasTranscriptResponse,
  formatted: FormattedTranscript
): string {
  // Build a version of the transcript with sentence IDs for citation
  const lines: string[] = [];
  lines.push(`REIT: ${transcript.ticker} | Date: ${transcript.date} | Quarter: Q${transcript.quarter} ${transcript.year}`);
  lines.push(`Earnings Timing: ${transcript.earnings_timing}`);
  lines.push('');

  for (const section of formatted.sections) {
    lines.push(`=== ${section.type === 'prepared' ? 'PREPARED REMARKS' : section.type === 'qa' ? 'Q&A SESSION' : 'TRANSCRIPT'} ===`);
    for (const s of section.sentences) {
      const prefix = s.speaker ? `${s.speaker}: ` : '';
      lines.push(`[${s.id}] ${prefix}${s.text}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// --- Validators (lightweight, trust Claude but verify shape) ---

function validateBaseline(raw: unknown): ClaudeBaselineAnalysis {
  const d = raw as Record<string, unknown>;
  return {
    executive_summary_paragraph: String(d.executive_summary_paragraph ?? ''),
    forward_guidance: Array.isArray(d.forward_guidance)
      ? d.forward_guidance.map((g: Record<string, unknown>) => ({
          metric: String(g.metric ?? ''),
          value: String(g.value ?? ''),
          direction: (['raised', 'lowered', 'maintained', 'initiated'].includes(String(g.direction))
            ? String(g.direction)
            : 'maintained') as 'raised' | 'lowered' | 'maintained' | 'initiated',
          source_sentence_id: String(g.source_sentence_id ?? ''),
        }))
      : [],
    risk_factors: Array.isArray(d.risk_factors)
      ? d.risk_factors.map((r: Record<string, unknown>) => ({
          risk: String(r.risk ?? ''),
          severity: (['high', 'medium', 'low'].includes(String(r.severity))
            ? String(r.severity)
            : 'medium') as 'high' | 'medium' | 'low',
          source_sentence_id: String(r.source_sentence_id ?? ''),
        }))
      : [],
    participants: Array.isArray(d.participants)
      ? d.participants.map((p: Record<string, unknown>) => ({
          name: String(p.name ?? ''),
          role: String(p.role ?? ''),
          company: String(p.company ?? 'Unknown'),
          speaker_type: (['executive', 'analyst', 'operator', 'unknown'].includes(String(p.speaker_type))
            ? String(p.speaker_type)
            : 'unknown') as ClaudeParticipant['speaker_type'],
        }))
      : [],
  };
}

function validateSummary(raw: unknown): ClaudeSummary {
  const d = raw as Record<string, unknown>;
  return {
    executive_summary: Array.isArray(d.executive_summary) ? d.executive_summary.map(String) : [],
    key_themes: Array.isArray(d.key_themes)
      ? d.key_themes.map((t: Record<string, unknown>) => ({
          title: String(t.title ?? ''),
          rationale: String(t.rationale ?? ''),
        }))
      : [],
    key_risks: Array.isArray(d.key_risks) ? d.key_risks.map(String) : [],
    notable_quotes: Array.isArray(d.notable_quotes)
      ? d.notable_quotes.map((q: Record<string, unknown>) => ({
          speaker: String(q.speaker ?? ''),
          quote: String(q.quote ?? ''),
          sentence_id: String(q.sentence_id ?? ''),
        }))
      : [],
  };
}

function validateSentiment(raw: unknown): ClaudeSentiment {
  const d = raw as Record<string, unknown>;
  const overall = d.overall as Record<string, unknown> | undefined;
  const sections = d.sections as Record<string, unknown> | undefined;
  const topics = d.topics as Record<string, unknown> | undefined;
  return {
    overall: {
      score: Number(overall?.score ?? 0),
      confidence: Number(overall?.confidence ?? 0.5),
    },
    sections: {
      prepared: Number(sections?.prepared ?? 0),
      qa: Number(sections?.qa ?? 0),
    },
    topics: {
      demand: Number(topics?.demand ?? 0),
      financing: Number(topics?.financing ?? 0),
      rent_growth: Number(topics?.rent_growth ?? 0),
      development: Number(topics?.development ?? 0),
      guidance: Number(topics?.guidance ?? 0),
    },
    rationale: String(d.rationale ?? ''),
  };
}

function validateSignals(raw: unknown): ClaudeSignal[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: Record<string, unknown>) => ({
    sentence: String(s.sentence ?? ''),
    sentence_id: String(s.sentence_id ?? ''),
    category: (['Sector', 'Geography', 'Macro'].includes(String(s.category))
      ? String(s.category)
      : 'Macro') as ClaudeSignal['category'],
    tag: String(s.tag ?? ''),
    polarity: (['positive', 'negative', 'neutral'].includes(String(s.polarity))
      ? String(s.polarity)
      : 'neutral') as ClaudeSignal['polarity'],
    confidence: Math.min(1, Math.max(0, Number(s.confidence ?? 0.5))),
    speaker: String(s.speaker ?? ''),
  }));
}

function validateKPIs(raw: unknown): ClaudeKPI[] {
  if (!Array.isArray(raw)) return [];
  const validMetrics = ['FFO', 'AFFO', 'same_store_noi', 'occupancy', 'leasing_spread', 'rent_growth', 'cap_rate', 'development_pipeline'];
  return raw
    .filter((k: Record<string, unknown>) => validMetrics.includes(String(k.metric)))
    .map((k: Record<string, unknown>) => ({
      metric: String(k.metric) as ClaudeKPI['metric'],
      value: String(k.value ?? ''),
      context: String(k.context ?? ''),
      source_sentence: String(k.source_sentence ?? ''),
    }));
}

// --- Public API ---

export async function generateBaseline(
  transcript: NinjasTranscriptResponse
): Promise<{ result: ClaudeBaselineAnalysis; inputTokens: number; outputTokens: number }> {
  const formatted = formatTranscript(transcript.transcript);
  const context = buildTranscriptContext(transcript, formatted);

  return callClaudeForJSON<ClaudeBaselineAnalysis>(
    'baseline',
    transcript.ticker,
    transcript.year,
    transcript.quarter,
    context,
    4096,
    validateBaseline
  );
}

export async function generateSummary(
  transcript: NinjasTranscriptResponse,
  formatted: FormattedTranscript
): Promise<{ result: ClaudeSummary; inputTokens: number; outputTokens: number }> {
  const context = buildTranscriptContext(transcript, formatted);

  return callClaudeForJSON<ClaudeSummary>(
    'summary',
    transcript.ticker,
    transcript.year,
    transcript.quarter,
    context,
    4096,
    validateSummary
  );
}

export async function analyzeSentiment(
  transcript: NinjasTranscriptResponse,
  formatted: FormattedTranscript
): Promise<{ result: ClaudeSentiment; inputTokens: number; outputTokens: number }> {
  const context = buildTranscriptContext(transcript, formatted);

  return callClaudeForJSON<ClaudeSentiment>(
    'sentiment',
    transcript.ticker,
    transcript.year,
    transcript.quarter,
    context,
    4096,
    validateSentiment
  );
}

export async function extractSignals(
  transcript: NinjasTranscriptResponse,
  formatted: FormattedTranscript
): Promise<{ result: ClaudeSignal[]; inputTokens: number; outputTokens: number }> {
  const context = buildTranscriptContext(transcript, formatted);

  return callClaudeForJSON<ClaudeSignal[]>(
    'signals',
    transcript.ticker,
    transcript.year,
    transcript.quarter,
    context,
    8192,
    validateSignals
  );
}

export async function extractREITKPIs(
  transcript: NinjasTranscriptResponse,
  formatted: FormattedTranscript
): Promise<{ result: ClaudeKPI[]; inputTokens: number; outputTokens: number }> {
  const context = buildTranscriptContext(transcript, formatted);

  return callClaudeForJSON<ClaudeKPI[]>(
    'kpi_extraction',
    transcript.ticker,
    transcript.year,
    transcript.quarter,
    context,
    8192,
    validateKPIs
  );
}

export async function askTranscript(
  transcript: NinjasTranscriptResponse,
  formatted: FormattedTranscript,
  question: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ answer: string; citations: string[] }> {
  const { system } = loadPrompt('ask');
  const context = buildTranscriptContext(transcript, formatted);

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add transcript as first user message
  messages.push({ role: 'user', content: `Here is the transcript:\n\n${context}` });
  messages.push({ role: 'assistant', content: 'I have read the transcript. Ask me anything about it, and I will answer strictly from the transcript text with sentence-level citations.' });

  // Add conversation history
  if (conversationHistory) {
    for (const msg of conversationHistory) {
      messages.push(msg);
    }
  }

  // Add current question
  messages.push({ role: 'user', content: question });

  const response = await getClient().messages.create({
    model: _activeModel,
    max_tokens: 2048,
    temperature: 0.4,
    system,
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Try to parse as JSON first
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      answer: String(parsed.answer ?? text),
      citations: Array.isArray(parsed.citations) ? parsed.citations.map(String) : [],
    };
  } catch {
    // If not JSON, extract citations from inline [s-NNNN] markers
    const citations: string[] = [];
    const citationRegex = /\[s-(\d+)\]/g;
    let match;
    while ((match = citationRegex.exec(text)) !== null) {
      citations.push(`s-${match[1]}`);
    }
    return { answer: text, citations: [...new Set(citations)] };
  }
}
