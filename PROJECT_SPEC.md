# PROJECT SPECIFICATION: REIT Transcript Intelligence Platform (RTIP)

> Re-read this file at the start of every phase to stay grounded.

## 1. Context and Stakes

This is a graded team project for an MBA course at **NYU Stern — REDS 2026 (Real Estate Data Science)**. The assignment is called "Rapid AI Prototyping" and is worth **25% of the final course grade**.

- **Timeline**: 4 weeks, final pitch on **April 28, 2026**
- **Deliverables**: working prototype with live demo, 8–12 slide pitch deck, 3–4 page written report, peer feedback form
- **Pitch format**: 8–10 minutes including Q&A
- **Guest judge**: **Robin Mesirow, Director of Global Innovation at PGIM**
- **Grading**: Problem/Market (28) + Tool Selection (20) + Prototype (28) + Presentation (24) = 100

**Live-demo reliability is a first-class requirement — more important than feature count.** Prototypes that fail during demo significantly impact the grade.

The judge is a senior PGIM executive. The application must look and feel **institutional-grade**. Visual references: Bloomberg Terminal, PitchBook, Koyfin. Every decision filtered through: "Would a senior REIT analyst at PGIM take this seriously?"

## 2. Problem We Are Solving

REIT equity analysts at institutional investors (PGIM, Cohen & Steers, Nuveen) must digest dozens of earnings call transcripts every reporting cycle. Each call runs 45–90 minutes, buries forward-looking signals inside dense sector-specific commentary, and requires hand-extraction of REIT-specific KPIs (FFO, AFFO, same-store NOI, occupancy, leasing spreads, rent growth, cap rates) that are absent from standard financial data feeds. This workflow does not scale across the 150+ REIT universe.

**Product hypothesis**: a well-designed AI tool can compress this workflow from hours to minutes per REIT while preserving analytical rigor and full source attribution.

## 3. Product Concept

**RTIP** is an AI-powered web application where a REIT analyst can:

1. Select any REIT from the **FTSE Nareit All REITs Index (December 2025 constituents, 195 REITs)** via a searchable interface
2. Pick a fiscal quarter from a list of quarters that **actually exist** (availability-driven)
3. See the full earnings call transcript, formatted for readability
4. Get AI-enhanced analysis: structured summary, multi-layer sentiment, extracted sector/geography/macro signals, REIT-specific KPIs
5. View linked quarterly financials with full source attribution
6. See post-earnings stock price reaction relative to VNQ (sector ETF)
7. Navigate an earnings calendar of past and upcoming REIT calls
8. Export as a PDF analyst one-pager or multi-sheet Excel workbook

## 4. Non-Negotiable Principles

1. **Zero mock data.** Every value displayed comes from a real API call. No fabrication — ever.
2. **Source attribution on every data point.** Every rendered metric carries `{value, source, as_of_date}`. Sources labeled: "API Ninjas (transcript)", "API Ninjas (earnings)", "Yahoo Finance", "Claude enhanced analysis".
3. **Every AI insight must cite the transcript.** Hovering any Claude-generated insight reveals the exact source sentences.
4. **Aggressive caching in SQLite.** Transcripts cached indefinitely. Claude outputs cached by prompt hash. For performance AND live-demo reliability.
5. **Graceful degradation.** Every external call wrapped in try/catch with user-visible error states.
6. **Secrets in `.env.local`**, never committed, `.env.example` provided.
7. **AI disclosure footer on every page**: "AI-generated analysis. Informational only, not investment advice. Built for NYU Stern REDS 2026."

## 5. Locked-In Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Recharts + lucide-react + FullCalendar React
- **Backend**: Next.js API routes (monolith) + better-sqlite3 for caching
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`) using `claude-sonnet-4-6` as default model
- **Data APIs**:
  - **API Ninjas — Developer tier PAID subscription** at `https://api.api-ninjas.com/v1/`
  - **yahoo-finance2** npm package for historical OHLC price data
