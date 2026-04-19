# RTIP Pitch Deck

**NYU Stern REDS 2026 — Rapid AI Prototyping**
**8–10 min presentation, ~10 slides**

> Each slide below has: **Title** | **Visual layout** | **On-screen content** | **Speaker notes (what to say)**
> Copy-paste into PowerPoint or Google Slides. Recommended dark background, Inter/Helvetica font, JetBrains Mono for ticker symbols and numbers.

---

## Slide 1 — Title

**Visual**: Dark background, large logo/title centered, team names below.

**On-screen**:
> # RTIP
> **REIT Transcript Intelligence Platform**
> _AI-powered earnings call analysis for institutional REIT analysts_
>
> [Team Member 1] · [Team Member 2] · [Team Member 3] · [Team Member 4] · [Team Member 5]
>
> NYU Stern · REDS 2026 · April 28, 2026

**Speaker (15 sec)**:
"Good morning. We're [team name], and we built **RTIP — REIT Transcript Intelligence Platform**. It's an AI tool that compresses a 40-hour-per-quarter analyst workflow into 60 seconds per REIT."

---

## Slide 2 — The Problem

**Visual**: Big number "**195**" left side, supporting bullets right side. Optional small skyline or REIT logos in background.

**On-screen**:
> ## The REIT analyst's quarterly nightmare
>
> **195 REITs** in the FTSE Nareit Index · **$1.44T market cap**
>
> - Each earnings call: **45–90 minutes**
> - Critical KPIs (FFO, AFFO, Same-Store NOI, Occupancy) **absent from Bloomberg / FactSet**
> - Forward guidance and risk signals **buried inside management commentary and Q&A**
> - **Result**: 40+ analyst-hours per quarter, before any real analysis begins
> - **Does not scale** across a 30–40 REIT coverage universe

**Speaker (45 sec)**:
"Imagine you cover 30 REITs at PGIM. Every quarter, you have 195 earnings calls happening across two weeks. Each one runs over an hour. Then you have to hand-extract metrics like FFO and same-store NOI — these aren't on Bloomberg, you have to dig them out of transcripts. By the time you're done with raw extraction, you've burned 40 hours and haven't started any actual analysis. This problem doesn't scale."

---

## Slide 3 — Market Opportunity

**Visual**: Three target user logos/icons (PGIM, Cohen & Steers, Nuveen, Green Street). TAM number on the right.

**On-screen**:
> ## Who needs this
>
> **Target users**: REIT equity analysts at institutional investors
>
> - Buy-side: PGIM · Cohen & Steers · Nuveen · Green Street · LaSalle
> - Sell-side: Morgan Stanley · Evercore · BTIG · Green Street Research
>
> **Market sizing**:
> - ~20 major buy-side shops × 3–5 REIT analysts each = **60–100 seats**
> - $30–60K per seat per year (vs AlphaSense at $25–50K)
> - **TAM: $3M–$6M annually**, expandable to private markets and non-US REITs

**Speaker (30 sec)**:
"Our users are REIT equity analysts at institutional investors. There are roughly 60–100 of them across the major shops. At AlphaSense-comparable pricing of $30–60K a seat, that's a $3–6 million TAM at launch — expandable to private markets and international REITs."

---

## Slide 4 — Existing Solutions Fall Short

**Visual**: Comparison table — competitors in rows, capability columns. Red ✗ for missing features, green ✓ for present.

**On-screen**:
> ## What exists today — and where it fails
>
> | Tool | Raw transcripts | REIT KPIs | Multi-layer sentiment | Source attribution | Price reaction |
> |---|---|---|---|---|---|
> | Bloomberg Terminal | ✓ | ✗ | ✗ | ✗ | ✓ |
> | AlphaSense / Sentieo | ✓ | ✗ | ✗ | partial | ✗ |
> | ChatGPT / Claude (web) | manual | ✗ | partial | ✗ | ✗ |
> | **RTIP** | **✓** | **✓** | **✓** | **✓** | **✓** |
>
> **The gap**: no product combines REIT-specific KPI extraction, multi-layer sentiment, and full source attribution in one institutional-grade interface.

**Speaker (30 sec)**:
"AlphaSense is great at search but doesn't extract structured REIT KPIs. Bloomberg gives you the transcript but no AI layer. Generic ChatGPT can summarize anything but has no REIT taxonomy and no source attribution — which makes it unusable for institutional work. The gap is integration."

---

## Slide 5 — Our Solution

**Visual**: Screenshot of RTIP analysis page (3-column layout). Annotate the three columns.

**On-screen**:
> ## RTIP — one workflow, full coverage
>
> **Pick a REIT → pick a quarter → 60 seconds later, full analysis**
>
> - **Transcript Viewer** — sentence-level IDs, search, click-to-highlight
> - **AI Insights** — summary, forward guidance, risk factors, multi-layer sentiment, signals, Ask
> - **REIT KPIs** — FFO · AFFO · SS NOI · Occupancy · Cap Rate · Leasing Spread (auto-extracted)
> - **Financial Snapshot** — SEC 10-Q/10-K data with source dots
> - **Post-Earnings Price Reaction** — stock vs FTSE Nareit vs VNQ, T+1/5/20 alpha
> - **Compare Mode** — 2–3 REITs side-by-side
> - **PDF Export** — institutional one-pager

