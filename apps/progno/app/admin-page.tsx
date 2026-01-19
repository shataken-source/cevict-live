"use client";

import { useEffect, useState } from "react";

interface KeyItem {
  id: string;
  label: string;
  createdAt: string;
}

export default function AdminPage() {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const [cursorStats, setCursorStats] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);

  async function loadKeys() {
    const res = await fetch("/api/admin/keys");
    const data = await res.json();
    setKeys(data.keys || []);
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function addKey() {
    if (!value.trim()) return;
    setBusy(true);
    setLog(null);
    await fetch("/api/admin/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, value })
    });
    setValue("");
    setLabel("");
    await loadKeys();
    setBusy(false);
  }

  async function deleteKey(id: string) {
    setBusy(true);
    setLog(null);
    await fetch("/api/admin/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    await loadKeys();
    setBusy(false);
  }

  async function runFriday() {
    setBusy(true);
    setLog(null);
    const res = await fetch("/api/admin/friday", { method: "POST" });
    const data = await res.json();
    setLog(`Friday run: ${JSON.stringify(data)}`);
    setBusy(false);
  }

  async function runMonday() {
    setBusy(true);
    setLog(null);
    const res = await fetch("/api/admin/monday", { method: "POST" });
    const data = await res.json();
    setLog(`Monday run: ${JSON.stringify(data)}`);
    setBusy(false);
  }

  async function loadCursorStats() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cursor-stats");
      const data = await res.json();
      setCursorStats(data);
    } finally {
      setBusy(false);
    }
  }

  async function loadMetrics() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/metrics");
      const data = await res.json();
      setMetrics(data);
    } finally {
      setBusy(false);
    }
  }

  function downloadExport() {
    window.location.href = "/api/admin/export";
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Progno Admin</h1>

      <section className="space-y-2">
        <div className="font-semibold">API Keys</div>
        <div className="flex gap-2 flex-wrap">
          <input
            className="border rounded px-2 py-1"
            placeholder="Label"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1 w-72"
            placeholder="API Key"
            value={value}
            onChange={e => setValue(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded"
            onClick={addKey}
            disabled={busy}
          >
            Add Key
          </button>
        </div>
        <div className="space-y-1">
          {keys.length === 0 && <div className="text-sm text-gray-500">No saved keys.</div>}
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 text-sm border rounded px-2 py-1">
              <div className="font-semibold">{k.label || "(unnamed)"}</div>
              <div className="text-gray-500">Added {new Date(k.createdAt).toLocaleString()}</div>
              <button
                className="text-red-600 hover:underline"
                onClick={() => deleteKey(k.id)}
                disabled={busy}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="font-semibold">Runs</div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="bg-emerald-600 text-white px-3 py-1 rounded"
            onClick={runFriday}
            disabled={busy}
          >
            Run Friday (odds + picks)
          </button>
          <button
            className="bg-emerald-700 text-white px-3 py-1 rounded"
            onClick={runMonday}
            disabled={busy}
          >
            Run Monday (finals + grading)
          </button>
        </div>
        {log && <div className="text-sm text-gray-700 break-all">{log}</div>}
      </section>

      <section className="space-y-2">
        <div className="font-semibold">Performance Metrics</div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="bg-indigo-600 text-white px-3 py-1 rounded"
            onClick={loadMetrics}
            disabled={busy}
          >
            Refresh Accuracy
          </button>
          <button
            className="bg-indigo-700 text-white px-3 py-1 rounded"
            onClick={downloadExport}
            disabled={busy}
          >
            Download CSV Export
          </button>
        </div>
        {metrics && (
          <div className="text-sm space-y-1">
            <div>
              Overall win rate:{" "}
              <span className="font-semibold">
                {(metrics.winRate * 100).toFixed(1)}%
              </span>{" "}
              over {metrics.totalPredictions} predictions, ROI{" "}
              <span className="font-semibold">
                {metrics.roi.toFixed(1)}%
              </span>
            </div>
            {metrics.bySport && (
              <div className="space-y-0.5">
                {Object.entries(metrics.bySport).map(([sport, m]: [string, any]) => (
                  <div key={sport}>
                    <span className="font-semibold">{sport}:</span>{" "}
                    {(m.winRate * 100).toFixed(1)}% win, {m.correctPredictions}/
                    {m.totalPredictions} correct, ROI {m.roi.toFixed(1)}%
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="font-semibold">Cursor Engine (shadow learner)</div>
        <button
          className="bg-slate-700 text-white px-3 py-1 rounded"
          onClick={loadCursorStats}
          disabled={busy}
        >
          View Cursor Stats
        </button>
        {cursorStats && (
          <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded max-h-64 overflow-auto">
            {JSON.stringify(cursorStats, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}

