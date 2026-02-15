'use client';

import { useState } from 'react';
import { Sun, Info, ArrowUp } from 'lucide-react';

export default function SolarPanel() {
  const [tiltAngle, setTiltAngle] = useState(42);
  const [panelWatts, setPanelWatts] = useState(300);

  // Calculate optimal tilt based on latitude (simplified)
  const latitude = 35; // Would be from GPS
  const optimalTilt = latitude; // Rough estimate

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Sun className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-semibold">Solar Panel Monitor</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Production */}
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Current Production</div>
            <div className="text-4xl font-bold text-amber-400">245W</div>
            <div className="text-sm text-emerald-400 mt-2">82% of max capacity</div>
          </div>

          {/* Daily Total */}
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Today's Production</div>
            <div className="text-4xl font-bold text-emerald-400">1.2 kWh</div>
            <div className="text-sm text-slate-400 mt-2">Peak: 312W at 12:30 PM</div>
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
            <div className="text-lg font-semibold text-emerald-400">18.5V</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400">Current</div>
            <div className="text-lg font-semibold text-amber-400">13.2A</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400">Efficiency</div>
            <div className="text-lg font-semibold text-blue-400">21%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
