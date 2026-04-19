# RTIP — REIT Transcript Intelligence Platform

AI-powered earnings call analysis for institutional REIT analysts

NYU Stern · REDS 2026 · April 28, 2026

[Team Member 1] · [Team Member 2] · [Team Member 3] · [Team Member 4]

---

# The REIT analyst's quarterly nightmare

195 REITs in the FTSE Nareit Index · $1.44 trillion market cap

- Each earnings call runs 45 to 90 minutes
- Critical REIT KPIs (FFO, AFFO, Same-Store NOI, Occupancy) are absent from Bloomberg and FactSet
- Forward guidance and risk signals are buried inside management commentary and Q&A
- Analysts burn 40+ hours per quarter on raw extraction before real analysis begins
- The workflow does not scale across a 30–40 REIT coverage universe

---

# Who needs this

Target users: REIT equity analysts at institutional investors

Buy-side: PGIM · Cohen & Steers · Nuveen · Green Street · LaSalle

Sell-side: Morgan Stanley · Evercore · BTIG · Green Street Research

Market sizing

- ~20 major buy-side shops × 3–5 REIT analysts = 60–100 seats
- $30K–$60K per seat per year (vs AlphaSense at $25K–$50K)
- TAM: $3M–$6M annually, expandable to private markets and non-US REITs

---

# What exists today — and where it fails

| Tool | Raw transcripts | REIT KPIs | Multi-layer sentiment | Source attribution | Price reaction |
|---|---|---|---|---|---|
| Bloomberg Terminal | Yes | No | No | No | Yes |
| AlphaSense / Sentieo | Yes | No | No | Partial | No |
| ChatGPT / Claude (web) | Manual | No | Partial | No | No |
| **RTIP** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |

The gap: no product combines REIT-specific KPI extraction, multi-layer sentiment, and full source attribution in one institutional-grade interface.

---

# RTIP — one workflow, full coverage

Pick a REIT → pick a quarter → 60 seconds later, full analysis

- Transcript Viewer with sentence-level IDs, search, click-to-highlight
- AI Insights: summary, forward guidance, risk factors, multi-layer sentiment, signals, Ask
- REIT KPIs auto-extracted: FFO, AFFO, Same-Store NOI, Occupancy, Cap Rate, Leasing Spread
- Financial Snapshot from SEC 10-Q / 10-K filings with source attribution
- Post-Earnings Price Reaction: stock vs FTSE Nareit vs VNQ, T+1 / T+5 / T+20 alpha
- Compare Mode: 2–3 REITs side-by-side
- PDF Export: institutional one-page analyst brief

---

# Why Next.js + Claude Code

Tools evaluated: Lovable, Base44, Claude Artifacts, Gemini Gems, Streamlit, R Shiny, Retool, Next.js + Claude Code

Selection criteria in order of weight

1. Institutional UI quality — judge is from PGIM; references are Bloomberg, PitchBook, Koyfin
2. Parallel AI orchestration — 5 Claude calls per REIT need clean async handling
3. Aggressive caching — live-demo reliability requires sub-second re-loads
4. Source attribution architecture — strict TypeScript typing on every cell

Trade-off accepted: steeper learning curve, mitigated by Claude Code generating ~95% of code under team direction

---

# Single-layer Claude Analysis Architecture

Data sources

- API Ninjas: transcripts, SEC financials, earnings calendar
- Claude Sonnet 4.6: summary, guidance, risk factors, sentiment, signals, KPIs, participants
- Yahoo Finance: historical OHLC, USRT (FTSE Nareit proxy), VNQ benchmark

Performance

- SQLite cache: 60 seconds cold → under 5 milliseconds warm
- Every rendered value carries source and timestamp

Key decision: mid-build pivot away from a two-layer "baseline + enhanced" architecture after discovering premium fields are paywalled. Claude does all analysis. Cleaner narrative, stronger differentiation.

---

# Live Demo

https://reits-earningscall-app-production.up.railway.app

Demo flow

1. Dashboard — pick WELL from Health Care
2. Instant load from cache — walk through Summary tab
3. Cold-fetch VTR (Ventas) — 60-second progress narration
4. Sentiment and Signals tab — Geography filter, click-to-highlight
5. Ask: "How did management discuss cap rates?"
6. Compare Mode: EQIX vs DLR
7. Export PDF — same one-pager judges received as handouts

---

# The economics

| Metric | Manual workflow | RTIP |
|---|---|---|
| Time per REIT-quarter | 90+ minutes | 60 seconds cold / instant warm |
| Cost per REIT-quarter | ~$300 (analyst time at $200/hr) | $0.31 (Claude) + fixed API cost |
| Universe coverage per analyst | 30–40 REITs | All 195 REITs |
| Time-to-insight after earnings call | Hours | Minutes |

Full FTSE Nareit quarterly refresh: ~$60 in marginal Claude cost — less than one analyst-hour

Demo pre-warm cost (10 REITs × 2 quarters): $4.67 actual

---

# Risks, limitations, transparency

What we addressed

- Demo reliability → SQLite cache plus 20-REIT pre-warm
- Claude JSON parsing → structured prompts, retry logic, validation (100% success rate in testing)
- Live demo network risk → cache-first design, all demo REITs guaranteed instant

Honest limitations

- Developer tier API Ninjas locks premium fields, forcing Claude as sole analyst
- U.S. Equity REITs only — Mortgage REITs and international would require expansion
- Production deployment would require human-in-loop review for guidance extraction

AI Tool Disclosure

- Claude Code (Anthropic) — code generation under team direction
- Claude API (claude-sonnet-4-6) — runtime transcript analysis
- API Ninjas (Developer tier paid) — transcripts, SEC filings, calendar
- Yahoo Finance — historical prices, USRT and VNQ benchmarks
- FTSE Nareit Dec 31, 2025 constituent list — public domain

Strategic framing, problem identification, and pitch narrative are original team work.

---

# Thank you

Try it: https://reits-earningscall-app-production.up.railway.app

Code: github.com/hanskim181/reits-earningscall-app

Questions?
