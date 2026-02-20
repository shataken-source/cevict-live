'use client';

import { useEffect, useState, useCallback } from 'react';

interface Stats {
  totalTrades: number;
  openPositions: number;
  closedTrades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  dailySpend: number;
  dailyLimit: number;
  dailyLossLimit: number;
}

interface PlatformInfo { trades: number; open: number; }

interface Trade {
  id: string;
  platform: string;
  trade_type: string;
  symbol: string;
  market_id?: string;
  entry_price: number;
  exit_price?: number;
  amount: number;
  pnl?: number;
  outcome: string;
  confidence?: number;
  opened_at: string;
  closed_at?: string;
  bot_category?: string;
}

interface Prediction {
  id: string;
  platform: string;
  market_title: string;
  prediction: string;
  confidence: number;
  edge: number;
  market_price: number;
  predicted_at: string;
  bot_category: string;
}

interface DashData {
  stats: Stats;
  platforms: { crypto: PlatformInfo; kalshi: PlatformInfo; predict: PlatformInfo };
  recentTrades: Trade[];
  openPositions: Trade[];
  predictions: Prediction[];
  config: Record<string, any>;
}

function fmt(n: number, decimals = 2) {
  return n?.toFixed(decimals) ?? '0.00';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function spendColor(pct: number) {
  if (pct >= 90) return 'red';
  if (pct >= 70) return 'amber';
  return 'green';
}

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError('');
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const s = data?.stats;
  const spendPct = s ? Math.min(100, (s.dailySpend / s.dailyLimit) * 100) : 0;
  const lossPct = s ? Math.min(100, (Math.abs(Math.min(0, s.totalPnl)) / s.dailyLossLimit) * 100) : 0;

  return (
    <>
      <header className="header">
        <div>
          <div className="header-title">⚡ Alpha Hunter</div>
          <div className="header-sub">
            <span className="live-dot" />
            AI Trading Bot — Coinbase Crypto · Kalshi · Coinbase Predict
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && <span style={{ color: 'var(--muted)', fontSize: 10 }}>Updated {lastRefresh}</span>}
          <button className="refresh-btn" onClick={load} disabled={loading}>
            {loading ? '⟳ Loading…' : '⟳ Refresh'}
          </button>
        </div>
      </header>

      <main className="main">
        {error && <div className="error-box">⚠️ {error}</div>}

        {/* KPI Row */}
        <div className="kpi-grid">
          <div className="kpi-card green">
            <div className="kpi-label">Win Rate</div>
            <div className={`kpi-value ${(s?.winRate ?? 0) >= 50 ? 'green' : 'red'}`}>{s?.winRate ?? '—'}%</div>
            <div className="kpi-sub">{s?.wins ?? 0}W / {(s?.closedTrades ?? 0) - (s?.wins ?? 0)}L</div>
          </div>
          <div className="kpi-card blue">
            <div className="kpi-label">Total P&L</div>
            <div className={`kpi-value ${(s?.totalPnl ?? 0) >= 0 ? 'green' : 'red'}`}>
              {(s?.totalPnl ?? 0) >= 0 ? '+' : ''}${fmt(s?.totalPnl ?? 0)}
            </div>
            <div className="kpi-sub">{s?.closedTrades ?? 0} closed trades</div>
          </div>
          <div className="kpi-card amber">
            <div className="kpi-label">Open Positions</div>
            <div className="kpi-value amber">{s?.openPositions ?? '—'}</div>
            <div className="kpi-sub">{s?.totalTrades ?? 0} total trades</div>
          </div>
          <div className="kpi-card cyan">
            <div className="kpi-label">Daily Spend</div>
            <div className={`kpi-value ${spendColor(spendPct)}`}>${fmt(s?.dailySpend ?? 0)}</div>
            <div className="kpi-sub">of ${s?.dailyLimit ?? 0} limit</div>
            <div className="limit-bar">
              <div className={`limit-fill ${spendColor(spendPct)}`} style={{ width: `${spendPct}%` }} />
            </div>
          </div>
          <div className="kpi-card red">
            <div className="kpi-label">Loss Exposure</div>
            <div className={`kpi-value ${lossPct >= 80 ? 'red' : lossPct >= 50 ? 'amber' : 'green'}`}>
              {fmt(lossPct, 0)}%
            </div>
            <div className="kpi-sub">of ${s?.dailyLossLimit ?? 0} limit</div>
            <div className="limit-bar">
              <div className={`limit-fill ${lossPct >= 80 ? 'red' : lossPct >= 50 ? 'amber' : 'green'}`} style={{ width: `${lossPct}%` }} />
            </div>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="platform-row">
          <div className="platform-card">
            <div className="platform-icon">₿</div>
            <div className="platform-info">
              <div className="platform-name" style={{ color: 'var(--blue)' }}>Coinbase Crypto</div>
              <div className="platform-stats">{data?.platforms.crypto.trades ?? 0} trades · {data?.platforms.crypto.open ?? 0} open</div>
            </div>
            <span className="panel-badge badge-blue">{data?.platforms.crypto.open ?? 0} OPEN</span>
          </div>
          <div className="platform-card">
            <div className="platform-icon">🎯</div>
            <div className="platform-info">
              <div className="platform-name" style={{ color: 'var(--purple)' }}>Kalshi Markets</div>
              <div className="platform-stats">{data?.platforms.kalshi.trades ?? 0} trades · {data?.platforms.kalshi.open ?? 0} open</div>
            </div>
            <span className="panel-badge badge-purple">{data?.platforms.kalshi.open ?? 0} OPEN</span>
          </div>
          <div className="platform-card">
            <div className="platform-icon">🔮</div>
            <div className="platform-info">
              <div className="platform-name" style={{ color: 'var(--cyan)' }}>Coinbase Predict</div>
              <div className="platform-stats">{data?.platforms.predict.trades ?? 0} trades · {data?.platforms.predict.open ?? 0} open</div>
            </div>
            <span className="panel-badge" style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--cyan)', border: '1px solid rgba(6,182,212,0.3)' }}>
              {data?.platforms.predict.open ?? 0} OPEN
            </span>
          </div>
        </div>

        <div className="grid-2">
          {/* Open Positions */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">📊 Open Positions</span>
              <span className="panel-badge badge-amber">{data?.openPositions.length ?? 0} ACTIVE</span>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              {!data?.openPositions.length ? (
                <div className="empty">No open positions</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th>Entry</th>
                      <th>Size</th>
                      <th>Conf</th>
                      <th>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.openPositions.map(t => (
                      <tr key={t.id}>
                        <td>
                          <span className={
                            t.platform === 'kalshi' ? 'platform-kalshi' :
                            t.market_id ? 'platform-predict' : 'platform-coinbase'
                          }>
                            {t.platform === 'kalshi' ? '🎯' : t.market_id ? '🔮' : '₿'}
                          </span>
                        </td>
                        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.symbol}
                        </td>
                        <td style={{ color: t.trade_type === 'buy' || t.trade_type === 'yes' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                          {t.trade_type?.toUpperCase()}
                        </td>
                        <td>${fmt(t.entry_price, t.entry_price < 10 ? 3 : 2)}</td>
                        <td>${fmt(t.amount)}</td>
                        <td style={{ color: 'var(--muted)' }}>{t.confidence ?? '—'}%</td>
                        <td style={{ color: 'var(--muted)' }}>{timeAgo(t.opened_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* AI Predictions */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">🤖 AI Predictions</span>
              <span className="panel-badge badge-purple">{data?.predictions.length ?? 0} PENDING</span>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              {!data?.predictions.length ? (
                <div className="empty">No pending predictions</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Market</th>
                      <th>Call</th>
                      <th>Conf</th>
                      <th>Edge</th>
                      <th>Price</th>
                      <th>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.predictions.map(p => (
                      <tr key={p.id}>
                        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.market_title || p.bot_category}
                        </td>
                        <td style={{ color: p.prediction === 'yes' || p.prediction === 'buy' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                          {p.prediction?.toUpperCase()}
                        </td>
                        <td style={{ color: p.confidence >= 65 ? 'var(--green)' : 'var(--amber)' }}>{p.confidence}%</td>
                        <td style={{ color: 'var(--cyan)' }}>{p.edge}%</td>
                        <td style={{ color: 'var(--muted)' }}>{p.market_price}¢</td>
                        <td style={{ color: 'var(--muted)' }}>{timeAgo(p.predicted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">📋 Recent Trade History</span>
            <span className="panel-badge badge-blue">{data?.recentTrades.length ?? 0} RECORDS</span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {!data?.recentTrades.length ? (
              <div className="empty">No trade history yet</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Size</th>
                    <th>P&L</th>
                    <th>Outcome</th>
                    <th>Conf</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTrades.map(t => (
                    <tr key={t.id}>
                      <td>
                        <span className={t.platform === 'kalshi' ? 'platform-kalshi' : t.market_id ? 'platform-predict' : 'platform-coinbase'}>
                          {t.platform === 'kalshi' ? '🎯 Kalshi' : t.market_id ? '🔮 Predict' : '₿ Crypto'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.symbol}</td>
                      <td style={{ color: t.trade_type === 'buy' || t.trade_type === 'yes' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {t.trade_type?.toUpperCase()}
                      </td>
                      <td>${fmt(t.entry_price, t.entry_price < 10 ? 3 : 2)}</td>
                      <td style={{ color: 'var(--muted)' }}>{t.exit_price ? `$${fmt(t.exit_price, t.exit_price < 10 ? 3 : 2)}` : '—'}</td>
                      <td>${fmt(t.amount)}</td>
                      <td className={t.pnl != null ? (t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg') : ''}>
                        {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${fmt(t.pnl)}` : '—'}
                      </td>
                      <td>
                        <span className={`outcome-${t.outcome}`}>{t.outcome?.toUpperCase()}</span>
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{t.confidence ?? '—'}%</td>
                      <td style={{ color: 'var(--muted)' }}>{timeAgo(t.opened_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Loss Limits Panel */}
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header">
            <span className="panel-title">🛡️ Loss Limits &amp; Risk Controls</span>
            <span className="panel-badge badge-green">ACTIVE</span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Daily Spend Limit', value: `$${s?.dailySpend?.toFixed(2) ?? 0} / $${s?.dailyLimit ?? 0}`, pct: spendPct },
                { label: 'Daily Loss Limit', value: `${fmt(lossPct, 0)}% used of $${s?.dailyLossLimit ?? 0}`, pct: lossPct },
                { label: 'Predict Max/Trade', value: `$${data?.config?.predictMaxPerTrade ?? 10}`, pct: 0 },
                { label: 'Predict Daily Loss Cap', value: `$${data?.config?.predictDailyLoss ?? 50}`, pct: 0 },
                { label: 'Stop Loss', value: '−50% of entry price', pct: 0 },
                { label: 'Take Profit', value: '+80% of entry price', pct: 0 },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.value}</div>
                  {item.pct > 0 && (
                    <div className="limit-bar" style={{ marginTop: 8 }}>
                      <div className={`limit-fill ${item.pct >= 80 ? 'red' : item.pct >= 60 ? 'amber' : 'green'}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 10, padding: '20px 0 8px' }}>
          Alpha Hunter Dashboard · Auto-refreshes every 30s · Data from Supabase rdbuwyefbgnbuhmjrizo
        </div>
      </main>
    </>
  );
}
