'use client';

import { useState } from 'react';
import { Battery, Zap, Timer, AlertTriangle } from 'lucide-react';

export default function BatteryMonitor() {
  const [hasHardware, setHasHardware] = useState(false);
  const [battery, setBattery] = useState({
    percentage: 87,
    voltage: 12.6,
    current: -8.5, // Negative = discharging
    temperature: 72,
    timeRemaining: 18, // hours
    cycles: 245,
    health: 94,
  });

  const cells = hasHardware ? [
    { id: 1, voltage: 3.35, temp: 71 },
    { id: 2, voltage: 3.36, temp: 72 },
    { id: 3, voltage: 3.34, temp: 70 },
    { id: 4, voltage: 3.35, temp: 71 },
  ] : [];

  const loads = hasHardware ? [
    { name: 'Refrigerator', watts: 45, hours: 24, daily: 1080 },
    { name: 'Lights', watts: 20, hours: 4, daily: 80 },
    { name: 'Water Pump', watts: 60, hours: 0.5, daily: 30 },
    { name: 'Phone/Devices', watts: 15, hours: 3, daily: 45 },
  ] : [];

  const totalDaily = loads.reduce((sum, load) => sum + load.daily, 0);
  const batteryCapacity = 200; // Ah
  const usableCapacity = batteryCapacity * 0.8; // 80% usable (lead acid)

  return (
    <div className="space-y-6">
      {/* Connection Banner */}
      {!hasHardware && (
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Battery className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-medium text-blue-400">Connect Battery Monitor</div>
                <div className="text-sm text-blue-200">Pair with your battery shunt or BMS via Bluetooth</div>
              </div>
            </div>
            <button
              onClick={() => setHasHardware(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Simulate Connection
            </button>
          </div>
        </div>
      )}

      {/* Main Battery Status */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Battery className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-semibold">Battery Monitor</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Battery Level */}
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-2">Battery Level</div>
            {hasHardware ? (
              <>
                <div className="text-4xl font-bold text-emerald-400">{battery.percentage}%</div>
                <div className="mt-3 w-full bg-slate-600 rounded-full h-3">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all"
                    style={{ width: `${battery.percentage}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-slate-400">{battery.timeRemaining} hours remaining</div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-slate-500">--</div>
                <div className="text-sm text-slate-400 mt-2">No battery connected</div>
              </div>
            )}
          </div>

          {/* Voltage & Current */}
          <div className="space-y-3">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Voltage</div>
              <div className={`text-2xl font-semibold ${hasHardware ? '' : 'text-slate-500'}`}>
                {hasHardware ? `${battery.voltage}V` : '--'}
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Current</div>
              <div className={`text-2xl font-semibold ${hasHardware ? (battery.current < 0 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-500'}`}>
                {hasHardware ? `${battery.current > 0 ? '+' : ''}${battery.current}A` : '--'}
              </div>
            </div>
          </div>

          {/* Battery Health */}
          <div className="space-y-3">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Battery Health</div>
              <div className={`text-2xl font-semibold ${hasHardware ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasHardware ? `${battery.health}%` : '--'}
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Charge Cycles</div>
              <div className={`text-2xl font-semibold ${hasHardware ? '' : 'text-slate-500'}`}>
                {hasHardware ? battery.cycles : '--'}
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Temperature</div>
              <div className={`text-2xl font-semibold ${hasHardware ? '' : 'text-slate-500'}`}>
                {hasHardware ? `${battery.temperature}°F` : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Cell Balance */}
        {hasHardware && cells.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-3">Cell Voltages</h3>
            <div className="grid grid-cols-4 gap-3">
              {cells.map((cell) => (
                <div key={cell.id} className="bg-slate-700 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Cell {cell.id}</div>
                  <div className="text-lg font-semibold">{cell.voltage}V</div>
                  <div className="text-xs text-slate-500">{cell.temp}°F</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Power Budget */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold">Daily Power Budget</h3>
        </div>

        {hasHardware ? (
          <>
            <div className="space-y-2">
              {loads.map((load) => (
                <div key={load.name} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                  <div>
                    <div className="font-medium">{load.name}</div>
                    <div className="text-sm text-slate-400">{load.watts}W × {load.hours}h</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{load.daily} Wh</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-600">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Total Daily Usage</div>
                <div className="text-xl font-bold text-amber-400">{totalDaily} Wh</div>
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Available: {(usableCapacity * 12.6).toFixed(0)} Wh @ 80% DOD
              </div>
              <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (totalDaily / (usableCapacity * 12.6)) * 100)}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Connect battery monitor to see power budget</p>
            <p className="text-sm mt-1">Track your daily energy consumption</p>
          </div>
        )}
      </div>

      {/* Low Battery Warning */}
      {hasHardware && battery.percentage < 20 && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <div className="font-semibold text-red-400">Low Battery Warning</div>
              <div className="text-sm text-red-200 mt-1">
                Battery below 20%. Consider starting generator or reducing loads.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
