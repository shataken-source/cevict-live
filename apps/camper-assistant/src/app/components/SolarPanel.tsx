'use client';

import { useState } from 'react';
import { Sun, Info, ArrowUp } from 'lucide-react';

export default function SolarPanel() {
  const [tiltAngle, setTiltAngle] = useState(42);
  const [panelWatts, setPanelWatts] = useState(300);
  const [hasHardware, setHasHardware] = useState(false);

  // Calculate optimal tilt based on latitude (simplified)
  const latitude = 35; // Would be from GPS
  const optimalTilt = latitude; // Rough estimate

  // Current production - would come from charge controller API/BLE
  const currentProduction = hasHardware ? 245 : null;
  const todayProduction = hasHardware ? 1.2 : null;
  const peakToday = hasHardware ? 312 : null;
  const voltage = hasHardware ? 18.5 : null;
  const current = hasHardware ? 13.2 : null;
  const efficiency = hasHardware ? 21 : null;

  return (
    <div className="space-y-6">
      {/* Demo Mode Toggle - shown when hardware is simulated */}
      {hasHardware && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <div className="font-medium text-amber-400">Demo Mode Active</div>
                <div className="text-sm text-slate-400">Simulated solar data is being displayed</div>
              </div>
            </div>
            <button
              onClick={() => setHasHardware(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
            >
              Turn Off Demo
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Sun className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-semibold">Solar Panel Monitor</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Production */}
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Current Production</div>
            {hasHardware ? (
              <>
                <div className="text-4xl font-bold text-amber-400">{currentProduction}W</div>
                <div className="text-sm text-emerald-400 mt-2">82% of max capacity</div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-slate-500">--</div>
                <div className="text-sm text-slate-400 mt-2">Connect charge controller via Bluetooth</div>
                <button
                  onClick={() => setHasHardware(true)}
                  className="mt-3 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
                >
                  Simulate Connection
                </button>
              </div>
            )}
          </div>

          {/* Daily Total */}
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Today's Production</div>
            {hasHardware ? (
              <>
                <div className="text-4xl font-bold text-emerald-400">{todayProduction} kWh</div>
                <div className="text-sm text-slate-400 mt-2">Peak: {peakToday}W at 12:30 PM</div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-slate-500">--</div>
                <div className="text-sm text-slate-400 mt-2">No data available</div>
              </div>
            )}
          </div>
        </div>

        {/* Tilt Angle Calculator */}
        <div className="mt-6 bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUp className="w-5 h-5 text-blue-400" />
            <h3 className="font-medium">Tilt Angle Optimizer</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400">Current Tilt</label>
              <input
                type="number"
                value={tiltAngle}
                onChange={(e) => setTiltAngle(Number(e.target.value))}
                className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">Your Latitude</label>
              <div className="mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-300">
                {latitude}°
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400">Optimal Tilt</label>
              <div className="mt-1 bg-emerald-900 border border-emerald-700 rounded px-3 py-2 text-emerald-400 font-medium">
                {optimalTilt}°
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-200">
                <strong>Tip:</strong> Adjust tilt seasonally: +15° in winter, -15° in summer for optimal sun angle.
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400">Panel Rating</div>
            <div className="text-lg font-semibold">{panelWatts}W</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400">Voltage</div>
            <div className={`text-lg font-semibold ${voltage ? 'text-emerald-400' : 'text-slate-500'}`}>
              {voltage ? `${voltage}V` : '--'}
            </div>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400">Current</div>
            <div className={`text-lg font-semibold ${current ? 'text-amber-400' : 'text-slate-500'}`}>
              {current ? `${current}A` : '--'}
            </div>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400">Efficiency</div>
            <div className={`text-lg font-semibold ${efficiency ? 'text-blue-400' : 'text-slate-500'}`}>
              {efficiency ? `${efficiency}%` : '--'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