**Speaker (45 sec)**:
"Here's how RTIP works. You pick any REIT from the FTSE Nareit universe — all 195 are covered. You pick a quarter — only the ones that actually exist, no 404s. Sixty seconds later you have a full analyst brief: structured summary, forward guidance with direction arrows, REIT-specific KPIs auto-extracted, sentiment broken down by Prepared Remarks vs Q&A, post-earnings price reaction versus the FTSE Nareit index, and an Ask interface that answers any follow-up question with sentence-level citations."

---

## Slide 6 — Tool Selection

**Visual**: 4-quadrant or simple table. Tools we considered on left, decision/reasoning on right.

**On-screen**:
> ## Why Next.js + Claude Code (not Lovable, not Streamlit)
>
> **Tools we evaluated**:
> Lovable · Base44 · Claude Artifacts · Gemini Gems · Streamlit · R Shiny · Retool · **Next.js + Claude Code ✓**
>
> **Selection criteria** (in order of weight):
> 1. **Institutional UI quality** — judge is PGIM; references are Bloomberg, PitchBook, Koyfin
> 2. **Parallel AI orchestration** — 5 Claude calls per REIT need clean async handling
> 3. **Aggressive caching** — live-demo reliability requires sub-second re-loads
> 4. **Source attribution architecture** — strict TypeScript typing for `{value, source, as_of_date}` on every cell
>
> **Trade-off accepted**: steeper learning curve — mitigated by Claude Code (~95% of code generated under team direction)

**Speaker (45 sec)**:
"We evaluated eight platforms. Lovable and Streamlit can build a working UI fast, but they can't deliver an institutional look — and Robin Mesirow at PGIM is going to compare us to Bloomberg Terminal, not to a hackathon project. Next.js gave us full UI control and proper async handling for our five parallel Claude calls. Claude Code in VS Code wrote the bulk of the code under our direction — we kept the strategic, architectural, and pitch decisions ours."

---

## Slide 7 — Architecture

**Visual**: Simple box-and-arrow diagram. Three data sources at top → SQLite cache in middle → Frontend at bottom.

**On-screen**:
> ## Single-layer Claude Analysis Architecture
>
> ```
>    API Ninjas              Claude Sonnet 4.6           Yahoo Finance
>    ─────────              ─────────────────           ─────────────
>    transcripts            summary, guidance,          historical OHLC,
>    SEC financials   ─►    risk factors,         ◄─    USRT (Nareit),
>    earnings calendar      sentiment, signals,         VNQ benchmark
>                           KPIs, participants
>                                  │
>                            SQLite cache
>                          (60s cold → <5ms warm)
>                                  │
>                          Next.js 14 + TypeScript
>                          (institutional UI)
> ```
>
> **Key decision**: We pivoted from a planned "API Ninjas baseline + Claude enhanced" architecture after Phase 0 verification showed premium fields are paywalled. Claude does **all** analysis. Cleaner narrative, stronger differentiation.

**Speaker (45 sec)**:
"Architecturally: API Ninjas gives us raw transcripts and SEC financials. Yahoo gives us prices. Claude does all the analysis. We cache everything in SQLite — first analysis takes 60 seconds, every subsequent load is under 5 milliseconds. The biggest decision we made was mid-build: we found out API Ninjas paywalls their pre-summarized fields on the Developer tier. Instead of paying up, we made Claude the entire analysis layer. The narrative got cleaner: generic summarization is commoditized, REIT-specific domain analysis is where the value is."

---

## Slide 8 — LIVE DEMO

**Visual**: Single line: "DEMO" in giant font, or a screenshot of the dashboard you'll switch from.

**On-screen**:
> ## Live Demo
>
> **https://reits-earningscall-app-production.up.railway.app**
>
> Demo flow:
> 1. Dashboard — pick **WELL** from Health Care
> 2. Instant load (cached) — walk through Summary tab
> 3. Cold-fetch **VTR (Ventas)** — 60-second progress narration
> 4. Sentiment & Signals tab — geography filter, click-to-highlight
> 5. Ask: "How did management discuss cap rates?"
> 6. **Compare Mode** — EQIX vs DLR
> 7. **Export PDF** — same one-pager judges have in hand

**Speaker (3 min)**: Switch to live app. Follow the flow above, narrating each step. Hand judges the printed WELL Q3 2025 PDF before starting.

---

## Slide 9 — Business Case & Cost

**Visual**: Two-column comparison: "Manual workflow" vs "RTIP".

**On-screen**:
> ## The economics
>
> | | Manual workflow | RTIP |
> |---|---|---|
> | Time per REIT-quarter | 90+ min | **60 sec (cold) / instant (warm)** |
> | Cost per REIT-quarter | ~$300 (analyst time @ $200/hr) | **$0.31 (Claude) + fixed API cost** |
> | Universe coverage per analyst | 30–40 REITs | **All 195 REITs** |
> | Time-to-insight after earnings call | hours | **minutes** |
>
> **Full FTSE Nareit quarterly refresh**: ~$60 in marginal Claude cost — less than one analyst-hour
>
> **Demo prewarm cost** (10 REITs × 2 quarters): **$4.67 actual**

