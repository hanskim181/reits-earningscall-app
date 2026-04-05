# RTIP — REIT Transcript Intelligence Platform

An AI-powered web application that transforms raw REIT earnings call transcripts into structured, actionable intelligence for institutional equity analysts. RTIP covers the full FTSE Nareit All REITs Index (195 REITs, $1.44 trillion market cap) and delivers automated analysis that compresses a multi-hour manual workflow into under 60 seconds per REIT — with full source attribution on every data point.

Built for NYU Stern REDS 2026 (Real Estate Data Science) — Rapid AI Prototyping assignment.

## Architecture

RTIP uses a single-layer Claude analysis architecture. API Ninjas provides raw data (transcripts, financials, calendar); Claude performs all REIT-specific intelligence (summary, sentiment, signals, KPI extraction, participant parsing). Every AI-generated insight cites the exact transcript sentence it was derived from.

```
┌─────────────────────────────────────────────────────────┐
│                      RTIP Frontend                       │
│  Transcript Viewer │ Insights Panel │ Financials │ Cal   │
└────────┬───────────┴───────┬────────┴─────┬──────┴──┬───┘
         │                   │              │         │
    ┌────▼────┐        ┌─────▼─────┐   ┌────▼───┐ ┌──▼──┐
    │ API     │        │  Claude   │   │ API    │ │Yahoo│
    │ Ninjas  │───────►│  Sonnet   │   │ Ninjas │ │Fin. │
    │ /trans- │ raw    │  4.6      │   │ /earn- │ │OHLC │
    │  cript  │ text   │           │   │  ings  │ │     │
    └─────────┘        └─────┬─────┘   └────────┘ └─────┘
                             │
                       ┌─────▼─────┐
                       │  SQLite   │
                       │  Cache    │
                       └───────────┘
```

**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Recharts + better-sqlite3 + Anthropic SDK

## Setup

```bash
git clone <repo-url>
cd reits-earningscall-app
npm install
```

Create `.env.local` from the template:
```bash
cp .env.example .env.local
```

Fill in your API keys in `.env.local`:
```
API_NINJAS_KEY=your_api_ninjas_developer_tier_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Usage

```bash
# Development server
npm run dev

# Production build
npm run build

# Pre-warm demo cache (~20 min, ~$6 in Claude costs)
npm run prewarm

# Clear cache for one REIT (for cold-fetch live demo)
npm run clear-demo TICKER YEAR QUARTER
```

## Demo Script (pitch day walkthrough, ~5 minutes)

### Setup (before judges arrive)
1. Run `npm run prewarm` the night before — populates 10 REITs x 2 quarters
2. Confirm `npm run dev` runs at `http://localhost:3000`
3. Open dashboard in browser, maximize window
4. Have 5 printed copies of WELL Q3 2025 PDF ready as handouts
5. Choose cold-fetch target: **VTR (Ventas, Health Care)** — large-cap peer to WELL, intentionally NOT in prewarm cache

### Demo flow

1. **(0:30) Opening — Dashboard** — "195 REITs in the FTSE Nareit index. An analyst reads 195 transcripts every quarter. That's impossible by hand. Here's how we solved it."

2. **(1:00) Instant analysis — WELL** — Filter Health Care. Select WELL, click Q3 2025. Instant load from cache. Walk through transcript viewer, AI insights tabs, KPIs panel.

3. **(1:15) Cold-fetch demo — VTR** — "Let me show you a REIT we haven't touched before." Select VTR Q3 2025. Progress narration ticks through: transcript (2s), then 5 parallel Claude analyses (55s). "Notice the transcript loads first — the analyst starts reading while Claude works."

4. **(1:15) WELL deep dive** — Return to WELL. Summary: 17 guidance items, 11 risks, 5 notable quotes. Click a quote to highlight in transcript. Sentiment: +0.88 overall, prepared-vs-QA delta. Signals: filter Geography, click Sunbelt signal. KPIs: 27 extracted (FFO $1.34, SSNOI +14.5%, Occupancy +400bp).

5. **(0:30) Ask the transcript** — "Did management discuss cap rate compression?" — cited answer with inline references.

6. **(0:30) Financials + Price Reaction** — Dual-source badges. Post-earnings T+20 alpha of +13.89% vs VNQ.

7. **(0:30) Calendar** — Month view with sector-colored earnings events. Click any past event to jump to analysis.

**Total**: ~5:30, leaving 2:30-4:30 for Q&A within the 8-10 min pitch.

### Pre-Pitch Checklist
- [ ] Night before: run `npm run prewarm`, verify all analyses successful
- [ ] Night before: generate and print WELL Q3 2025 PDF handouts
- [ ] Morning of: run `npm run dev`, test full demo script end-to-end
- [ ] Morning of: verify VTR Q3 2025 is NOT in cache (cold-fetch target)
- [ ] Morning of: backup laptop with same setup
- [ ] Morning of: test projector/monitor resolution
- [ ] Morning of: confirm `.env.local` API keys are active
- [ ] During pitch: team member ready with timing cues

## AI Tool Disclosure (academic integrity requirement)

- **Claude Code** (Anthropic) — used for code generation throughout development (agentic coding in VS Code)
- **Claude API** (claude-sonnet-4-6) — used for all in-app analysis: baseline synthesis, REIT-specific summary, multi-layer sentiment, signal extraction, KPI extraction, participant extraction, Q&A
- **API Ninjas** (Developer tier paid subscription) — earnings transcripts, quarterly earnings from SEC filings, earnings calendar
- **Yahoo Finance** (via yahoo-finance2) — historical OHLC price data and VNQ benchmark
- **FTSE Nareit** — December 31, 2025 constituent list (public)

Strategic framing, problem identification, pitch narrative, and tool selection analysis are original team work.

## Cost Economics

| Item | Cost |
|------|------|
| Per-REIT per-quarter analysis | ~$0.31 (Claude) |
| Full FTSE Nareit quarterly refresh (195 REITs) | ~$60 (Claude) |
| API Ninjas Developer subscription | Fixed monthly |
| vs. Manual analyst effort | ~40 hours/analyst/quarter |

## v1 Scope Limitations (roadmap items)

The following features are planned but not included in the pitch prototype:
- **Excel Export** — multi-sheet workbook with separate tabs for financials, KPIs, signals, sentiment
- **Sector Heatmap** — visual overview of sentiment scores across the full REIT universe
- **Cmd+K command palette** — keyboard-driven navigation between REITs and pages
- **Dark/light mode toggle** — currently dark mode only (institutional preference)

## Team

[Team member names here]
