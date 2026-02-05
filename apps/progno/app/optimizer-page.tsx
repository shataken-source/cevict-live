"use client";

import { useMemo, useState } from "react";

function kellyFraction(edge: number, oddsDecimal: number, cap: number = 0.25) {
  // edge is probability advantage over break-even (e.g., confidence-0.5)
  // oddsDecimal ~ 1.91 for -110
  const p = 0.5 + edge;
  const b = oddsDecimal - 1;
  const f = ((p * (b + 1)) - 1) / b;
  return Math.max(0, Math.min(f, cap));
}

export default function OptimizerPage() {
  const [bankroll, setBankroll] = useState(1000);
  const [edge, setEdge] = useState(0.05); // 5% edge
  const [confidence, setConfidence] = useState(0.6); // 60%
  const [americanOdds, setAmericanOdds] = useState(-110);
  const [cap, setCap] = useState(0.25);

  const oddsDecimal = useMemo(() => {
    if (americanOdds > 0) return 1 + americanOdds / 100;
    return 1 + 100 / Math.abs(americanOdds);
  }, [americanOdds]);

  const fraction = useMemo(() => kellyFraction(edge, oddsDecimal, cap), [edge, oddsDecimal, cap]);
  const stake = Math.max(0, Math.round(bankroll * fraction));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Bankroll Optimizer</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2 border rounded p-3">
          <label className="block text-sm font-semibold">Bankroll ($)</label>
          <input className="border rounded px-2 py-1 w-full" type="number" value={bankroll} onChange={e => setBankroll(Number(e.target.value))} />

          <label className="block text-sm font-semibold">Edge (e.g., 0.05 = 5%)</label>
          <input className="border rounded px-2 py-1 w-full" type="number" step="0.01" value={edge} onChange={e => setEdge(Number(e.target.value))} />

          <label className="block text-sm font-semibold">Confidence (e.g., 0.6 = 60%)</label>
          <input className="border rounded px-2 py-1 w-full" type="number" step="0.01" value={confidence} onChange={e => setConfidence(Number(e.target.value))} />

          <label className="block text-sm font-semibold">American Odds (e.g., -110)</label>
          <input className="border rounded px-2 py-1 w-full" type="number" value={americanOdds} onChange={e => setAmericanOdds(Number(e.target.value))} />

          <label className="block text-sm font-semibold">Kelly Cap (0-1, default 0.25)</label>
          <input className="border rounded px-2 py-1 w-full" type="number" step="0.01" value={cap} onChange={e => setCap(Number(e.target.value))} />
        </div>

        <div className="space-y-2 border rounded p-3">
          <div className="text-lg font-semibold">Suggested Stake</div>
          <div className="text-3xl font-bold">${stake}</div>
          <div className="text-sm text-gray-600">Fraction of roll: {(fraction * 100).toFixed(2)}%</div>
          <div className="text-sm text-gray-600">Decimal odds: {oddsDecimal.toFixed(3)}</div>
          <div className="text-sm text-gray-600">Assumes edge = confidence - 0.5 blended with price</div>
          <div className="text-xs text-gray-500">Cap keeps stakes reasonable; lower cap if variance high.</div>
        </div>
      </div>
    </div>
  );
}

