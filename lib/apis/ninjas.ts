import axios from 'axios';
import {
  getTranscriptCache,
  setTranscriptCache,
  getApiCache,
  setApiCache,
} from '@/lib/cache/sqlite';
import type { NinjasTranscriptResponse, AvailableQuarter } from '@/lib/types';

const BASE_URL = 'https://api.api-ninjas.com/v1';

function getApiKey(): string {
  const key = process.env.API_NINJAS_KEY;
  if (!key) throw new Error('API_NINJAS_KEY is not set in environment');
  return key;
}

function logApiCall(
  endpoint: string,
  params: Record<string, unknown>,
  status: number | string
): void {
  const ts = new Date().toISOString();
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  console.log(`[API Ninjas] ${ts} | ${endpoint}?${paramStr} | ${status}`);
}

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

// --- Transcript ---

export async function fetchTranscript(
  ticker: string,
  year: number,
  quarter: number
): Promise<ApiResult<NinjasTranscriptResponse>> {
  // Check cache first
  const cached = getTranscriptCache(ticker, year, quarter);
  if (cached) {
    logApiCall('/v1/earningstranscript', { ticker, year, quarter }, 'CACHE_HIT');
    return { ok: true, data: cached };
  }

  try {
    const res = await axios.get(`${BASE_URL}/earningstranscript`, {
      headers: { 'X-Api-Key': getApiKey() },
      params: { ticker, year, quarter },
    });
    logApiCall('/v1/earningstranscript', { ticker, year, quarter }, res.status);

    const data = res.data as NinjasTranscriptResponse;
    setTranscriptCache(ticker, year, quarter, data);
    return { ok: true, data };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      logApiCall('/v1/earningstranscript', { ticker, year, quarter }, status);

      if (status === 401) {
        throw new Error('API Ninjas: Invalid API key (401)');
      }
      if (status === 404) {
        return { ok: false, error: 'not_found', status: 404 };
      }
      return { ok: false, error: 'api_error', status };
    }
    throw err;
  }
}

// --- Transcript Search (available quarters) ---

export async function searchTranscriptAvailability(
  ticker: string
): Promise<ApiResult<AvailableQuarter[]>> {
  const cacheKey = JSON.stringify({ ticker });
  const cached = getApiCache('/v1/earningstranscriptsearch', cacheKey);
  if (cached) {
    logApiCall('/v1/earningstranscriptsearch', { ticker }, 'CACHE_HIT');
    return { ok: true, data: cached as AvailableQuarter[] };
  }

  try {
    const res = await axios.get(`${BASE_URL}/earningstranscriptsearch`, {
      headers: { 'X-Api-Key': getApiKey() },
      params: { ticker },
    });
    logApiCall('/v1/earningstranscriptsearch', { ticker }, res.status);

    const data = res.data as AvailableQuarter[];
    setApiCache('/v1/earningstranscriptsearch', cacheKey, data);
    return { ok: true, data };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      logApiCall('/v1/earningstranscriptsearch', { ticker }, status);

      if (status === 401) throw new Error('API Ninjas: Invalid API key (401)');
      if (status === 404) return { ok: false, error: 'not_found', status: 404 };
      return { ok: false, error: 'api_error', status };
    }
    throw err;
  }
}

// --- List all companies with transcripts ---

export async function listAllTranscriptCompanies(): Promise<
  ApiResult<Array<{ ticker: string; name: string }>>
> {
  const cacheKey = 'all';
  const cached = getApiCache('/v1/earningstranscriptlist', cacheKey);
  if (cached) {
    logApiCall('/v1/earningstranscriptlist', {}, 'CACHE_HIT');
    return { ok: true, data: cached as Array<{ ticker: string; name: string }> };
  }

  try {
    const res = await axios.get(`${BASE_URL}/earningstranscriptlist`, {
      headers: { 'X-Api-Key': getApiKey() },
    });
    logApiCall('/v1/earningstranscriptlist', {}, res.status);

    const data = res.data as Array<{ ticker: string; name: string }>;
    setApiCache('/v1/earningstranscriptlist', cacheKey, data);
    return { ok: true, data };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      logApiCall('/v1/earningstranscriptlist', {}, status);

      if (status === 401) throw new Error('API Ninjas: Invalid API key (401)');
      if (status === 404) return { ok: false, error: 'not_found', status: 404 };
      return { ok: false, error: 'api_error', status };
    }
    throw err;
  }
}

// --- Earnings (10-Q / 10-K) ---

