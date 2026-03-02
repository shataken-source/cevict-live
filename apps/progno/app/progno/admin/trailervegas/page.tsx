'use client';

import { useState } from 'react';
import Link from 'next/link';

const C = {
  bg: '#04080f',
  card: '#080f1a',
  border: '#12233a',
  green: '#00e676',
  blue: '#29b6f6',
  amber: '#ffc107',
  red: '#ef5350',
  text: '#9ab8d4',
  textBright: '#ddeeff',
  textDim: '#3a5570',
  mono: '"JetBrains Mono","Fira Code",Consolas,monospace',
};

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.textDim, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, disabled, color = C.blue, style }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; color?: string; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 15px',
        background: disabled ? '#0a1422' : `${color}18`,
        color: disabled ? C.textDim : color,
        border: `1px solid ${disabled ? C.border : color + '50'}`,
        borderRadius: 5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontFamily: C.mono,
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export default function TrailerVegasAdminPage() {
  const [secret, setSecret] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const onRun = async () => {
    setMsg(null);
    setResult(null);
    if (!secret.trim()) {
      setMsg('Enter admin / cron secret first.');
      return;
    }
    if (!file) {
      setMsg('Choose a CSV or JSON file with picks.');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/progno/admin/trailervegas/grade', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret.trim()}` },
        body: form,
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setResult(j);
        const wr = j.performance?.winRate ?? '?';
        const roi = j.performance?.roi ?? '?';
        setMsg(`Graded: WR ${wr}% · ROI ${roi}% · total ${j.counts?.total ?? '?'} picks.`);
      } else {
        setMsg(j.error || 'Backtest failed.');
      }
    } catch (e: any) {
      setMsg(e?.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: 24, fontFamily: C.mono }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link href="/progno/admin" style={{ color: C.blue, textDecoration: 'none', fontSize: 12 }}>← Admin</Link>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.textBright }}>TrailerVegas Backtest (internal)</h1>
          <Link href="/trailervegas" style={{ marginLeft: 'auto', padding: '6px 14px', background: `${C.green}18`, border: `1px solid ${C.green}50`, borderRadius: 5, color: C.green, textDecoration: 'none', fontFamily: C.mono, fontSize: 11, fontWeight: 600 }}>
            Public Page →
          </Link>
        </div>

        <Card style={{ marginBottom: 16, borderColor: `${C.blue}40` }}>
          <SectionLabel>STRIPE INTEGRATION</SectionLabel>
          <p style={{ fontFamily: C.mono, fontSize: 11, color: C.text, lineHeight: 1.6 }}>
            Public grading: <code style={{ color: C.green }}>/trailervegas</code> — upload picks → Stripe checkout ($10) → graded report.<br />
            Webhook: <code style={{ color: C.green }}>/api/trailervegas/webhook</code> — handles <code>checkout.session.completed</code>.<br />
            Report: <code style={{ color: C.green }}>/api/trailervegas/report?session_id=cs_xxx</code> — fetch graded report.<br />
            Requires: <code style={{ color: C.amber }}>STRIPE_SECRET_KEY</code>, <code style={{ color: C.amber }}>STRIPE_WEBHOOK_SECRET</code> in .env.local.<br />
            Supabase tables: <code style={{ color: C.textDim }}>trailervegas_pending</code>, <code style={{ color: C.textDim }}>trailervegas_reports</code>.
          </p>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>ADMIN SECRET</SectionLabel>
          <input
            type="password"
            placeholder="Admin / CRON secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            style={{ width: 280, padding: '8px 12px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 5, color: C.textBright, fontFamily: C.mono, fontSize: 12 }}
          />
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>UPLOAD PICKS</SectionLabel>
          <p style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>
            CSV headers (recommended): <code style={{ color: C.blue }}>date,home_team,away_team,pick,odds,stake,league</code>.
            JSON: array of objects with those fields or &#123; picks: [...] &#125;.
            <br />
            <span style={{ color: C.textDim }}>Pick can be team name or <code>home</code>/<code>away</code>. Only straight sides are supported (no totals/parlays yet).</span>
          </p>
          <label style={{ display: 'block', fontSize: 10, color: C.textDim, marginBottom: 4 }}>
            Picks file
          </label>
          <input
            id="trailervegas-file"
            type="file"
            accept=".csv,application/json,text/csv,application/vnd.ms-excel"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ marginBottom: 10, color: C.text }}
          />
          <div>
            <Btn onClick={onRun} disabled={loading || !secret.trim()} color={C.green}>
              {loading ? 'Grading...' : 'Run backtest'}
            </Btn>
          </div>
        </Card>

        {msg && (
          <Card style={{ marginBottom: 16, background: '#050c16' }}>
            <SectionLabel>STATUS</SectionLabel>
            <p style={{ fontSize: 12, color: msg.includes('failed') || msg.toLowerCase().includes('error') ? C.red : C.text }}>
              {msg}
            </p>
          </Card>
        )}

        {result && (
          <Card>
            <SectionLabel>SUMMARY</SectionLabel>
            <pre style={{ marginTop: 8, padding: 10, background: '#050c16', borderRadius: 5, fontSize: 11, overflow: 'auto' }}>
              {JSON.stringify({
                counts: result.counts,
                performance: result.performance,
                byLeague: result.byLeague,
                sampleLimit: result.sampleLimit,
              }, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </div>
  );
}

