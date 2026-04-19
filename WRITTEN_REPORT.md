# RTIP: REIT Transcript Intelligence Platform

**NYU Stern — REDS 2026 | Rapid AI Prototyping Assignment | Written Report**

**Live prototype:** https://reits-earningscall-app-production.up.railway.app
**Repository:** https://github.com/hanskim181/reits-earningscall-app

---

## Phase 1 — Problem Identification and Market Assessment

### Problem Statement

REIT equity analysts at institutional investors such as PGIM, Cohen & Steers, and Nuveen face a workflow that does not scale. Each quarter, every public REIT in the FTSE Nareit All Equity REITs Index — currently 195 companies representing **$1.44 trillion in aggregate market capitalization** — releases an earnings call that runs 45 to 90 minutes. A single analyst covering 30–40 names must consume, synthesize, and act on this commentary in a compressed two-week reporting cycle. The problem has three compounding dimensions.

First, **volume is prohibitive**: listening to or carefully reading 30+ transcripts in a reporting window is physically impossible. Analysts skim, and critical signals get missed.

Second, **REIT-specific KPIs are absent from standard data feeds**. Funds from Operations (FFO), Adjusted FFO (AFFO), same-store NOI growth, occupancy, leasing spreads, and cap rates are the metrics that drive REIT valuations — yet Bloomberg, FactSet, and S&P Capital IQ do not report these as structured fields. Analysts hand-extract them from transcripts and supplemental decks every quarter.

Third, **forward-looking signals are buried inside management commentary and Q&A**. Guidance revisions, strategic pivots, and risk concessions rarely appear as bullet points; they emerge through tone shifts, analyst pushback, and unscripted responses.

Industry estimates suggest a REIT analyst spends **40+ hours per quarter** on pure transcript digestion and KPI extraction before any original analysis begins. This is unsustainable and error-prone.

### Competitive Assessment

Existing solutions address pieces of this problem but none target REIT analysis holistically:

- **AlphaSense and Sentieo** offer transcript search across public filings, but they return raw excerpts rather than structured REIT KPIs and lack REIT-specific taxonomy (no FFO/AFFO parsing).
- **Bloomberg Terminal** provides transcripts but no AI analysis layer; KPI extraction remains manual.
- **Generic LLM tools** (ChatGPT, Claude web) can summarize any transcript but lack source attribution, REIT domain knowledge, cross-quarter comparison, and systematic KPI taxonomy.
- **API Ninjas and similar data providers** offer raw transcripts as an API but do not extract REIT-specific structured outputs on their Developer tier.

The gap is clear: **no product combines raw transcripts, REIT-specific KPI extraction, multi-layer sentiment analysis, and full source attribution in a single institutional-grade interface.**

### Viability Assessment

**Target users**: REIT equity analysts at long-only institutional investors (PGIM, Cohen & Steers, Nuveen, Green Street, LaSalle) and at sell-side research desks (Morgan Stanley, Green Street, Evercore, BTIG).

**Market opportunity**: North American REIT research covers roughly 150 publicly traded equity REITs. If each of ~20 major buy-side shops employs 3–5 REIT analysts, the addressable user base is 60–100 professionals at initial adoption. At a software pricing of $30K–$60K per seat per year — competitive with AlphaSense ($25K–$50K) — the total addressable market is $3M–$6M annually, expanding as the tool covers private-market debt and additional property sectors.

**Path to adoption**: Start with a free pilot at 2–3 buy-side shops during a reporting quarter. Institutional analysts judge tools by source attribution rigor and reliability under time pressure — both of which RTIP prioritizes.

---

## Phase 2 — Tool Evaluation and Selection

We evaluated eight platforms against six criteria: AI capability depth, UI flexibility, data-handling reliability, cost at pilot scale, developer velocity, and suitability for institutional-grade output.

| Tool | Strengths | Limitations | Decision |
|------|-----------|-------------|----------|
| **Claude Artifacts** | Fast iteration, strong code gen | No persistent backend, limited to single-file prototypes | Rejected — insufficient for multi-source data integration |
| **Lovable / Base44** | Visual builders, fast UI | Weak on complex state management, limited API control | Rejected — couldn't handle our 5 parallel Claude calls per REIT |
| **Streamlit** | Easy Python deployment | Limited UI polish, weak for institutional visual language | Rejected — looks too "prototype-y" for a PGIM judge |
| **R Shiny** | Strong stats integration | UI flexibility limited, slow for rich front-ends | Rejected |
| **Retool** | Good for internal tools | Paid, designed for admin dashboards not analyst tools | Rejected |
| **Gemini Gems** | Fast chatbot setup | Cannot build a full app UI | Rejected |
| **Next.js + Claude Code** | Full-stack flexibility, production-grade UI, agentic development | Steeper learning curve | **Selected** |

