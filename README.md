# RTIP — REIT Transcript Intelligence Platform

An AI-powered web application that transforms raw REIT earnings call transcripts into structured, actionable intelligence for institutional equity analysts. RTIP covers the full FTSE Nareit All REITs Index (195 REITs, $1.44 trillion market cap) and compresses a multi-hour manual workflow into under 60 seconds per REIT — with full source attribution on every data point.

Built for NYU Stern REDS 2026 (Real Estate Data Science) — Rapid AI Prototyping assignment.

---

## Phase 1: Problem Identification and Market Assessment

### The Problem

Institutional REIT equity analysts are required to process 195 earnings call transcripts every quarter. Each transcript runs 50,000–60,000 words (roughly 1.5–2 hours of reading per call). The core analytical tasks — identifying KPIs, parsing forward guidance, scoring sentiment, tagging market signals, and cataloging risk factors — are done manually today, consuming roughly 40 analyst-hours per quarter per coverage universe.

The bottleneck is not reading speed. It's structured extraction: converting unstructured management commentary into the normalized, comparable data that investment decisions are actually made on. An analyst must simultaneously read, tag, contextualize, and compare 195 sources on a quarterly cadence where speed matters — earnings are released over a compressed 6-week window.

**Evidence of significance:**
- FTSE Nareit All REITs Index: 195 constituents, $1.44T market cap (Dec 31, 2025)
- Earnings season compression: ~85% of REIT Q3 calls happen within a 4-week window
- Typical sell-side REIT team size: 2–4 analysts covering 20–40 names each
- Estimated analyst time per transcript (manual): 90–120 minutes (reading + notes + comparable update)

### Competitive Landscape

| Solution | Approach | Gaps |
|----------|----------|------|
| **Bloomberg Terminal** | Earnings transcript search, basic keyword flagging | No structured extraction; analyst still reads and tags manually. $24K+/seat/year |
| **S&P Capital IQ / SNL** | Transcript library, manually curated financials | No AI analysis; REIT-specific KPIs (FFO, SS-NOI) require manual lookup |
| **AlphaSense / Sentieo** | NLP-powered search across transcripts | Search-optimized, not extraction-optimized; no sentence-level citation trail |
| **Kensho / FactSet** | Quantitative signal extraction | Generalist — not calibrated for REIT-specific metrics (occupancy, cap rates, NOI) |
| **Custom GPT wrappers** | Ad hoc LLM prompting | No structured schema, no source attribution, no caching, not reproducible at scale |

**The gap:** No existing tool produces structured, citation-backed, REIT-specific extractions (FFO guidance direction, sentiment by section, signal polarity with confidence) from raw transcripts at scale. Analysts at boutique REIT shops are doing this by hand with Excel templates.

### Viability Assessment

**Target users:** Junior and mid-level institutional equity analysts at REIT-focused asset managers, REITs' own investor relations teams tracking peer sentiment, and sell-side REIT research desks.

**Market opportunity:** ~2,000 institutional investors actively managing REIT positions in the US (NAREIT estimate). If even 200 firms value automated transcript intelligence at $500/month per seat, that is a $1.2M ARR addressable with current infrastructure. Enterprise pricing (team seats + API) is realistic at $2,000–5,000/month.

**Path to adoption:** The product is already functional for the full 195-REIT universe. The natural entry point is a sell-side REIT desk (2–6 analysts, high transcript volume, pain point is real and immediate). A 30-day trial with pre-warmed cache of a full quarter's calls would demonstrate value before any subscription commitment.

---

## Phase 2: Tool Evaluation and Selection

### Tools Considered

