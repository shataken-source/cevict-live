'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Alert {
  game_id: string;
  alert_type: string;
  bet_type: string;
  sharp_side: string;
  is_reverse_line_movement: boolean;
  is_line_freeze: boolean;
  confidence_score: number;
  created_at: string;
}

export default function LiveOddsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<{ total: number; rlm: number; lineFreeze: number; avgConfidence: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoursBack, setHoursBack] = useState(24);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/progno/live-odds/alerts?hoursBack=${hoursBack}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        setAlerts(data.data?.alerts ?? []);
        setSummary(data.data?.summary ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [hoursBack]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Odds Dashboard</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Sharp money alerts, RLM, and line freeze detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-400">Window:</label>
            <select
              aria-label="Time window for alerts"
              value={hoursBack}
              onChange={(e) => setHoursBack(Number(e.target.value))}
              className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-1.5 text-sm"
            >
              <option value={6}>Last 6 hours</option>
              <option value={12}>Last 12 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={48}>Last 48 hours</option>
            </select>
            <Link
              href="/progno"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Back to Progno
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500">
            Loading alerts…
          </div>
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total alerts</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{summary.total}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">RLM</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{summary.rlm}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Line freeze</p>
                  <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">{summary.lineFreeze}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg confidence</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {summary.avgConfidence.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <h2 className="px-4 py-3 font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                Recent alerts
              </h2>
              {alerts.length === 0 ? (
                <p className="p-6 text-slate-500 dark:text-slate-400 text-sm">
                  No sharp money alerts in the selected window. Odds are captured by cron; run{' '}
                  <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">/api/cron/capture-odds</code> to populate.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {alerts.map((a, i) => (
                    <li key={`${a.game_id}-${a.alert_type}-${a.bet_type}-${i}`} className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-mono text-slate-500 dark:text-slate-400 truncate max-w-[120px]" title={a.game_id}>
                        {a.game_id}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {a.alert_type}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">{a.bet_type}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{a.sharp_side}</span>
                      {a.is_reverse_line_movement && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                          RLM
                        </span>
                      )}
                      {a.is_line_freeze && (
                        <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200">
                          Freeze
                        </span>
                      )}
                      <span className="text-slate-500 dark:text-slate-400 ml-auto">
                        {a.confidence_score.toFixed(0)}% · {new Date(a.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