### Why Next.js + Claude Code

We selected a full-stack **Next.js 14 (App Router) with TypeScript** on the front end, paired with **Claude Code in VS Code** as the agentic development environment. The core reasoning:

1. **Institutional-grade UI**: the judge is a senior PGIM executive. Our visual references were Bloomberg Terminal, PitchBook, and Koyfin — these cannot be replicated in Streamlit or Lovable.
2. **Parallel AI orchestration**: each REIT requires five distinct Claude calls (baseline synthesis, structured summary, multi-layer sentiment, signal extraction, KPI extraction). Next.js API routes with `Promise.allSettled` handle this cleanly.
3. **Aggressive caching**: live-demo reliability requires sub-second re-loads. We built SHA-256-keyed SQLite cache layers for transcripts, API responses, and Claude outputs. This is impossible in hosted notebook environments.
4. **Source attribution architecture**: our non-negotiable principle that every rendered value carries `{value, source, as_of_date}` requires strict TypeScript typing — native to Next.js, awkward elsewhere.

### Trade-offs Accepted

- **Steeper learning curve** than Lovable or Streamlit: mitigated by Claude Code, which wrote ~95% of the codebase under team direction.
- **Deployment complexity**: Vercel incompatible (better-sqlite3 + Puppeteer). Solved by deploying to Railway, which supports persistent filesystems.
- **API Ninjas Developer tier limitations**: premium transcript analysis fields (participants, summary, guidance, risk_factors, overall_sentiment) are locked. We turned this into an advantage by positioning Claude as the sole analysis layer — cleaner pitch narrative and stronger differentiation.

---

## Phase 3 — Prototype Development

### Architecture: Single-Layer Claude Analysis

After verifying API Ninjas Developer tier coverage in Phase 0 (30/30 top REITs covered, 9,312 companies globally), we committed to an architecture where **API Ninjas provides raw data and Claude performs all analysis**:

- **API Ninjas**: full transcript text, earnings_timing, SEC 10-Q/10-K financials, earnings calendar, quarter availability
- **Claude (claude-sonnet-4-6)**: summary, forward guidance, risk factors, participants (executives vs analysts vs operators), multi-layer sentiment, 15–30 directional signals per call, REIT-specific KPI extraction
- **Yahoo Finance**: historical OHLC for post-earnings price reaction
- **FTSE Nareit Dec 31, 2025 constituents**: parsed from the official PDF into structured JSON

### Core Features Built

1. **REIT Selector** — searchable picker across all 195 FTSE Nareit constituents with sector filter and availability-driven quarter picker (only shows quarters that actually exist in API Ninjas).
2. **Transcript Viewer** — full text rendered with sentence-level IDs, Prepared Remarks vs Q&A section detection, in-page search, click-to-highlight from signals.
3. **AI Insights Panel (three tabs)**:
   - *Summary*: executive paragraph, 5 key points, themes, forward guidance table with direction arrows, risk factors with severity, notable quotes
   - *Sentiment & Signals*: multi-layer sentiment (overall / Prepared vs Q&A / 5 topics), filterable signal cards with polarity and confidence
   - *Ask*: Claude RAG chat scoped to a single transcript
4. **Financial Snapshot** — API Ninjas SEC-filed quarterly financials merged with Claude-extracted REIT KPIs, every cell carrying a source dot
5. **Post-Earnings Price Reaction** — three-line chart (stock vs FTSE Nareit proxy USRT vs VNQ) with T+1 / T+5 / T+20 returns and alpha computation
6. **Earnings Calendar** — sector-color-coded month view of past and upcoming earnings dates
7. **Compare Mode** — side-by-side analysis of 2–3 REITs
8. **PDF Export** — Puppeteer-rendered one-page A4 analyst brief with source tags `[AN] [C] [YF]` throughout

### Key Engineering Decisions

- **SHA-256-keyed Claude cache** makes every second demo instant (<5ms vs 60s cold) — critical for live demo reliability.
- **Pre-warm script** analyzes 10 REITs × 2 quarters before pitch day, giving us 20 guaranteed-instant demo paths.
- **Graceful degradation**: `Promise.allSettled` on Claude calls means if one of the five analyses fails, the other four still render.
- **Cold-fetch progress narration**: during the 60-second cold analysis, users see ticking status dots for transcript / AI / financials / prices — transforming a wait into a "watching the system work" moment.
- **Fiscal quarter mapping**: Calendar events in January–February correctly map to Q4 of the prior year (earnings calls report the previous quarter).

### Performance Metrics

- Cold cache full analysis: **~60 seconds** (5 parallel Claude calls, 65K–75K input tokens per REIT)
- Warm cache: **<5ms** (SQLite lookup)
- Cost per REIT-quarter: **~$0.31** in Claude usage
- Pre-warm budget for 10 REITs × 2 quarters: **$4.67 actual** (13 minutes runtime)