| Tool | Category | Evaluated For | Verdict |
|------|----------|---------------|---------|
| **Lovable** | Vibe-coding (no-code) | Quick UI scaffold | Rejected — no server-side logic, can't securely call APIs or store data |
| **Base44** | Vibe-coding (no-code) | Full-stack prototype | Rejected — no custom caching layer, no SQLite support, vendor lock-in |
| **Claude Artifacts** | In-browser AI app | Quick demos | Rejected — sandboxed, no persistent state, can't connect to external APIs |
| **Gemini Gems** | AI assistant | Research support | Not suited to application development; used for research only |
| **R Shiny** | Data viz framework | Dashboard UI | Rejected — strong for charts, weak for multi-page apps with real-time async data fetching |
| **Streamlit (Python)** | Data app framework | Analysis dashboard | Viable but rejected — session state limitations, no streaming UI, weaker TypeScript ecosystem |
| **Next.js (App Router)** | Full-stack framework | Full application | **Selected** |

### Selection Criteria

1. **Server-side API orchestration** — We need to call three external APIs (API Ninjas, Claude, Yahoo Finance) securely from a server, not expose keys in the browser.
2. **Persistent caching** — With 5 parallel Claude calls per REIT (~$0.31), we cannot afford redundant API calls. Needed a server-side cache with content-hash invalidation.
3. **Async streaming** — Transcript loading and Claude analysis run sequentially; the UI should show progress rather than a blank spinner.
4. **TypeScript end-to-end** — Shared types between API routes and React components eliminate a class of data mismatch bugs in a complex multi-source data model.
5. **Deployment familiarity** — Team already had Next.js experience; four-week timeline left no room for framework learning curves.

### Rationale and Trade-offs

**Next.js was selected** because it is the only option in our evaluation set that satisfies all five criteria natively. The App Router's server/client boundary gives us secure server-side API calls, streaming responses via `ReadableStream`, and typed data contracts through shared TypeScript types — in one framework, one repo.

**Trade-offs accepted:**
- Next.js has a steeper learning curve than Streamlit for ad hoc data work — acceptable given prior experience.
- Cold-start latency on serverless deployments would be an issue at production scale — acceptable for a local prototype demo.
- No built-in SQLite support — addressed with `better-sqlite3` as a direct dependency.

**Within the AI layer**, we considered using OpenAI GPT-4o but selected **Claude Sonnet 4.6** for its longer effective context window (necessary for 60K-character transcripts), stronger instruction-following on structured JSON extraction, and lower cost per token at our output volumes.

---

## Phase 3: Prototype Development

### What RTIP Does

RTIP ingests a raw earnings call transcript (fetched live from API Ninjas) and runs five parallel Claude analyses to produce a structured intelligence report in under 60 seconds. Every output is traced to a specific sentence in the source transcript.

### Application Pages

| Page | What it shows |
|------|---------------|
| **Dashboard** (`/`) | All 195 REITs, filterable by sector. Click any REIT + quarter to trigger analysis. |
| **Analysis** (`/analysis/[ticker]/[year]/[quarter]`) | Full transcript viewer + 5 AI insight tabs: Summary, Sentiment, Signals, KPIs, Financials & Price Reaction |
| **Compare** (`/compare`) | Side-by-side comparison of 2–3 REITs on the same quarter — signals, sentiment, KPIs, guidance, risks |
| **Calendar** (`/calendar`) | Monthly grid of earnings events (past + upcoming), sector color-coded, click to jump to analysis |
| **Heatmap** (`/heatmap`) | Sentiment heatmap across the full REIT universe |

### Analysis Pipeline (per transcript)

```
Raw transcript (API Ninjas, ~55K chars)
        │
        ▼ (parallel, ~55 seconds)
┌───────────────────────────────────────────────────────────┐
│  1. Baseline     →  participants, guidance, risk factors   │
│  2. Summary      →  themes, executive summary, quotes      │
│  3. Sentiment    →  overall + section + 5 topic scores     │
│  4. Signals      →  15–30 tagged market signals            │
│  5. KPI Extract  →  FFO, SS-NOI, occupancy, 5 more         │
└───────────────────────────────────────────────────────────┘
        │
        ▼
   SQLite cache (version-aware, content-hash keyed)
        │
        ▼
   Structured JSON → UI components with source citations
```