**Speaker (30 sec)**:
"On unit economics: an analyst hour costs about $200. Sixty cents of Claude usage replaces ninety minutes of manual work. A full quarterly refresh of all 195 REITs costs sixty dollars — less than one billable hour. We pre-warmed our demo cache for under five dollars."

---

## Slide 10 — Risks, Limitations, AI Disclosure

**Visual**: Two columns — "What we addressed" left, "Honest limitations" right. AI disclosure at bottom.

**On-screen**:
> ## Risks, limitations, transparency
>
> **What we addressed**:
> - Demo reliability → SQLite cache + 20-REIT pre-warm
> - Claude JSON parsing → structured prompts + retry + validation (100% success rate in testing)
> - Live demo network risk → cache-first design, all demo REITs guaranteed instant
>
> **Honest limitations**:
> - Developer-tier API Ninjas locks premium fields → forces Claude as sole analyst
> - U.S. Equity REITs only — Mortgage REITs and international would require expansion
> - Production deployment would require human-in-loop review for guidance extraction
>
> **AI Tool Disclosure** (per academic integrity policy):
> - **Claude Code** (Anthropic) — code generation under team direction
> - **Claude API** (`claude-sonnet-4-6`) — runtime transcript analysis
> - **API Ninjas** (Developer tier paid) — transcripts, SEC filings, calendar
> - **Yahoo Finance** (`yahoo-finance2`) — historical prices, USRT/VNQ benchmarks
> - **FTSE Nareit** Dec 31, 2025 constituent list — public domain
>
> _Strategic framing, problem identification, and pitch narrative are original team work._

**Speaker (45 sec)**:
"On risks: the biggest one for a live demo is the network or the model failing mid-pitch. We mitigated that with aggressive SQLite caching and pre-warmed all our demo REITs. Honest limitations: we cover U.S. equity REITs only, and in production we'd want human review on guidance extraction before any analyst takes action on it. On AI disclosure: Claude Code wrote the bulk of the code under our direction. Claude Sonnet 4.6 powers the analysis layer at runtime. Strategic framing, problem identification, tool selection, and this pitch are entirely the team's work."

---

## Slide 11 — Thank You / Q&A

**Visual**: Big "Thank you" + URL + QR code (optional)

**On-screen**:
> # Thank you
>
> **Try it**: https://reits-earningscall-app-production.up.railway.app
> **Code**: github.com/hanskim181/reits-earningscall-app
>
> Questions?

**Speaker (10 sec)**:
"Thank you. The app is live at the URL on screen — happy to take questions."

---

## Speaker assignments (4 team members)

Each member owns a clear thematic block so transitions feel natural. Demo is driven by one person while another narrates, so the presenter can keep hands on the keyboard.

| Slide | Section | Time | Speaker |
|-------|---------|------|---------|
| 1 | Open | 0:15 | **Member A** (Problem / Market lead) |
| 2 | The Problem | 0:45 | Member A |
| 3 | Market Opportunity | 0:30 | Member A |
| 4 | Competitive gap | 0:30 | **Member B** (Solution / Tool lead) |
| 5 | Our Solution | 0:45 | Member B |
| 6 | Tool Selection | 0:45 | Member B |
| 7 | Architecture | 0:45 | **Member C** (Tech / Demo lead) |
| 8 | **LIVE DEMO** | 3:00 | Member C drives the app · **Member D** narrates |
| 9 | Business Case | 0:30 | **Member D** (Business / Risks lead) |
| 10 | Risks + AI Disclosure | 0:45 | Member D |
| 11 | Thank You / Q&A | up to 4:30 | All four field questions |

**Total scripted time**: ~8:45 — fits the 8–10 min envelope with room for transitions and Q&A.

**Distribution logic**:
- **Member A** — owns the "why this matters" narrative (problem + market sizing)
- **Member B** — owns the "how we thought about solving it" (solution concept + tool choice)
- **Member C** — owns the "how it's built" (architecture + live demo driver)
- **Member D** — owns the "does it work commercially" (demo narrator + business case + risks)

---

## Production checklist

- [ ] Convert this markdown → Google Slides or PowerPoint
- [ ] Apply dark background (slate-950 or pure black), use Inter or Helvetica, JetBrains Mono for tickers
- [ ] Insert real screenshots on slides 5, 8 (dashboard, analysis page, compare mode, PDF preview)
- [ ] Add team member names on slide 1
- [ ] Print ~5 copies of the WELL Q3 2025 PDF as physical handouts
- [ ] Confirm projector works with the demo URL the night before
- [ ] Pre-warm cache the night before (`npm run prewarm` if running locally, or visit each demo REIT URL on Railway to populate its cache)
- [ ] Verify VTR Q3 2025 is NOT cached (it's the cold-fetch demo target)
- [ ] Rehearse end-to-end at least 3 times, with timer