### Actual Build Cost

Total project spend across the four-week build window:

| Category | Item | Cost |
|---|---|---|
| **Development tooling** | Claude Code / Claude Max subscription (1 month) | ~$200 |
| **Runtime AI (Claude API)** | Phase 0–2 testing and prompt iteration | ~$5 |
| | Phase 3 feature development (SPG, EQIX, DLR cold fetches, retries) | ~$5 |
| | Phase 4 demo pre-warm (20 analyses across 10 REITs × 2 quarters) | $4.67 |
| | Ad-hoc testing, bug fixes, and additional REIT analyses | ~$20 |
| | **Claude API subtotal** | **~$35** |
| **Data APIs** | API Ninjas Developer tier (1 month paid subscription) | ~$49 |
| **Hosting** | Railway free-tier credit ($5/month allowance, unused portion absorbed) | $0 |
| **Version control** | GitHub public repository | $0 |
| **Total out-of-pocket** | | **~$284** |

**Scaled operating cost** (post-launch, steady state): a full quarterly refresh of all 195 FTSE Nareit REITs costs approximately **$60 in marginal Claude usage** — less than half of one billable analyst hour. The fixed costs (API Ninjas, hosting) are subscription-based and do not scale with query volume.

**Economic implication for the pitch**: at institutional pricing of $30K–$60K per analyst seat per year, even a single-user pilot recovers all build and first-year operating costs within the first month of subscription revenue. Unit economics at scale are dominated by Claude token costs, which represent a small fraction of the analyst time the tool replaces.

---

## Phase 4 — Presentation and Reflections

### Pitch Structure (~5:30 demo + Q&A)

Our planned flow opens with the CRE problem and sizing ($1.44T universe, 40+ analyst-hours per quarter), transitions to an instant warm-cache demo of WELL Q3 2025 highlighting 23 extracted participants and 27 KPIs with full source attribution, then deliberately triggers a cold-fetch of VTR (Ventas) to showcase the live 60-second analysis pipeline with progress narration. We close with Compare Mode (EQIX vs DLR in Data Centers) and a PDF export that matches the physical handouts given to judges.

### Business Case and Limitations

**Business case**: at $30K–$60K annual seat pricing and ~20 buy-side shops × 3–5 analysts each, TAM is $3M–$6M. Marginal analysis cost ($0.31 per REIT-quarter) is negligible — a full universe refresh costs ~$60, well below one analyst-hour.

**Honest limitations**: (1) Developer tier API Ninjas locks premium analysis fields, forcing Claude to do all synthesis — ChatGPT could in theory replicate much of this with careful prompting. Our moat is the integrated workflow (KPI taxonomy + source attribution + multi-quarter cache + price reaction overlay), not the raw summarization. (2) We cover U.S. equity REITs only; international REITs and mortgage REITs would require ticker-universe expansion. (3) Claude JSON parsing succeeded 100% of the time in our testing, but in production we would add human-in-the-loop review for guidance extraction before any analyst action.

### Reflections

The most consequential decision was the mid-build pivot from a planned "API Ninjas baseline + Claude enhanced" architecture to a **single-layer Claude analysis** architecture after Phase 0 verification revealed that participants, summary, guidance, risk_factors, and overall_sentiment fields are paywalled on the Developer tier. Rather than paying up for the Business tier, we reframed this as a pitch strength — "generic summarization is commoditized; REIT-specific domain analysis is where the value lives." The cleaner architecture produced a stronger narrative.

The second key lesson was the value of **rigorous upfront verification**. Our Phase 0 coverage script tested 30 top REITs against API Ninjas before writing any feature code, confirming 100% coverage and surfacing the premium-field paywall early. Without that, we would have built a two-layer architecture only to discover locked fields in Week 3.

### AI Tool Disclosure

Per course academic integrity policy:

- **Claude Code (Anthropic)** in VS Code — used for the majority of code generation under team direction. Human decisions drove architecture, tool selection, pitch framing, and business case.
- **Claude API (claude-sonnet-4-6)** — used at runtime inside the application for all transcript analysis (baseline synthesis, summary, sentiment, signals, KPIs, Ask).
- **API Ninjas** (Developer tier paid subscription) — raw transcripts, SEC 10-Q/10-K financials, earnings calendar.
- **Yahoo Finance** (via `yahoo-finance2`) — historical OHLC price data and benchmark ETFs (USRT for FTSE Nareit proxy, VNQ for Vanguard Real Estate).
- **FTSE Nareit** (December 31, 2025 constituents) — public domain index list, parsed from the official PDF.

Strategic framing, problem identification, tool evaluation rationale, and pitch narrative reflect the team's original analysis and judgment.