### Caching Strategy

All Claude outputs are cached in a local SQLite database (`data/cache.db`) keyed by `sha256(prompt_version + ticker + year + quarter)`. A prompt edit bumps the version string and automatically invalidates all outputs from that prompt — stale analysis never silently persists.

### Data Sources

| Source | What We Use It For |
|--------|-------------------|
| **API Ninjas** (Developer tier) | Full earnings call transcripts, 10-Q/10-K financials, historical calendar dates |
| **Yahoo Finance** (yahoo-finance2) | Historical OHLC prices for post-earnings return analysis; upcoming earnings dates |
| **FTSE Nareit** (static) | 195-REIT constituent list with sector/subsector classification |
| **Anthropic Claude** (claude-sonnet-4-6) | All AI-generated analysis — none of the five analysis types uses a pre-built vendor tool |

---

## Setup and Running the Application

### Requirements

- Node.js 18.x or later (`node --version` to check)
- An [API Ninjas](https://api-ninjas.com) Developer tier key (~$10/month) — free tier does not include transcripts
- An [Anthropic API](https://console.anthropic.com) key with Claude Sonnet 4.6 access

### Installation

```bash
git clone <repo-url>
cd reits-earningscall-app
npm install
```

Copy the environment template and fill in your keys:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
API_NINJAS_KEY=your_api_ninjas_developer_tier_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Running

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SQLite database (`data/cache.db`) is created automatically on first run.

### First Use (cold cache)

On a cold cache, the first analysis of any REIT takes ~55–65 seconds. This is normal — five Claude API calls run in parallel. The UI shows a live progress indicator and loads the transcript immediately so you can start reading while Claude works.

After the first analysis, all subsequent loads of that REIT + quarter are instant (served from cache).

### Pre-warming the Cache (recommended before demos)

To pre-populate a set of REITs so demos are instant:

```bash
# Pre-warm ~10 REITs x 2 quarters (~20 min, ~$6 in Claude API costs)
npm run prewarm
```

To clear the cache for a specific REIT (to demonstrate live cold-fetch):

```bash
npm run clear-demo TICKER YEAR QUARTER
# Example: npm run clear-demo VTR 2025 3
```

### Production Build

```bash
npm run build
npm start
```

### Troubleshooting

| Issue | Likely cause | Fix |
|-------|-------------|-----|
| `API_NINJAS_KEY` errors | Free tier key | Upgrade to Developer tier — free tier blocks transcript endpoints |
| Analysis stuck at "Fetching transcript" | API Ninjas rate limit | Wait 60s and retry; Developer tier allows ~1 req/sec |
| `better-sqlite3` build error | Node version mismatch | Run `npm rebuild better-sqlite3` after confirming Node 18+ |
| Cache not invalidating | Old prompt version | Run `npm run clear-demo TICKER YEAR QUARTER` to force re-analysis |

---

## Architecture

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

**Stack**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Recharts + better-sqlite3 + Anthropic SDK

---

## Demo Script (pitch day walkthrough, ~5 minutes)

### Setup (before judges arrive)
1. Run `npm run prewarm` the night before — populates 10 REITs x 2 quarters
2. Confirm `npm run dev` runs at `http://localhost:3000`
3. Open dashboard in browser, maximize window
4. Have 5 printed copies of WELL Q3 2025 PDF ready as handouts
5. Confirm cold-fetch target: **VTR (Ventas, Health Care)** — large-cap peer to WELL, NOT in prewarm cache

### Demo Flow

1. **(0:30) Opening — Dashboard** — "195 REITs in the FTSE Nareit index. An analyst reads 195 transcripts every quarter. That's impossible by hand. Here's how we solved it."

2. **(1:00) Instant analysis — WELL** — Filter Health Care. Select WELL, click Q3 2025. Instant load from cache. Walk through transcript viewer, AI insights tabs, KPIs panel.

3. **(1:15) Cold-fetch demo — VTR** — "Let me show you a REIT we haven't touched before." Select VTR Q3 2025. Progress narration ticks through: transcript (2s), then 5 parallel Claude analyses (55s). "Notice the transcript loads first — the analyst starts reading while Claude works."

4. **(1:15) WELL deep dive** — Return to WELL. Summary: guidance items, risks, notable quotes. Click a quote to highlight in transcript. Sentiment: overall score, prepared-vs-QA delta. Signals: filter Geography, click a Sunbelt signal. KPIs: FFO, SS-NOI, Occupancy.

5. **(0:30) Ask the transcript** — "Did management discuss cap rate compression?" — cited answer with inline references.

6. **(0:30) Financials + Price Reaction** — Dual-source badges. Post-earnings alpha vs VNQ.

7. **(0:30) Calendar** — Month view with sector-colored earnings events. Click any past event to jump to analysis.

**Total**: ~5:30, leaving 2:30–4:30 for Q&A within the 8–10 min pitch.

### Pre-Pitch Checklist
- [ ] Night before: run `npm run prewarm`, verify all analyses successful
- [ ] Night before: generate and print WELL Q3 2025 PDF handouts
- [ ] Morning of: run `npm run dev`, test full demo script end-to-end
- [ ] Morning of: verify VTR Q3 2025 is NOT in cache (cold-fetch target)
- [ ] Morning of: backup laptop with same setup
- [ ] Morning of: test projector/monitor resolution
- [ ] Morning of: confirm `.env.local` API keys are active and not rate-limited
- [ ] During pitch: team member ready with timing cues

---

## Cost Economics

| Item | Cost |
|------|------|
| Per-REIT per-quarter analysis | ~$0.31 (Claude API) |
| Full FTSE Nareit quarterly refresh (195 REITs) | ~$60 (Claude API) |
| API Ninjas Developer subscription | ~$10/month |
| Yahoo Finance | Free (via yahoo-finance2) |
| vs. Manual analyst effort | ~40 hours/analyst/quarter |

At $0.31/REIT, a single analyst covering 40 names costs $12.40/quarter in AI — less than 30 minutes of their time at any institutional salary.

---

## Known Limitations (v1 Prototype)

- **Quarter coverage**: Analysis is available for quarters where API Ninjas has indexed the transcript. Typically current quarter minus 1–2 quarters.
- **GAAP financials**: The financials tab shows GAAP net income, which is typically negative for REITs (depreciation). FFO (the REIT-standard metric) is extracted from the transcript by Claude where mentioned.
- **Upcoming calendar**: Requires companies to have announced their next earnings date on Yahoo Finance — entries populate naturally as dates are announced.
- **Compare page**: Hardcoded to Q3 2025 for the demo; dynamic quarter selection is a v2 feature.

**Planned v2 features:**
- Excel export (multi-sheet: financials, KPIs, signals, sentiment)
- Dynamic quarter selection on Compare page
- Sector heatmap with full-universe sentiment view
- Cmd+K command palette for keyboard navigation

---

## AI Tool Disclosure (academic integrity requirement)

| Tool | How Used |
|------|----------|
| **Claude Code** (Anthropic) | Code generation throughout development (agentic coding in VS Code) |
| **Claude API** (claude-sonnet-4-6) | All in-app analysis: baseline, summary, sentiment, signals, KPI extraction, Q&A |
| **API Ninjas** (paid) | Raw transcript data, quarterly SEC filing data, earnings calendar |
| **Yahoo Finance** (free) | Historical price data and upcoming earnings dates |
| **FTSE Nareit** (public) | December 31, 2025 constituent list |

Strategic framing, problem identification, competitive analysis, business case, and pitch narrative are original team work.

---

## Team

Rachael Romero · Hans Kim · Lavanya Garg · Matthew Zhou
