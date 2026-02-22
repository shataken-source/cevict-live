'use client';

import { Battery, Thermometer, Clock, AlertCircle, TrendingDown } from 'lucide-react';
import { useSolar, SYSTEM_CONFIG } from '../context/SolarContext';

function SocRing({ pct }: { pct: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color = pct < 20 ? '#fb7185' : pct < 40 ? '#fbbf24' : '#7dd3fc';
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x="70" y="66" textAnchor="middle" fill={color} fontSize="22" fontWeight="bold">{Math.round(pct)}%</text>
      <text x="70" y="84" textAnchor="middle" fill="#64748b" fontSize="11">State of Charge</text>
    </svg>
  );
}

export default function BatteryTab() {
  const { data } = useSolar();

  const totalEnergyKwh = (data.batterySoc / 100) * SYSTEM_CONFIG.totalKwh;
  const usableEnergyKwh = (data.batterySoc / 100) * SYSTEM_CONFIG.usableKwh;

  // Time estimates
  const avgLoadKw = data.loadPowerW / 1000;
  const hoursRemaining = avgLoadKw > 0 ? usableEnergyKwh / avgLoadKw : null;

  // Battery Stress Index formula
  const highCRateEvents = data.batteryCurrent > 100 ? 1 : 0;
  const avgTempExposure = Math.max(0, (data.controllerTemp - 25) / 40);
  const deepDischargeCount = data.batterySoc < 20 ? 1 : 0;
  const imbalanceFactor = 0.05; // demo: low imbalance
  const stressIndex = Math.min(100, Math.round(
    (highCRateEvents * 0.3 + avgTempExposure * 0.3 + deepDischargeCount * 0.2 + imbalanceFactor * 0.2) * 100
  ));

  // Simulated cell voltages for 8 batteries (12V each, series-parallel)
  const cellVoltages = Array.from({ length: 8 }, (_, i) => {
    const base = data.batteryVoltage;
    const variance = (Math.sin(i * 1.3) * 0.08);
    return Math.round((base + variance) * 100) / 100;
  });
  const minV = Math.min(...cellVoltages);
  const maxV = Math.max(...cellVoltages);
  const spread = Math.round((maxV - minV) * 1000) / 1000;

  return (
    <div className="space-y-4">
      {/* Hero: SoC ring + key stats */}
      <div className="heroPanel">
        <div className="analyticsGrid">
          <div className="flex flex-col items-center justify-center gap-4">
            <SocRing pct={data.batterySoc} />
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              <div className="kpiTile text-center">
                <div className="text-xs text-slate-500">Energy Available</div>
                <div className="text-lg font-bold text-blue-400">{usableEnergyKwh.toFixed(1)} kWh</div>
              </div>
              <div className="kpiTile text-center">
                <div className="text-xs text-slate-500">Total Capacity</div>
                <div className="text-lg font-bold text-slate-300">{SYSTEM_CONFIG.totalKwh.toFixed(1)} kWh</div>
              </div>
              <div className="kpiTile text-center">
                <div className="text-xs text-slate-500">Voltage</div>
                <div className="text-lg font-bold text-slate-200">{data.batteryVoltage}V</div>
              </div>
              <div className="kpiTile text-center">
                <div className="text-xs text-slate-500">Current</div>
                <div className={`text-lg font-bold ${data.batteryCurrent > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {data.batteryCurrent > 0 ? '+' : ''}{data.batteryCurrent.toFixed(1)}A
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Time remaining */}
            <div className="panel">
              <div className="panelTitleRow">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="panelTitle">Time Estimate</span>
              </div>
              {data.batteryCurrent > 0 ? (
                <div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {((100 - data.batterySoc) / 100 * SYSTEM_CONFIG.totalKwh / (data.batteryPowerW / 1000)).toFixed(1)}h
                  </div>
                  <div className="text-xs text-slate-500">to full charge at current rate</div>
                </div>
              ) : hoursRemaining ? (
                <div>
                  <div className="text-2xl font-bold text-amber-400">{hoursRemaining.toFixed(1)}h</div>
                  <div className="text-xs text-slate-500">remaining at {avgLoadKw.toFixed(2)} kW load</div>
                </div>
              ) : (
                <div className="text-slate-500 text-sm">No load detected</div>
              )}
            </div>

            {/* Battery Stress Index */}
            <div className="panel">
              <div className="panelTitleRow">
                <TrendingDown className="w-4 h-4 text-purple-400" />
                <span className="panelTitle">Battery Stress Index</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${stressIndex > 60 ? 'text-rose-400' : stressIndex > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {stressIndex}
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${stressIndex > 60 ? 'bg-rose-500' : stressIndex > 30 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${stressIndex}%` }} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {stressIndex < 20 ? 'Low stress — excellent health' : stressIndex < 50 ? 'Moderate stress' : 'High stress — check system'}
                  </div>
                </div>
              </div>
            </div>

            {/* Charging status */}
            <div className="panel">
              <div className="panelTitleRow">
                <Battery className="w-4 h-4 text-blue-400" />
                <span className="panelTitle">Charge Status</span>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Mode', value: data.chargingMode },
                  { label: 'MPPT', value: data.mpptTracking ? 'Tracking' : 'Inactive' },
                  { label: 'Float', value: data.floatCharging ? 'Active' : 'Inactive' },
                  { label: 'Overheat', value: data.overheatWarning ? 'WARNING' : 'Normal' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between">
                    <span className="text-slate-500">{s.label}</span>
                    <span className={s.value === 'WARNING' ? 'text-rose-400 font-semibold' : 'text-slate-200'}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cell voltage comparison */}
      <div className="panel">
        <div className="panelTitleRow">
          <Battery className="w-4 h-4 text-blue-400" />
          <span className="panelTitle">Battery String Comparison — 8× EcoWorthy 280Ah 12V</span>
          {spread > 0.2 && (
            <span className="ml-auto alertBadge flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Imbalance {spread}V
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {cellVoltages.map((v, i) => {
            const isLow = v === minV && spread > 0.1;
            const isHigh = v === maxV && spread > 0.1;
            return (
              <div key={i} className={`kpiTile text-center border ${isLow ? 'border-amber-500/50' : isHigh ? 'border-emerald-500/30' : 'border-transparent'}`}>
                <div className="text-xs text-slate-500">Batt {i + 1}</div>
                <div className={`text-sm font-bold tabular-nums ${isLow ? 'text-amber-400' : 'text-slate-200'}`}>{v}V</div>
                <div className="mt-1 h-8 flex items-end justify-center">
                  <div
                    className={`w-4 rounded-t ${isLow ? 'bg-amber-400' : 'bg-blue-500'}`}
                    style={{ height: `${Math.max(10, ((v - 11.5) / 3) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>Min: <span className="text-amber-400">{minV}V</span></span>
          <span>Spread: <span className={spread > 0.2 ? 'text-amber-400' : 'text-emerald-400'}>{spread}V</span></span>
          <span>Max: <span className="text-emerald-400">{maxV}V</span></span>
        </div>
      </div>

      {/* System specs */}
      <div className="panel">
        <div className="panelTitleRow">
          <Battery className="w-4 h-4 text-slate-400" />
          <span className="panelTitle">System Specifications</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { label: 'Battery Count', value: `${SYSTEM_CONFIG.batteryCount}× batteries` },
            { label: 'Nominal Voltage', value: `${SYSTEM_CONFIG.batteryVoltage}V each` },
            { label: 'Capacity Each', value: `${SYSTEM_CONFIG.batteryAh}Ah` },
            { label: 'Total Capacity', value: `${SYSTEM_CONFIG.totalAh}Ah` },
            { label: 'Total Energy', value: `${SYSTEM_CONFIG.totalKwh.toFixed(1)} kWh` },
            { label: 'Usable (80% DoD)', value: `${SYSTEM_CONFIG.usableKwh.toFixed(1)} kWh` },
            { label: 'Max Charge', value: `${SYSTEM_CONFIG.maxChargeAmps}A` },
            { label: 'Controller', value: SYSTEM_CONFIG.controller },
          ].map(s => (
            <div key={s.label} className="kpiTile">
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="text-sm font-semibold text-slate-200">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