export async function fetchEarnings(
  ticker: string,
  year: number,
  period: 'q1' | 'q2' | 'q3' | 'q4' | 'fy'
): Promise<ApiResult<unknown>> {
  const cacheKey = JSON.stringify({ ticker, year, period });
  const cached = getApiCache('/v1/earnings', cacheKey);
  if (cached) {
    logApiCall('/v1/earnings', { ticker, year, period }, 'CACHE_HIT');
    return { ok: true, data: cached };
  }

  try {
    const res = await axios.get(`${BASE_URL}/earnings`, {
      headers: { 'X-Api-Key': getApiKey() },
      params: { ticker, year, period },
    });
    logApiCall('/v1/earnings', { ticker, year, period }, res.status);

    setApiCache('/v1/earnings', cacheKey, res.data);
    return { ok: true, data: res.data };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      logApiCall('/v1/earnings', { ticker, year, period }, status);

      if (status === 401) throw new Error('API Ninjas: Invalid API key (401)');
      if (status === 404) return { ok: false, error: 'not_found', status: 404 };
      return { ok: false, error: 'api_error', status };
    }
    throw err;
  }
}

// --- Earnings Calendar ---

export async function fetchEarningsCalendar(
  ticker: string,
  showUpcoming: boolean = false,
  limit: number = 10
): Promise<ApiResult<unknown>> {
  const cacheKey = JSON.stringify({ ticker, showUpcoming, limit });
  const cached = getApiCache('/v1/earningscalendar', cacheKey);
  if (cached) {
    logApiCall('/v1/earningscalendar', { ticker }, 'CACHE_HIT');
    return { ok: true, data: cached };
  }

  try {
    const res = await axios.get(`${BASE_URL}/earningscalendar`, {
      headers: { 'X-Api-Key': getApiKey() },
      params: { ticker, show_upcoming: showUpcoming, limit },
    });
    logApiCall('/v1/earningscalendar', { ticker, showUpcoming, limit }, res.status);

    setApiCache('/v1/earningscalendar', cacheKey, res.data);
    return { ok: true, data: res.data };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      logApiCall('/v1/earningscalendar', { ticker }, status);

      if (status === 401) throw new Error('API Ninjas: Invalid API key (401)');
      if (status === 404) return { ok: false, error: 'not_found', status: 404 };
      return { ok: false, error: 'api_error', status };
    }
    throw err;
  }
}

// --- Upcoming Earnings ---

export async function fetchUpcomingEarnings(params: {
  ticker?: string;
  exchange?: string;
  limit?: number;
}): Promise<ApiResult<unknown>> {
  const cacheKey = JSON.stringify(params);
  const cached = getApiCache('/v1/upcomingearnings', cacheKey);
  if (cached) {
    logApiCall('/v1/upcomingearnings', params, 'CACHE_HIT');
    return { ok: true, data: cached };
  }

  try {
    const res = await axios.get(`${BASE_URL}/upcomingearnings`, {
      headers: { 'X-Api-Key': getApiKey() },
      params,
    });
    logApiCall('/v1/upcomingearnings', params, res.status);

    setApiCache('/v1/upcomingearnings', cacheKey, res.data);
    return { ok: true, data: res.data };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      logApiCall('/v1/upcomingearnings', params, status);

      if (status === 401) throw new Error('API Ninjas: Invalid API key (401)');
      if (status === 404) return { ok: false, error: 'not_found', status: 404 };
      return { ok: false, error: 'api_error', status };
    }
    throw err;
  }
}

// --- Stock Price (current) ---

export async function fetchStockPriceCurrent(
  ticker: string
): Promise<ApiResult<unknown>> {
  // No cache for current price — always fresh
  try {
    const res = await axios.get(`${BASE_URL}/stockprice`, {
      headers: { 'X-Api-Key': getApiKey() },
      params: { ticker },
    });
    logApiCall('/v1/stockprice', { ticker }, res.status);
    return { ok: true, data: res.data };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      logApiCall('/v1/stockprice', { ticker }, status);

      if (status === 401) throw new Error('API Ninjas: Invalid API key (401)');
      if (status === 404) return { ok: false, error: 'not_found', status: 404 };
      return { ok: false, error: 'api_error', status };
    }
    throw err;
  }
}

// --- Analytics (usage monitoring) ---
// NOTE: Returns 403 on Developer tier. Optional debug utility only.

export async function fetchAnalytics(): Promise<ApiResult<unknown>> {
  try {
    const res = await axios.get(`${BASE_URL}/analytics`, {
      params: { api_key: getApiKey() },
    });
    logApiCall('/v1/analytics', {}, res.status);
    return { ok: true, data: res.data };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      logApiCall('/v1/analytics', {}, status);
      // 403 is expected on Developer tier — not a configuration error
      return { ok: false, error: status === 403 ? 'tier_locked' : 'api_error', status };
    }
    throw err;
  }
}
