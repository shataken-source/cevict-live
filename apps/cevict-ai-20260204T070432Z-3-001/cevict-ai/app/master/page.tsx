'use client';
import React, { useEffect, useState } from 'react';

export default function MasterDashboard() {
  const [configs, setConfigs] = useState([]);

  const fetchConfigs = () => {
    fetch('/api/master-settings')
      .then(res => res.json())
      .then(data => setConfigs(Array.isArray(data) ? data : []))
      .catch(err => console.error("Dashboard Fetch Error:", err));
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const toggleFeature = async (project_id, feature_key, current_state) => {
    await fetch('/api/master-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id, feature_key, is_enabled: !current_state })
    });
    fetchConfigs();
  };

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-white font-sans">
      <header className="mb-12 border-b border-slate-800 pb-4">
        <h1 className="text-4xl font-bold text-cyan-400">CEVICT MASTER CONTROL</h1>
        <p className="text-slate-400">Cevict Ecosystem | Albertville, AL</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configs.length > 0 ? configs.map((cfg) => (
          <div key={cfg.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <span className="uppercase text-xs font-bold tracking-widest text-slate-500">{cfg.project_id}</span>
              <span className={cfg.is_enabled ? "text-green-500" : "text-red-500"}>
                ● {cfg.is_enabled ? "Active" : "Disabled"}
              </span>
            </div>
            <h2 className="text-xl font-semibold mb-4">{cfg.feature_key.replace(/_/g, ' ')}</h2>
            <button 
              onClick={() => toggleFeature(cfg.project_id, cfg.feature_key, cfg.is_enabled)}
              className={`w-full py-2 rounded font-bold transition-all ${
                cfg.is_enabled ? "bg-red-900/50 text-red-200 border border-red-500" : "bg-cyan-900/50 text-cyan-200 border border-cyan-500"
              }`}
            >
              {cfg.is_enabled ? "SHUT DOWN" : "ACTIVATE"}
            </button>
          </div>
        )) : (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-500 italic">No configurations found. Run the SQL seeding script.</p>
          </div>
        )}
      </div>
    </div>
  );
}