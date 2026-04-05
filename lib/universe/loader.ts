import type { REIT } from '@/lib/types';
import universeData from '@/data/nareit_universe.json';

let _cache: REIT[] | null = null;

export function getREITUniverse(): REIT[] {
  if (!_cache) {
    _cache = (universeData as REIT[]).sort((a, b) => b.market_cap_musd - a.market_cap_musd);
  }
  return _cache;
}

export function findREIT(ticker: string): REIT | undefined {
  return getREITUniverse().find((r) => r.ticker === ticker);
}

export function getREITsBySector(sector: string): REIT[] {
  return getREITUniverse().filter((r) => r.sector === sector);
}

export function getAllSectors(): string[] {
  const sectors = new Set(getREITUniverse().map((r) => r.sector));
  return Array.from(sectors).sort();
}
