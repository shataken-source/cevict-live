'use client';
import React, { useEffect, useState } from 'react';

export default function MasterStatus() {
  const [stats, setStats] = useState({ confidence: 0, activeTrades: 0, delta: 0 });

  useEffect(() => {
    // Simulating the PROGNO + Kalshi live feed
    const interval = setInterval(() => {
      setStats({
        confidence: Math.random() * 20 + 75, // 75-95%
        activeTrades: Math.floor(Math.random() * 5) + 2,
        delta: Math.random() * 0.15 + 0.05 // 5-20% edge
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-slate-900/50 border border-cyan-500/30 p-4 rounded-lg">
        <p className="text-xs text-cyan-500 uppercase font-bold">Bayesian Confidence</p>
        <p className="text-2xl font-mono text-white">{stats.confidence.toFixed(2)}%</p>
      </div>
      <div className="bg-slate-900/50 border border-green-500/30 p-4 rounded-lg">
        <p className="text-xs text-green-500 uppercase font-bold">Kalshi Referral Edge</p>
        <p className="text-2xl font-mono text-white">+{stats.delta.toFixed(2)}%</p>
      </div>
      <div className="bg-slate-900/50 border border-purple-500/30 p-4 rounded-lg">
        <p className="text-xs text-purple-500 uppercase font-bold">Active Bots</p>
        <p className="text-2xl font-mono text-white">3 (Orch, Diag, Rep)</p>
      </div>
    </div>
  );
}