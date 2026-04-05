'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatTranscript } from '@/lib/transcript/formatter';
import { findREIT } from '@/lib/universe/loader';
import type {
  NinjasTranscriptResponse,
  ClaudeBaselineAnalysis,
  ClaudeSummary,
  ClaudeSentiment,
  ClaudeSignal,
  ClaudeKPI,
} from '@/lib/types';

type AnalysisData = {
  baseline: ClaudeBaselineAnalysis | null;
  summary: ClaudeSummary | null;
  sentiment: ClaudeSentiment | null;
  signals: ClaudeSignal[] | null;
  kpis: ClaudeKPI[] | null;
};

type FinData = {
  current_quarter?: {
    period_label: string;
    revenue: { value: number };
    net_income: { value: number };
    eps: { value: number };
    total_debt: { value: number };
    ffo_per_share?: { value: string } | null;
    same_store_noi_growth?: { value: string } | null;
    occupancy?: { value: string } | null;
  };
};

type PriceData = {
  earnings_date: string;
  earnings_timing: string;
  t_label: string;
  summary: {
    t_plus_1: { stock: number | null; nareit: number | null; vnq: number | null; alpha_vs_nareit: number | null; alpha_vs_vnq: number | null };
    t_plus_5: { stock: number | null; nareit: number | null; vnq: number | null; alpha_vs_nareit: number | null; alpha_vs_vnq: number | null };
    t_plus_20: { stock: number | null; nareit: number | null; vnq: number | null; alpha_vs_nareit: number | null; alpha_vs_vnq: number | null };
  };
};

