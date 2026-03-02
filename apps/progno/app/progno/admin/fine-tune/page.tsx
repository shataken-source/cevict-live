'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  bg: '#04080f',
  card: '#080f1a',
  border: '#12233a',
  borderBright: '#1e3a5f',
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

const FLOOR_KEYS = ['PROGNO_FLOOR_NBA', 'PROGNO_FLOOR_NHL', 'PROGNO_FLOOR_NFL', 'PROGNO_FLOOR_MLB', 'PROGNO_FLOOR_NCAAB', 'PROGNO_FLOOR_NCAAF', 'PROGNO_FLOOR_CBB', 'PROGNO_MIN_CONFIDENCE'] as const;
const ANALYZER_KEYS = ['BLEND_WEIGHT', 'CONFIDENCE_WEIGHT', 'EDGE_WEIGHT', 'SPREAD_WEIGHT', 'FLIP_THRESHOLD'] as const;
const SPORT_MULT_KEYS = ['NBA', 'NHL', 'MLB', 'NCAAB', 'NCAAF', 'NFL', 'NCAA', 'CBB'] as const;

const DEFAULT_CONFIG: Record<string, unknown> = {
  HOME_ONLY_MODE: '0',
  PROGNO_FLOOR_NBA: 58,
  PROGNO_FLOOR_NHL: 57,
  PROGNO_FLOOR_NFL: 60,
  PROGNO_FLOOR_MLB: 57,
  PROGNO_FLOOR_NCAAB: 62,
  PROGNO_FLOOR_NCAAF: 62,
  PROGNO_FLOOR_CBB: 66,
  PROGNO_MIN_CONFIDENCE: 56,
  BLEND_WEIGHT: 0.1,
  CONFIDENCE_WEIGHT: 1,
  EDGE_WEIGHT: 0.8,
  SPREAD_WEIGHT: 0.3,
  FLIP_THRESHOLD: 45,
  SPORT_MULTIPLIERS: { NBA: 0, NHL: 0, MLB: 1, NCAAB: 0, NCAAF: 1, NFL: 1, NCAA: 0.3, CBB: 1 },
};

