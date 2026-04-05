// Top 3 REITs by market cap for pre-warming and demo reliability.
// Span three different sectors for diversity in the pitch demo.
export const DEMO_REITS = [
  { ticker: 'WELL', name: 'Welltower Inc.', sector: 'Health Care', mcap: 127389.4 },
  { ticker: 'PLD', name: 'Prologis, Inc.', sector: 'Industrial', mcap: 118459.0 },
  { ticker: 'AMT', name: 'American Tower Corporation', sector: 'Telecommunications', mcap: 82191.0 },
] as const;

export const DEMO_TICKERS = DEMO_REITS.map((r) => r.ticker);

// Quarters to pre-warm for each demo REIT
export const DEMO_QUARTERS = [
  { year: 2025, quarter: 3 },
  { year: 2025, quarter: 2 },
  { year: 2025, quarter: 1 },
  { year: 2024, quarter: 4 },
] as const;