export default function PrintPage() {
  const params = useParams<{ ticker: string; year: string; quarter: string }>();
  const { ticker, year, quarter } = params;

  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [transcript, setTranscript] = useState<NinjasTranscriptResponse | null>(null);
  const [financials, setFinancials] = useState<FinData | null>(null);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [ready, setReady] = useState(false);

  const reit = findREIT(ticker);

  useEffect(() => {
    Promise.all([
      fetch(`/api/transcript?ticker=${ticker}&year=${year}&quarter=${quarter}`).then(r => r.ok ? r.json() : null),
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, year: +year, quarter: +quarter }),
      }).then(r => r.ok ? r.json() : null),
      fetch(`/api/financials?ticker=${ticker}&year=${year}&quarter=${quarter}`).then(r => r.ok ? r.json() : null),
    ]).then(async ([t, a, f]) => {
      setTranscript(t);
      setAnalysis(a?.analysis ?? null);
      setFinancials(f);

      if (t?.date && t?.earnings_timing) {
        try {
          const pr = await fetch(`/api/prices?ticker=${ticker}&date=${t.date}&earnings_timing=${t.earnings_timing}`);
          if (pr.ok) setPriceData(await pr.json());
        } catch { /* ok */ }
      }

      setTimeout(() => setReady(true), 300);
    });
  }, [ticker, year, quarter]);

  const bl = analysis?.baseline;
  const sm = analysis?.summary;
  const se = analysis?.sentiment;
  const si = analysis?.signals;
  const kp = analysis?.kpis;
  const formatted = transcript ? formatTranscript(transcript.transcript) : null;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm 14mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .print-body {
          font-family: 'Inter', 'Helvetica Neue', sans-serif;
          color: #1a1a2e;
          font-size: 9px;
          line-height: 1.35;
          background: white;
        }
        .print-body h1 { font-size: 16px; font-weight: 700; margin: 0; }
        .print-body h2 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; margin: 6px 0 3px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }
        .mono { font-family: 'JetBrains Mono', 'SF Mono', monospace; }
        .tag { display: inline-block; font-size: 7px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }
        .tag-an { background: #dbeafe; color: #1e40af; }
        .tag-c { background: #fef3c7; color: #92400e; }
        .tag-yf { background: #ede9fe; color: #5b21b6; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 2px 4px; border-bottom: 1px solid #f3f4f6; }
        th { font-weight: 600; color: #6b7280; font-size: 7px; text-transform: uppercase; }
        .pos { color: #059669; }
        .neg { color: #dc2626; }
      `}</style>

      <div className="print-body" data-print-ready={ready ? 'true' : 'false'}
        style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '12mm 14mm', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
          <div>
            <h1><span className="mono">{ticker}</span> — {reit?.company_name ?? ticker}</h1>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
              Q{quarter} {year} Earnings Call Analysis
              {reit && <span> | {reit.sector}</span>}
              {transcript && <span> | {transcript.date} | {transcript.earnings_timing?.replace(/_/g, ' ')}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 8, color: '#9ca3af' }}>
            RTIP Analyst Brief<br/>
            Generated {new Date().toLocaleDateString()}
          </div>
        </div>

        <div style={{ borderTop: '2px solid #1a1a2e', marginBottom: 8 }} />

        {/* 2-column body */}
        <div className="grid2">
          {/* LEFT COLUMN */}
          <div>
            {/* Executive Summary */}
            {bl?.executive_summary_paragraph && (
              <div>
                <h2>Executive Summary</h2>
                <p>{bl.executive_summary_paragraph}</p>
              </div>
            )}

            {/* Key Points */}
            {sm?.executive_summary && sm.executive_summary.length > 0 && (
              <div>
                <h2>Key Points <span className="tag tag-c">[C]</span></h2>
                <ul style={{ paddingLeft: 12, margin: '2px 0' }}>
                  {sm.executive_summary.slice(0, 5).map((b, i) => (
                    <li key={i} style={{ marginBottom: 1 }}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Forward Guidance */}
            {bl?.forward_guidance && bl.forward_guidance.length > 0 && (
              <div>
                <h2>Forward Guidance <span className="tag tag-c">[C]</span></h2>
                <table>
                  <thead><tr><th>Metric</th><th>Value</th><th>Dir.</th></tr></thead>
                  <tbody>
                    {bl.forward_guidance.slice(0, 8).map((g, i) => (
                      <tr key={i}>
                        <td>{g.metric}</td>
                        <td className="mono">{g.value}</td>
                        <td className={g.direction === 'raised' ? 'pos' : g.direction === 'lowered' ? 'neg' : ''}>
                          {g.direction === 'raised' ? '▲' : g.direction === 'lowered' ? '▼' : g.direction === 'initiated' ? '★' : '—'} {g.direction}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Risk Factors */}
            {bl?.risk_factors && bl.risk_factors.length > 0 && (
              <div>
                <h2>Risk Factors <span className="tag tag-c">[C]</span></h2>
                <ul style={{ paddingLeft: 12, margin: '2px 0' }}>
                  {bl.risk_factors.slice(0, 5).map((r, i) => (
                    <li key={i} style={{ marginBottom: 1 }}>
                      <span style={{ color: r.severity === 'high' ? '#dc2626' : r.severity === 'medium' ? '#d97706' : '#6b7280', fontWeight: 600, fontSize: 7 }}>
                        [{r.severity.toUpperCase()}]
                      </span>{' '}{r.risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* Sentiment */}
            {se && (
              <div>
                <h2>Sentiment Analysis <span className="tag tag-c">[C]</span></h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <SentimentGauge score={se.overall.score} size={50} />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }} className={`mono ${se.overall.score > 0.2 ? 'pos' : se.overall.score < -0.2 ? 'neg' : ''}`}>
                      {se.overall.score > 0 ? '+' : ''}{se.overall.score.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 7, color: '#9ca3af' }}>{Math.round(se.overall.confidence * 100)}% confidence</div>
                  </div>
                  <div style={{ fontSize: 8 }}>
                    <div>Prepared: <span className="mono">{se.sections.prepared > 0 ? '+' : ''}{se.sections.prepared.toFixed(2)}</span></div>
                    <div>Q&A: <span className="mono">{se.sections.qa > 0 ? '+' : ''}{se.sections.qa.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="grid3" style={{ fontSize: 8 }}>
                  {Object.entries(se.topics).map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: '#6b7280' }}>{k.replace('_', ' ')}: </span>
                      <span className={`mono ${v > 0.2 ? 'pos' : v < -0.2 ? 'neg' : ''}`}>{v > 0 ? '+' : ''}{v.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REIT KPIs */}
            {kp && kp.length > 0 && (
              <div>
                <h2>REIT KPIs <span className="tag tag-c">[C]</span></h2>
                <table>
                  <thead><tr><th>Metric</th><th>Value</th><th>Context</th></tr></thead>
                  <tbody>
                    {kp.slice(0, 10).map((k, i) => (
                      <tr key={i}>
                        <td>{k.metric.replace(/_/g, ' ')}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{k.value}</td>
                        <td style={{ color: '#6b7280', fontSize: 8 }}>{k.context}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financials */}
            {financials?.current_quarter && (
              <div>
                <h2>Financial Snapshot <span className="tag tag-an">[AN]</span></h2>
                <table>
                  <tbody>
                    <FinRow label="Revenue" value={financials.current_quarter.revenue?.value} fmt="$" />
                    <FinRow label="Net Income" value={financials.current_quarter.net_income?.value} fmt="$" />
                    <FinRow label="EPS" value={financials.current_quarter.eps?.value} fmt="$" dec={2} />
                    <FinRow label="Total Debt" value={financials.current_quarter.total_debt?.value} fmt="$" />
                  </tbody>
                </table>
              </div>
            )}

            {/* Price Reaction */}
            {priceData && (
              <div>
                <h2>Post-Earnings Price Reaction <span className="tag tag-yf">[YF]</span></h2>
                <table>
                  <thead><tr><th>Horizon</th><th>{ticker}</th><th>Nareit</th><th>VNQ</th><th>vs Nareit</th></tr></thead>
                  <tbody>
                    {[
                      { label: 'T+1', d: priceData.summary.t_plus_1 },
                      { label: 'T+5', d: priceData.summary.t_plus_5 },
                      { label: 'T+20', d: priceData.summary.t_plus_20 },
                    ].map(({ label, d }) => (
                      <tr key={label}>
                        <td className="mono">{label}</td>
                        <td className={`mono ${(d.stock ?? 0) > 0 ? 'pos' : 'neg'}`}>{fmtPct(d.stock)}</td>
                        <td className={`mono ${(d.nareit ?? 0) > 0 ? 'pos' : 'neg'}`}>{fmtPct(d.nareit)}</td>
                        <td className={`mono ${(d.vnq ?? 0) > 0 ? 'pos' : 'neg'}`}>{fmtPct(d.vnq)}</td>
                        <td className={`mono ${(d.alpha_vs_nareit ?? 0) > 0 ? 'pos' : 'neg'}`} style={{ fontWeight: 600 }}>{fmtPct(d.alpha_vs_nareit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Top Signals */}
            {si && si.length > 0 && (
              <div>
                <h2>Top Signals <span className="tag tag-c">[C]</span></h2>
                {si.slice(0, 6).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 2, alignItems: 'flex-start' }}>
                    <span style={{
                      display: 'inline-block', width: 4, height: 4, borderRadius: 2, marginTop: 3, flexShrink: 0,
                      background: s.polarity === 'positive' ? '#059669' : s.polarity === 'negative' ? '#dc2626' : '#9ca3af'
                    }} />
                    <span style={{ fontSize: 8 }}>{s.sentence.slice(0, 120)}{s.sentence.length > 120 ? '...' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 6, paddingTop: 4, fontSize: 7, color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            Sources: <span className="tag tag-an">[AN]</span> API Ninjas &nbsp;
            <span className="tag tag-c">[C]</span> Claude (Anthropic) &nbsp;
            <span className="tag tag-yf">[YF]</span> Yahoo Finance
          </div>
          <div>AI-generated analysis. Informational only, not investment advice. NYU Stern REDS 2026.</div>
        </div>

        {/* Participants */}
        {bl?.participants && bl.participants.length > 0 && (
          <div style={{ marginTop: 4, fontSize: 7, color: '#9ca3af' }}>
            Participants ({bl.participants.length}): {bl.participants.map(p => p.name).join(' · ')}
          </div>
        )}
      </div>
    </>
  );
}

// --- SVG Sentiment Gauge ---
function SentimentGauge({ score, size }: { score: number; size: number }) {
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const angle = ((score + 1) / 2) * 180; // -1→0°, 0→90°, +1→180°
  const rad = (Math.PI * (180 - angle)) / 180;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);
  const color = score > 0.2 ? '#059669' : score < -0.2 ? '#dc2626' : '#d97706';

  return (
    <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`}>
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#e5e7eb" strokeWidth={3}
      />
      {/* Value arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${angle > 90 ? 1 : 0} 1 ${nx} ${ny}`}
        fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
      />
      {/* Needle dot */}
      <circle cx={nx} cy={ny} r={2.5} fill={color} />
    </svg>
  );
}

function FinRow({ label, value, fmt, dec }: { label: string; value: number | null | undefined; fmt?: string; dec?: number }) {
  let display = '—';
  if (value !== null && value !== undefined) {
    if (Math.abs(value) >= 1e9) display = `${fmt ?? ''}${(value / 1e9).toFixed(2)}B`;
    else if (Math.abs(value) >= 1e6) display = `${fmt ?? ''}${(value / 1e6).toFixed(1)}M`;
    else display = `${fmt ?? ''}${value.toFixed(dec ?? 0)}`;
  }
  return (
    <tr>
      <td>{label}</td>
      <td className="mono" style={{ fontWeight: 600 }}>{display}</td>
    </tr>
  );
}

function fmtPct(val: number | null): string {
  if (val === null) return '—';
  return `${val > 0 ? '+' : ''}${(val * 100).toFixed(1)}%`;
}