- **Export**: `exceljs` for Excel, `puppeteer` for PDF
- **Dev environment**: VS Code with Claude Code extension

## 6. API Ninjas — Developer Tier Endpoints

### 6.1 `/v1/earningstranscript`
Returns for `ticker + year + quarter`: transcript, participants (structured), summary, guidance, risk_factors, call_time, date, year, quarter, cik.

**Architecture**: API Ninjas fields = "Baseline Layer". Claude adds "Enhanced Analysis Layer" — REIT-specific KPI extraction, multi-layer sentiment, signal tagging, cross-quarter delta.

### 6.2 `/v1/earningstranscriptsearch`
Given ticker, returns all available (year, quarter) combinations. Used for quarter picker — shows only existing quarters.

### 6.3 `/v1/earningstranscriptlist`
Returns all companies with transcripts. Used for universe coverage verification.

### 6.4 `/v1/earnings`
Detailed earnings from SEC 10-Q/10-K filings. Historical pre-2025 available on Developer tier.

### 6.5 `/v1/earningscalendar` and `/v1/upcomingearnings`
Past results and upcoming dates. Supports ticker/date/exchange filters.

### 6.6 `/v1/stockprice`
Current quote. For header metadata only.

### 6.7 `/v1/analytics`
Subscription tier and usage stats. Dev-only.

## 7. Core Features (build order)

1. **REIT Selector** — searchable picker, 195 FTSE Nareit constituents, sector filter, availability-driven quarter picker
2. **Transcript Viewer** — full text, sentence-level breaks, section headers, speaker attribution, in-page search, click-to-highlight from signals
3. **Insights Panel — three tabs**:
   - **Baseline** (API Ninjas): summary, guidance, risk_factors, participants, call_time
   - **Enhanced** (Claude): REIT-specific KPIs, multi-layer sentiment, signals with citations
   - **Ask**: Claude RAG chat scoped to selected transcript
4. **Financial Dashboard** — API Ninjas `/earnings` + Claude-extracted KPIs, source attribution, 8-quarter sparklines
5. **Earnings Calendar** — FullCalendar month view, past + upcoming, sector color-coded
6. **Post-Earnings Price Reaction** — yahoo-finance2, T+1/T+5/T+20 returns vs VNQ, alpha computation
7. **Export** — PDF one-pager (Puppeteer) + multi-sheet Excel (ExcelJS)
8. **Polish** — Compare Mode, Sector Heatmap, dark mode, Cmd+K, citation tooltips, loading skeletons

## 8. Pre-Warm Strategy

Top 3 REITs by market cap × most recent 4 quarters = 12 full analyses pre-cached:
1. **WELL** — Welltower ($127.4B, Healthcare)
2. **PLD** — Prologis ($118.5B, Industrial)
3. **AMT** — American Tower ($82.2B, Telecommunications)

Script: `/scripts/prewarm_cache.ts`

## 9. Known Risks

1. FTSE Nareit coverage on API Ninjas unverified → Phase 0 resolves
2. REIT-specific KPIs not in `/v1/earnings` → Claude extracts from transcript
3. Claude JSON reliability → structured output + try/catch + retry
4. Live demo reliability → pre-warm cache + graceful error states
5. API key security → `.env.local`, server-side only, never logged/committed
6. API Ninjas transcript endpoint may not return all documented fields (participants, summary, guidance, risk_factors) → Phase 0 verifies

## 10. Phase Plan

- **Phase 0**: Scaffold, env, API wrappers, SQLite cache, coverage verification. STOP.
- **Phase 1**: Parse Nareit PDF → CSV, REIT selector + quarter picker + transcript viewer. STOP.
- **Phase 2**: Baseline insights + Claude enhanced analysis (summary, sentiment, signals, ask). STOP.
- **Phase 3**: Financial dashboard + earnings calendar + price reaction. STOP.
- **Phase 4**: Export + Compare Mode + Heatmap + polish + pre-warm + demo prep.

Each phase ends with stop, report, and explicit green light before next phase.
