'use client';

import { useState, useEffect } from 'react';
import { Sun, Activity, Battery, Cloud, Zap, MessageSquare, Settings, Clock, AlertCircle } from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import dynamic from 'next/dynamic';

// Lazy-load tabs to avoid SSR issues with recharts
const OverviewTab = dynamic(() => import('./OverviewTab'), { ssr: false });
const TelemetryTab = dynamic(() => import('./TelemetryTab'), { ssr: false });
const BatteryTab = dynamic(() => import('./BatteryTab'), { ssr: false });
const WeatherTab = dynamic(() => import('./WeatherTab'), { ssr: false });
const AITab = dynamic(() => import('./AITab'), { ssr: false });
const ControlsTab = dynamic(() => import('./ControlsTab'), { ssr: false });

type TabId = 'overview' | 'telemetry' | 'battery' | 'weather' | 'ai' | 'controls';

const TABS: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: Sun },
  { id: 'telemetry', label: 'Telemetry', icon: Activity },
  { id: 'battery', label: 'Battery', icon: Battery },
  { id: 'weather', label: 'Weather', icon: Cloud },
  { id: 'ai', label: 'AI Setup', icon: MessageSquare },
  { id: 'controls', label: 'Settings', icon: Settings },
];

export default function AccuSolarApp() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [time, setTime] = useState<string>('');
  const { data, isConnected } = useSolar();

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, []);

  const hasAlert = data.batterySoc < 20 || data.controllerTemp > 50 || data.overheatWarning;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white leading-tight">Accu Solar</div>
              <div className="text-xs text-slate-500 leading-tight hidden sm:block">Home Energy Monitor</div>
            </div>
          </div>

          {/* Live KPI strip — hidden on very small screens */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Solar</span>
              <span className="font-semibold text-amber-400 tabular-nums">{(data.solarPowerW / 1000).toFixed(2)} kW</span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Batt</span>
              <span className={`font-semibold tabular-nums ${data.batterySoc < 20 ? 'text-rose-400' : data.batterySoc < 40 ? 'text-amber-400' : 'text-blue-400'}`}>
                {Math.round(data.batterySoc)}%
              </span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">Load</span>
              <span className="font-semibold text-purple-400 tabular-nums">{(data.loadPowerW / 1000).toFixed(2)} kW</span>
            </div>
          </div>

          {/* Status + time */}
          <div className="flex items-center gap-3 shrink-0">
            {hasAlert && (
              <div className="alertBadge flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span className="hidden sm:inline">Alert</span>
              </div>
            )}
            <div className={`statusBadge flex items-center gap-1 ${!isConnected ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : ''}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="hidden sm:inline">{isConnected ? 'Live' : 'Demo'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span suppressHydrationWarning>{time}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-slate-900/80 border-b border-slate-800 sticky top-[57px] z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${active
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}>
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'telemetry' && <TelemetryTab />}
        {activeTab === 'battery' && <BatteryTab />}
        {activeTab === 'weather' && <WeatherTab />}
        {activeTab === 'ai' && <AITab />}
        {activeTab === 'controls' && <ControlsTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-3 text-center text-xs text-slate-600">
        Accu Solar — Home Energy Monitor · AmpinVT 150/80 · 8× 300W · 8× 280Ah 12V
      </footer>
    </div>
  );
}
