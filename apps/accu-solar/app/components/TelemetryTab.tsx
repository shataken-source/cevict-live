'use client';

import { Activity, Zap, Sun, Battery, TrendingUp } from 'lucide-react';
import { useSolar, SYSTEM_CONFIG } from '../context/SolarContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function TelemetryTab() {
  const { data, spark } = useSolar();

  const distribution = [
    { name: 'To Load', watts: Math.min(data.solarPowerW, data.loadPowerW), color: '#a78bfa' },
    { name: 'To Battery', watts: Math.max(0, data.batteryPowerW), color: '#34d399' },
    { name: 'To Grid', watts: data.gridStatus === 'Exporting' ? Math.abs(data.netPowerW) : 0, color: '#7dd3fc' },
    { name: 'From Grid', watts: data.gridStatus === 'Importing' ? Math.abs(data.netPowerW) : 0, color: '#fb7185' },
  ].filter(d => d.watts > 0);

  const powerQuality = [
    { label: 'Panel Voltage', value: `${data.panelVoltage}V`, target: '72–80V', ok: data.panelVoltage >= 60 && data.panelVoltage <= 85 },
    { label: 'Panel Current', value: `${data.panelCurrent}A`, target: '≤ 80A', ok: data.panelCurrent <= 80 },
    { label: 'Battery Voltage', value: `${data.batteryVoltage}V`, target: '11.8–14.6V', ok: data.batteryVoltage >= 11.5 && data.batteryVoltage <= 14.8 },
    { label: 'Charge Current', value: `${Math.abs(data.batteryCurrent).toFixed(1)}A`, target: '≤ 80A', ok: Math.abs(data.batteryCurrent) <= 80 },
    { label: 'Controller Temp', value: `${data.controllerTemp}°C`, target: '< 50°C', ok: data.controllerTemp < 50 },
    { label: 'Efficiency', value: `${data.solarPowerW > 0 ? Math.round((data.solarPowerW / SYSTEM_CONFIG.peakWatts) * 100) : 0}%`, target: 'of peak', ok: true },
  ];

  return (
    <div className="space-y-4">
      {/* System Pulse Hero */}
      <div className="heroPanel">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="panelTitle text-base">System Pulse — Last 60 Readings</span>
          </div>
          <div className="text-sm text-slate-400">
            Peak: <span className="text-amber-400 font-semibold">{spark.length ? Math.max(...spark.map(s => s.watts)) : 0}W</span>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, SYSTEM_CONFIG.peakWatts]} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}W`, 'Solar']}
              />
              <Area type="monotone" dataKey="watts" stroke="#f59e0b" strokeWidth={2} fill="url(#solarGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="analyticsGrid">
        {/* Energy Distribution */}
        <div className="panel">
          <div className="panelTitleRow">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span className="panelTitle">Energy Distribution</span>
          </div>
          {distribution.length > 0 ? (
            <div className="space-y-3">
              {distribution.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{d.name}</span>
                    <span className="font-semibold" style={{ color: d.color }}>{d.watts}W</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (d.watts / data.solarPowerW) * 100)}%`, background: d.color }}
                    />
                  </div>
                </div>
              ))}
              <div className="h-32 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`${v}W`]}
                    />
                    <Bar dataKey="watts" radius={[4, 4, 0, 0]}>
                      {distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">No solar production currently</div>
          )}
        </div>

        {/* Power Quality */}
        <div className="panel">
          <div className="panelTitleRow">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="panelTitle">Power Quality Metrics</span>
          </div>
          <div className="space-y-3">
            {powerQuality.map(pq => (
              <div key={pq.label} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${pq.ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <span className="text-sm text-slate-300">{pq.label}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${pq.ok ? 'text-slate-100' : 'text-amber-400'}`}>{pq.value}</div>
                  <div className="text-xs text-slate-600">{pq.target}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live readings strip */}
      <div className="panel">
        <div className="panelTitleRow">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="panelTitle">Live Readings</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Solar', value: `${(data.solarPowerW / 1000).toFixed(2)} kW`, color: 'text-amber-400' },
            { label: 'Battery', value: `${Math.round(data.batterySoc)}%`, color: 'text-blue-400' },
            { label: 'Load', value: `${(data.loadPowerW / 1000).toFixed(2)} kW`, color: 'text-purple-400' },
            { label: 'Batt V', value: `${data.batteryVoltage}V`, color: 'text-slate-200' },
            { label: 'Batt A', value: `${data.batteryCurrent.toFixed(1)}A`, color: data.batteryCurrent > 0 ? 'text-emerald-400' : 'text-rose-400' },
            { label: 'Temp', value: `${data.controllerTemp}°C`, color: data.controllerTemp > 50 ? 'text-amber-400' : 'text-slate-200' },
          ].map(r => (
            <div key={r.label} className="kpiTile text-center">
              <div className="text-xs text-slate-500">{r.label}</div>
              <div className={`text-base font-bold tabular-nums ${r.color}`}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
