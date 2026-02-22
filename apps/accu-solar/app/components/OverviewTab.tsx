'use client';

import { Sun, Battery, Zap, TrendingUp, AlertCircle, CheckCircle2, ArrowUp, ArrowDown, Minus, Thermometer, Activity } from 'lucide-react';
import { useSolar, SYSTEM_CONFIG } from '../context/SolarContext';

function PowerFlowArrow({ watts, label, color }: { watts: number; label: string; color: string }) {
  const abs = Math.abs(watts);
  const active = abs > 20;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-xs font-medium ${active ? color : 'text-slate-600'}`}>{label}</div>
      <div className={`text-lg font-bold tabular-nums ${active ? color : 'text-slate-600'}`}>
        {active ? `${(abs / 1000).toFixed(2)} kW` : '—'}
      </div>
    </div>
  );
}

export default function OverviewTab() {
  const { data, isConnected, lastUpdated } = useSolar();

  const alerts: { msg: string; level: 'warn' | 'crit' }[] = [];
  if (data.batterySoc < 10) alerts.push({ msg: 'Battery critically low — check load', level: 'crit' });
  else if (data.batterySoc < 20) alerts.push({ msg: 'Battery below 20% — reduce consumption', level: 'warn' });
  if (data.controllerTemp > 65) alerts.push({ msg: `Controller overheating: ${data.controllerTemp}°C`, level: 'crit' });
  else if (data.controllerTemp > 50) alerts.push({ msg: `Controller warm: ${data.controllerTemp}°C`, level: 'warn' });
  if (data.overheatWarning) alerts.push({ msg: 'Overheat protection active', level: 'crit' });

  const efficiencyPct = data.solarPowerW > 0
    ? Math.min(100, Math.round((data.solarPowerW / SYSTEM_CONFIG.peakWatts) * 100))
    : 0;

  const timeToFull = data.batterySoc < 99 && data.batteryPowerW > 0
    ? ((100 - data.batterySoc) / 100 * SYSTEM_CONFIG.totalKwh) / (data.batteryPowerW / 1000)
    : null;

  const timeToEmpty = data.batterySoc > 5 && data.batteryPowerW < 0
    ? (data.batterySoc / 100 * SYSTEM_CONFIG.usableKwh) / (Math.abs(data.batteryPowerW) / 1000)
    : null;

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
              a.level === 'crit'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Hero KPI row */}
      <div className="analyticsGrid">
        {/* Left: Production hero */}
        <div className="heroPanel">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              <span className="panelTitle">Solar Production</span>
            </div>
            <div className="flex items-center gap-2">
              {isConnected
                ? <span className="statusBadge flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Live</span>
                : <span className="alertBadge">Connecting…</span>
              }
              <span className={`badge ${
                data.chargingMode === 'MPPT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                data.chargingMode === 'Float' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                'bg-slate-700 text-slate-400 border border-slate-600'
              }`}>{data.chargingMode}</span>
            </div>
          </div>

          <div className="flex items-end gap-4 mb-4">
            <div>
              <div className="kpiValueLarge text-amber-400">
                {(data.solarPowerW / 1000).toFixed(2)}
              </div>
              <div className="text-slate-400 text-sm">kW now</div>
            </div>
            <div className="flex-1 pb-1">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-1000"
                  style={{ width: `${efficiencyPct}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">{efficiencyPct}% of {SYSTEM_CONFIG.peakWatts}W peak</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="kpiTile">
              <div className="text-xs text-slate-500">Today</div>
              <div className="text-lg font-bold text-amber-400">{data.todayKwh.toFixed(1)} kWh</div>
            </div>
            <div className="kpiTile">
              <div className="text-xs text-slate-500">Panel V</div>
              <div className="text-lg font-bold text-slate-200">{data.panelVoltage}V</div>
            </div>
            <div className="kpiTile">
              <div className="text-xs text-slate-500">Panel A</div>
              <div className="text-lg font-bold text-slate-200">{data.panelCurrent}A</div>
            </div>
          </div>
        </div>

        {/* Right: Battery + Load */}
        <div className="space-y-3">
          {/* Battery */}
          <div className="panel">
            <div className="panelTitleRow">
              <Battery className="w-4 h-4 text-blue-400" />
              <span className="panelTitle">Battery Bank</span>
              <span className="ml-auto text-xs text-slate-500">8× 280Ah 12V</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <div className={`kpiValueLarge ${
                  data.batterySoc < 20 ? 'text-rose-400' :
                  data.batterySoc < 40 ? 'text-amber-400' : 'text-blue-400'
                }`}>{Math.round(data.batterySoc)}%</div>
                <div className="text-xs text-slate-500 mt-0.5">{data.batteryVoltage}V</div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      data.batterySoc < 20 ? 'bg-rose-500' :
                      data.batterySoc < 40 ? 'bg-amber-400' : 'bg-blue-500'
                    }`}
                    style={{ width: `${data.batterySoc}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span className={data.batteryCurrent > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {data.batteryCurrent > 0 ? '↑ Charging' : '↓ Discharging'} {Math.abs(data.batteryCurrent).toFixed(1)}A
                  </span>
                  <span>
                    {timeToFull ? `Full in ${timeToFull.toFixed(1)}h` :
                     timeToEmpty ? `Empty in ${timeToEmpty.toFixed(1)}h` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Load */}
          <div className="panel">
            <div className="panelTitleRow">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="panelTitle">Home Load</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="kpiValueLarge text-purple-400">{(data.loadPowerW / 1000).toFixed(2)}</div>
              <div className="text-right">
                <div className="text-xs text-slate-500">kW</div>
                <div className="text-xs text-slate-400 mt-1">{data.todayConsumedKwh.toFixed(1)} kWh today</div>
              </div>
            </div>
          </div>

          {/* Net */}
          <div className="panel">
            <div className="panelTitleRow">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span className="panelTitle">Grid / Net</span>
            </div>
            <div className="flex items-center gap-3">
              {data.gridStatus === 'Exporting'
                ? <ArrowUp className="w-5 h-5 text-emerald-400" />
                : data.gridStatus === 'Importing'
                ? <ArrowDown className="w-5 h-5 text-rose-400" />
                : <Minus className="w-5 h-5 text-slate-500" />
              }
              <div>
                <div className={`text-xl font-bold ${
                  data.gridStatus === 'Exporting' ? 'text-emerald-400' :
                  data.gridStatus === 'Importing' ? 'text-rose-400' : 'text-slate-400'
                }`}>
                  {data.gridStatus} {(Math.abs(data.netPowerW) / 1000).toFixed(2)} kW
                </div>
                <div className="text-xs text-slate-500">{data.todayExportedKwh.toFixed(1)} kWh exported today</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Power flow diagram */}
      <div className="panel">
        <div className="panelTitleRow">
          <Activity className="w-4 h-4 text-slate-400" />
          <span className="panelTitle">Power Flow</span>
        </div>
        <div className="flex items-center justify-around py-2">
          <PowerFlowArrow watts={data.solarPowerW} label="Solar" color="text-amber-400" />
          <div className="text-slate-600 text-2xl">→</div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center">
              <div className="text-xs font-bold text-slate-300 text-center leading-tight">
                {(data.solarPowerW / 1000).toFixed(1)}<br/>kW
              </div>
            </div>
            <div className="text-xs text-slate-500">System</div>
          </div>
          <div className="text-slate-600 text-2xl">→</div>
          <PowerFlowArrow watts={data.loadPowerW} label="Load" color="text-purple-400" />
          <div className="text-slate-600 text-2xl">{data.batteryPowerW > 0 ? '↓' : '↑'}</div>
          <PowerFlowArrow watts={data.batteryPowerW} label="Battery" color={data.batteryPowerW > 0 ? 'text-emerald-400' : 'text-blue-400'} />
        </div>
      </div>

      {/* System health row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Controller Temp', value: `${data.controllerTemp}°C`, ok: data.controllerTemp < 50, icon: Thermometer },
          { label: 'MPPT Tracking', value: data.mpptTracking ? 'Active' : 'Inactive', ok: data.mpptTracking, icon: Activity },
          { label: 'System Health', value: data.systemHealth, ok: data.systemHealth === 'Normal', icon: CheckCircle2 },
          { label: 'Uptime', value: `${Math.floor(data.uptimeSeconds / 3600)}h ${Math.floor((data.uptimeSeconds % 3600) / 60)}m`, ok: true, icon: Activity },
        ].map(item => (
          <div key={item.label} className="kpiTile">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
            <div className={`text-sm font-semibold ${item.ok ? 'text-slate-200' : 'text-amber-400'}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-600 text-right">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
}