function getAuthHeaders(secret: string) {
  return { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
}

export default function FineTunePage() {
  const [secret, setSecret] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ winRate: number; roi: number; graded: number; picks: number } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [autoTuneResult, setAutoTuneResult] = useState<any>(null);
  const [autoTuneLoading, setAutoTuneLoading] = useState(false);
  const [bootstrapRuns, setBootstrapRuns] = useState(10000);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [learningDays, setLearningDays] = useState(7);
  const [learningResult, setLearningResult] = useState<{ summary: string; suggested: Record<string, number>; applied?: boolean } | null>(null);
  const [learningLoading, setLearningLoading] = useState(false);

  const loadConfig = async () => {
    if (!secret.trim()) { setLoading(false); return; }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/progno/admin/tuning-config', { headers: getAuthHeaders(secret.trim()) });
      const j = await res.json();
      if (res.ok && j.success && j.config) setConfig({ ...DEFAULT_CONFIG, ...j.config });
      else setMsg(j.error || 'Failed to load config');
    } catch (e: any) {
      setMsg(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (secret.trim()) loadConfig(); }, [secret]);

  const buildOverrides = (): Record<string, string | number> => {
    const overrides: Record<string, string | number> = {};
    overrides.HOME_ONLY_MODE = String(config.HOME_ONLY_MODE ?? '0');
    FLOOR_KEYS.forEach((k) => { overrides[k] = Number(config[k] ?? 58); });
    ANALYZER_KEYS.forEach((k) => { overrides[k] = Number(config[k]); });
    const mults = config.SPORT_MULTIPLIERS as Record<string, number> | undefined;
    if (mults) SPORT_MULT_KEYS.forEach((k) => { overrides[`SPORT_MULT_${k}`] = Number(mults[k] ?? 0); });
    return overrides;
  };

  const runTest = async () => {
    if (!secret.trim()) { setMsg('Enter admin secret first.'); return; }
    setMsg(null);
    setTestResult(null);
    setTestLoading(true);
    try {
      const overrides = buildOverrides();
      const res = await fetch('/api/progno/admin/tuning/run-test', {
        method: 'POST',
        headers: getAuthHeaders(secret.trim()),
        body: JSON.stringify({ overrides }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setTestResult({ winRate: j.winRate, roi: j.roi, graded: j.graded, picks: j.picks });
        setMsg(`Test done: ${j.winRate}% WR, ${j.roi}% ROI, ${j.graded} graded (${j.picks} picks).`);
      } else setMsg(j.error || 'Test failed');
    } catch (e: any) {
      setMsg(e?.message || 'Test failed');
    } finally {
      setTestLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!secret.trim()) { setMsg('Enter admin secret first.'); return; }
    setMsg(null);
    try {
      const res = await fetch('/api/progno/admin/tuning-config', {
        method: 'POST',
        headers: getAuthHeaders(secret.trim()),
        body: JSON.stringify({ config }),
      });
      const j = await res.json();
      if (res.ok && j.success) setMsg('Config saved. It will apply on next picks/today run.');
      else setMsg(j.error || 'Save failed');
    } catch (e: any) {
      setMsg(e?.message || 'Save failed');
    }
  };

  const runAutoTune = async () => {
    if (!secret.trim()) { setMsg('Enter admin secret first.'); return; }
    setMsg(null);
    setAutoTuneResult(null);
    setAutoTuneLoading(true);
    try {
      const res = await fetch('/api/progno/admin/tuning/auto-tune', {
        method: 'POST',
        headers: getAuthHeaders(secret.trim()),
        body: JSON.stringify({ bootstrapRuns, startDate }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setAutoTuneResult(j);
        setMsg(`Auto-tune done (${j.bootstrapRuns} runs). Verdict: ${j.verdict}. ROI diff: ${j.roiDifference ?? '?'}pp. Click "Apply to form" then "Save" to use.`);
      } else setMsg(j.error || 'Auto-tune failed');
    } catch (e: any) {
      setMsg(e?.message || 'Auto-tune failed');
    } finally {
      setAutoTuneLoading(false);
    }
  };

  const applyAutoTuneToForm = () => {
    if (!autoTuneResult?.suggested) return;
    const s = autoTuneResult.suggested;
    setConfig((prev) => ({
      ...prev,
      BLEND_WEIGHT: s.BLEND_WEIGHT ?? prev.BLEND_WEIGHT,
      CONFIDENCE_WEIGHT: s.CONFIDENCE_WEIGHT ?? prev.CONFIDENCE_WEIGHT,
      EDGE_WEIGHT: s.EDGE_WEIGHT ?? prev.EDGE_WEIGHT,
      SPREAD_WEIGHT: s.SPREAD_WEIGHT ?? prev.SPREAD_WEIGHT,
      FLIP_THRESHOLD: s.FLIP_THRESHOLD ?? prev.FLIP_THRESHOLD,
      SPORT_MULTIPLIERS: { ...(prev.SPORT_MULTIPLIERS as Record<string, number>), ...(s.SPORT_MULTIPLIERS || {}) },
    }));
    setMsg('Applied suggested params to form. Click Save to persist.');
  };

  const runLearningBot = async () => {
    if (!secret.trim()) { setMsg('Enter admin secret first.'); return; }
    setMsg(null);
    setLearningResult(null);
    setLearningLoading(true);
    try {
      const res = await fetch('/api/progno/admin/learning-bot', {
        method: 'POST',
        headers: getAuthHeaders(secret.trim()),
        body: JSON.stringify({ days: learningDays, autoApply: false }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setLearningResult({ summary: j.summary, suggested: j.suggested || {}, applied: j.applied });
        setMsg(j.applied ? 'Learning bot applied and saved.' : (j.summary || 'No suggestions.'));
      } else setMsg(j.error || 'Learning bot failed');
    } catch (e: any) {
      setMsg(e?.message || 'Learning bot failed');
    } finally {
      setLearningLoading(false);
    }
  };

  const applyLearningToForm = () => {
    if (!learningResult?.suggested || Object.keys(learningResult.suggested).length === 0) return;
    setConfig((prev) => ({ ...prev, ...learningResult.suggested }));
    setMsg('Applied suggested floors to form. Click Save to persist.');
  };

  const mults = (config.SPORT_MULTIPLIERS as Record<string, number>) || {};

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: 24, fontFamily: C.mono }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link href="/progno/admin" style={{ color: C.blue, textDecoration: 'none', fontSize: 12 }}>← Admin</Link>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.textBright }}>Fine-tune picks</h1>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>ADMIN SECRET</SectionLabel>
          <input
            type="password"
            placeholder="Admin / CRON secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            style={{ width: 280, padding: '8px 12px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 5, color: C.textBright, fontFamily: C.mono, fontSize: 12 }}
          />
          <Btn onClick={loadConfig} disabled={!secret.trim() || loading} style={{ marginLeft: 10 }}>
            {loading ? 'Loading...' : 'Load config'}
          </Btn>
        </Card>

        {msg && (
          <div style={{ marginBottom: 16, padding: 12, background: msg.startsWith('Test done') || msg.includes('Saved') ? `${C.green}15` : `${C.amber}15`, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 12 }}>
            {msg}
          </div>
        )}

        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>FILTERS & FLOORS</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 9, color: C.textDim, display: 'block', marginBottom: 4 }}>HOME_ONLY_MODE</label>
              <select
                value={String(config.HOME_ONLY_MODE ?? '0')}
                onChange={(e) => setConfig((c) => ({ ...c, HOME_ONLY_MODE: e.target.value }))}
                style={{ width: '100%', padding: 6, background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textBright, fontSize: 12 }}
              >
                <option value="0">0 (allow away)</option>
                <option value="1">1 (home only)</option>
              </select>
            </div>
            {FLOOR_KEYS.map((k) => (
              <div key={k}>
                <label style={{ fontSize: 9, color: C.textDim, display: 'block', marginBottom: 4 }}>{k}</label>
                <input
                  type="number"
                  min={50}
                  max={80}
                  value={Number(config[k] ?? 58)}
                  onChange={(e) => setConfig((c) => ({ ...c, [k]: Number(e.target.value) }))}
                  style={{ width: '100%', padding: 6, background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textBright, fontSize: 12 }}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>PROBABILITY ANALYZER (16-model)</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {ANALYZER_KEYS.map((k) => (
              <div key={k}>
                <label style={{ fontSize: 9, color: C.textDim, display: 'block', marginBottom: 4 }}>{k}</label>
                <input
                  type="number"
                  step={k === 'FLIP_THRESHOLD' ? 1 : 0.1}
                  min={0}
                  max={k === 'FLIP_THRESHOLD' ? 70 : 2}
                  value={Number(config[k] ?? 0.5)}
                  onChange={(e) => setConfig((c) => ({ ...c, [k]: Number(e.target.value) }))}
                  style={{ width: '100%', padding: 6, background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textBright, fontSize: 12 }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 9, color: C.textDim }}>SPORT_MULTIPLIERS</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {SPORT_MULT_KEYS.map((league) => (
                <div key={league} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: C.textDim, width: 50 }}>{league}</span>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={2}
                    value={mults[league] ?? 0}
                    onChange={(e) => setConfig((c) => ({
                      ...c,
                      SPORT_MULTIPLIERS: { ...mults, [league]: Number(e.target.value) },
                    }))}
                    style={{ width: 56, padding: 4, background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textBright, fontSize: 11 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>ACTIONS</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Btn onClick={runTest} disabled={testLoading || !secret.trim()} color={C.blue}>
              {testLoading ? 'Running test...' : 'Run test (7-day sim with current vars)'}
            </Btn>
            <Btn onClick={saveConfig} disabled={!secret.trim()} color={C.green}>
              Save config
            </Btn>
          </div>
          {testResult && (
            <div style={{ marginTop: 12, padding: 10, background: '#050c16', borderRadius: 5, fontSize: 12 }}>
              Win rate: <strong>{testResult.winRate}%</strong> · ROI: <strong>{testResult.roi}%</strong> · Graded: {testResult.graded} · Picks: {testResult.picks}
            </div>
          )}
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>AUTO FINE-TUNE (Probability Analyzer sweep + 10k sims)</SectionLabel>
          <p style={{ fontSize: 11, color: C.textDim, marginBottom: 12 }}>
            Uses 7-day historical_odds from Supabase. Runs parameter sweep and bootstrap (default 10,000). Start date is for future use (window still last 7 days).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: 9, color: C.textDim, display: 'block', marginBottom: 4 }}>Bootstrap runs</label>
              <input
                type="number"
                min={1000}
                max={50000}
                step={1000}
                value={bootstrapRuns}
                onChange={(e) => setBootstrapRuns(Number(e.target.value))}
                style={{ width: 100, padding: 6, background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textBright, fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 9, color: C.textDim, display: 'block', marginBottom: 4 }}>Start date (for future)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: 6, background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textBright, fontSize: 12 }}
              />
            </div>
            <Btn onClick={runAutoTune} disabled={autoTuneLoading || !secret.trim()} color={C.amber} style={{ alignSelf: 'flex-end' }}>
              {autoTuneLoading ? 'Running (up to ~10 min)...' : 'Auto fine-tune'}
            </Btn>
          </div>
          {autoTuneResult?.suggested && (
            <div style={{ marginTop: 12 }}>
              <Btn onClick={applyAutoTuneToForm} color={C.green}>Apply to form</Btn>
              <pre style={{ marginTop: 8, padding: 10, background: '#050c16', borderRadius: 5, fontSize: 10, overflow: 'auto' }}>
                {JSON.stringify(autoTuneResult.suggested, null, 2)}
              </pre>
            </div>
          )}
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>LEARNING BOT (experimental)</SectionLabel>
          <p style={{ fontSize: 11, color: C.textDim, marginBottom: 12 }}>
            Analyzes graded <code>prediction_results</code> from the last N days and suggests floor / min-confidence changes. Does not change analyzer weights. Set <code>LEARNING_BOT_RUN_AFTER_RESULTS=1</code> to run after daily-results cron; <code>EXPERIMENTAL_LEARNING_BOT_AUTO_APPLY=1</code> to auto-apply (use with caution).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: 9, color: C.textDim, display: 'block', marginBottom: 4 }}>Days to analyze</label>
              <input
                type="number"
                min={3}
                max={30}
                value={learningDays}
                onChange={(e) => setLearningDays(Number(e.target.value))}
                style={{ width: 70, padding: 6, background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textBright, fontSize: 12 }}
              />
            </div>
            <Btn onClick={runLearningBot} disabled={learningLoading || !secret.trim()} color={C.amber} style={{ alignSelf: 'flex-end' }}>
              {learningLoading ? 'Running...' : 'Run learning bot'}
            </Btn>
          </div>
          {learningResult && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, color: C.text, marginBottom: 8 }}>{learningResult.summary}</p>
              {Object.keys(learningResult.suggested).length > 0 && (
                <>
                  <Btn onClick={applyLearningToForm} color={C.green}>Apply to form</Btn>
                  <pre style={{ marginTop: 8, padding: 10, background: '#050c16', borderRadius: 5, fontSize: 10, overflow: 'auto' }}>
                    {JSON.stringify(learningResult.suggested, null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>DOC</SectionLabel>
          <p style={{ fontSize: 11, color: C.textDim }}>
            See <code style={{ color: C.blue }}>apps/progno/TESTING-AND-FINE-TUNING.md</code> for testing and tuning; <code style={{ color: C.blue }}>LEARNING-BOT.md</code> for the learning bot (experimental, env flags, ideas).
          </p>
        </Card>
      </div>
    </div>
  );
}
