'use client';

import { TrendingUp, Zap, Sun, Clock, AlertTriangle, CheckCircle2, BarChart2 } from 'lucide-react';
import { useSolar, SYSTEM_CONFIG } from '../context/SolarContext';

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score > 70 ? '#34d399' : score > 40 ? '#fbbf24' : '#fb7185';
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x="50" y="46" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">{score}</text>
      <text x="50" y="60" textAnchor="middle" fill="#64748b" fontSize="9">{label}</text>
    </svg>
  );
}

export default function OptimizationTab() {
  const { data } = useSolar();

  // Clipping detection: solar > max controller output
  const maxControllerOutputW = SYSTEM_CONFIG.maxChargeAmps * (SYSTEM_CONFIG.batteryVoltage * 1.2);
  const clippingW = Math.max(0, data.solarPowerW - maxControllerOutputW);
  const clippingPct = data.solarPowerW > 0 ? Math.round((clippingW / data.solarPowerW) * 100) : 0;
  const isClipping = clippingW > 50;

  // Optimization score
  const efficiencyScore = Math.min(100, Math.round((data.solarPowerW / SYSTEM_CONFIG.peakWatts) * 100));
  const batteryScore = data.batterySoc > 20 && data.batterySoc < 95 ? 100 : data.batterySoc <= 20 ? 30 : 85;
  const tempScore = data.controllerTemp < 40 ? 100 : data.controllerTemp < 55 ? 70 : 30;
  const optimizationScore = Math.round((efficiencyScore * 0.5 + batteryScore * 0.3 + tempScore * 0.2));

  // Load shifting opportunities
  const excessW = Math.max(0, data.solarPowerW - data.loadPowerW);
  const peakHour = new Date().getHours();
  const isSolarPeak = peakHour >= 10 && peakHour <= 15;

  // Time-of-use estimates (avg US residential rate)
  const avgRatePerKwh = 0.14;
  const dailySavings = (data.todayKwh * avgRatePerKwh).toFixed(2);
  const monthlySavings = (data.todayKwh * avgRatePerKwh * 30).toFixed(0);
  const annualSavings = (data.todayKwh * avgRatePerKwh * 365).toFixed(0);

  const opportunities = [
    {
      title: 'Run dishwasher now',
      desc: `${excessW > 1200 ? 'Excellent' : excessW > 600 ? 'Good' : 'Low'} solar surplus (${Math.round(excessW)}W excess)`,
      saving: '~0.8 kWh',
      ok: excessW > 600,
      icon: Zap,
    },
    {
      title: 'Run washing machine',
      desc: isSolarPeak ? 'Peak solar hours — ideal time' : 'Wait for 10AM–3PM solar peak',
      saving: '~1.2 kWh',
      ok: isSolarPeak && excessW > 500,
      icon: Clock,
    },
    {
      title: 'EV / battery charging',
      desc: data.batterySoc < 80 ? `Battery at ${Math.round(data.batterySoc)}% — charge now` : 'Battery full — defer to solar peak',
      saving: 'Variable',
      ok: data.batterySoc < 80 && data.solarPowerW > 500,
      icon: TrendingUp,
    },
    {
      title: 'Water heater boost',
      desc: excessW > 2000 ? 'Large surplus available — boost now' : 'Insufficient surplus for water heater',
      saving: '~3.0 kWh',
      ok: excessW > 2000,
      icon: Sun,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Optimization Score Hero */}
      <div className="heroPanel">
        <div className="analyticsGrid">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span className="panelTitle text-base">System Optimization Score</span>
            </div>
            <div className="flex items-center gap-6 mb-4">
              <ScoreRing score={optimizationScore} label="Overall" />
              <div className="space-y-2 flex-1">
                {[
                  { label: 'Solar Efficiency', score: efficiencyScore },
                  { label: 'Battery Health', score: batteryScore },
                  { label: 'Thermal', score: tempScore },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{s.label}</span>
                      <span className={`font-semibold ${s.score > 70 ? 'text-emerald-400' : s.score > 40 ? 'text-amber-400' : 'text-rose-400'}`}>{s.score}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${s.score > 70 ? 'bg-emerald-400' : s.score > 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ width: `${s.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cost Impact */}
          <div className="space-y-3">
            <div className="panel">
              <div className="panelTitleRow">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <span className="panelTitle">Cost Impact</span>
                <span className="ml-auto text-xs text-slate-500">@ $0.14/kWh avg</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="kpiTile">
                  <div className="text-xs text-slate-500">Today</div>
                  <div className="text-lg font-bold text-emerald-400">${dailySavings}</div>
                </div>
                <div className="kpiTile">
                  <div className="text-xs text-slate-500">Monthly</div>
                  <div className="text-lg font-bold text-emerald-400">${monthlySavings}</div>
                </div>
                <div className="kpiTile">
                  <div className="text-xs text-slate-500">Annual</div>
                  <div className="text-lg font-bold text-emerald-400">${annualSavings}</div>
                </div>
              </div>
            </div>

            {/* Clipping Alert */}
            <div className={`panel border ${isClipping ? 'border-amber-500/40 bg-amber-900/10' : 'border-slate-700'}`}>
              <div className="panelTitleRow">
                <AlertTriangle className={`w-4 h-4 ${isClipping ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="panelTitle">Clipping / Curtailment</span>
              </div>
              {isClipping ? (
                <div>
                  <div className="text-2xl font-bold text-amber-400">{clippingW}W</div>
                  <div className="text-xs text-amber-300 mt-1">{clippingPct}% of solar output being clipped</div>
                  <div className="text-xs text-slate-500 mt-2">Controller max: {Math.round(maxControllerOutputW)}W · Consider adding a second controller or reducing string voltage</div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  No clipping detected
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Load Shifting Opportunities */}
      <div className="panel">
        <div className="panelTitleRow">
          <Clock className="w-4 h-4 text-sky-400" />
          <span className="panelTitle">Load Shifting Opportunities</span>
          <span className="ml-auto text-xs text-slate-500">
            {isSolarPeak ? '☀️ Solar peak hours' : '⏳ Off-peak'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {opportunities.map(op => (
            <div key={op.title} className={`rounded-xl p-4 border ${op.ok ? 'bg-emerald-900/15 border-emerald-700/40' : 'bg-slate-900/40 border-slate-700/50'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${op.ok ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                  <op.icon className={`w-4 h-4 ${op.ok ? 'text-emerald-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{op.title}</span>
                    <span className={`badge ${op.ok ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-500 border border-slate-600'}`}>
                      {op.ok ? 'Now' : 'Wait'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{op.desc}</div>
                  <div className="text-xs text-slate-500 mt-1">Saves {op.saving}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Peak Demand Analysis */}
      <div className="panel">
        <div className="panelTitleRow">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="panelTitle">Peak Demand Analysis</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Solar Now', value: `${(data.solarPowerW / 1000).toFixed(2)} kW`, color: 'text-amber-400' },
            { label: 'Load Now', value: `${(data.loadPowerW / 1000).toFixed(2)} kW`, color: 'text-purple-400' },
            { label: 'Surplus', value: `${(Math.max(0, excessW) / 1000).toFixed(2)} kW`, color: excessW > 0 ? 'text-emerald-400' : 'text-rose-400' },
            { label: 'Self-Consumption', value: `${data.solarPowerW > 0 ? Math.min(100, Math.round((Math.min(data.solarPowerW, data.loadPowerW) / data.solarPowerW) * 100)) : 0}%`, color: 'text-sky-400' },
          ].map(m => (
            <div key={m.label} className="kpiTile">
              <div className="text-xs text-slate-500">{m.label}</div>
              <div className={`text-lg font-bold tabular-nums ${m.color}`}>{m.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-500 bg-slate-900/50 rounded-lg p-3">
          <strong className="text-slate-400">Tip:</strong> Your {SYSTEM_CONFIG.peakWatts}W array with {SYSTEM_CONFIG.usableKwh.toFixed(0)} kWh usable storage can offset most daytime loads.
          {excessW > 500 && ` You currently have ${Math.round(excessW)}W of unused solar — run high-draw appliances now.`}
          {!isSolarPeak && ' Schedule heavy loads (dishwasher, laundry, EV charging) between 10AM–3PM for maximum solar offset.'}
        </div>
      </div>
    </div>
  );
}
