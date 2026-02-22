'use client';

import { useState } from 'react';
import { Settings, Bluetooth, Wifi, Usb, Radio, Save, Info, Database, Key } from 'lucide-react';
import { useSolar, SYSTEM_CONFIG, AMPINVT_TOPICS } from '../context/SolarContext';

export default function ControlsTab() {
  const { dataSource, setDataSource, isConnected } = useSolar();
  const [mqttBroker, setMqttBroker] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('accusolar_mqtt') || '' : ''
  );
  const [mqttPort, setMqttPort] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('accusolar_mqtt_port') || '1883' : '1883'
  );
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem('accusolar_mqtt', mqttBroker);
    localStorage.setItem('accusolar_mqtt_port', mqttPort);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Data Source */}
      <div className="panel">
        <div className="panelTitleRow">
          <Radio className="w-4 h-4 text-emerald-400" />
          <span className="panelTitle">Data Source</span>
          <span className={`ml-auto ${isConnected ? 'statusBadge' : 'alertBadge'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { id: 'demo', label: 'Demo Mode', icon: Radio, desc: 'Simulated data — no hardware needed', color: 'text-slate-400' },
            { id: 'ampinvt', label: 'AmpinVT MQTT', icon: Wifi, desc: 'ESPHome MQTT integration', color: 'text-emerald-400' },
            { id: 'victron', label: 'Victron VRM', icon: Bluetooth, desc: 'Victron Energy VRM API', color: 'text-blue-400' },
            { id: 'manual', label: 'Manual Entry', icon: Usb, desc: 'Enter readings manually', color: 'text-purple-400' },
          ] as const).map(src => (
            <button key={src.id} onClick={() => setDataSource(src.id)}
              className={`kpiTile text-left border-2 transition-colors ${dataSource === src.id ? 'border-emerald-500/60 bg-emerald-900/20' : 'border-transparent hover:border-slate-600'}`}>
              <src.icon className={`w-5 h-5 ${src.color} mb-2`} />
              <div className="text-sm font-semibold text-slate-200">{src.label}</div>
              <div className="text-xs text-slate-500 mt-1">{src.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* MQTT Config (shown when ampinvt selected) */}
      {dataSource === 'ampinvt' && (
        <div className="panel">
          <div className="panelTitleRow">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="panelTitle">AmpinVT MQTT Configuration</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">MQTT Broker IP / Hostname</label>
              <input type="text" value={mqttBroker} onChange={e => setMqttBroker(e.target.value)}
                placeholder="192.168.1.100 or homeassistant.local"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Port</label>
              <input type="text" value={mqttPort} onChange={e => setMqttPort(e.target.value)}
                placeholder="1883"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <button onClick={save}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>

          <div className="mt-4 bg-slate-900/50 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-semibold mb-2">MQTT Topics (ESPHome)</div>
            <div className="space-y-1 font-mono text-xs text-slate-500">
              {Object.entries(AMPINVT_TOPICS).map(([key, topic]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-emerald-600">→</span>
                  <span className="text-slate-400">{topic}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Supabase Config */}
      <div className="panel">
        <div className="panelTitleRow">
          <Database className="w-4 h-4 text-blue-400" />
          <span className="panelTitle">Supabase Data Logging</span>
          <span className="ml-auto text-xs text-slate-500">Optional — for historical data</span>
        </div>
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 text-sm text-blue-200 space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
            <div>
              <p className="font-medium text-blue-300">Each user needs their own free Supabase project.</p>
              <p className="text-blue-400 text-xs mt-1">Create one at <span className="underline">supabase.com</span> → copy your URL and anon key → add to <code className="bg-slate-800 px-1 rounded">.env.local</code></p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="kpiTile font-mono text-xs text-slate-400 space-y-1">
            <div className="text-slate-500 font-sans text-xs mb-2">Add to <code className="bg-slate-800 px-1 rounded">.env.local</code>:</div>
            <div><span className="text-emerald-400">NEXT_PUBLIC_SUPABASE_URL</span>=https://xxxx.supabase.co</div>
            <div><span className="text-emerald-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>=eyJhbGci...</div>
            <div><span className="text-amber-400">NEXT_PUBLIC_OPENAI_KEY</span>=sk-... <span className="text-slate-600"># optional, for AI chat</span></div>
          </div>
        </div>
      </div>

      {/* System Specs */}
      <div className="panel">
        <div className="panelTitleRow">
          <Settings className="w-4 h-4 text-slate-400" />
          <span className="panelTitle">Configured System</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Panels', value: `${SYSTEM_CONFIG.panelCount}× ${SYSTEM_CONFIG.panelWatts}W` },
            { label: 'Wiring', value: SYSTEM_CONFIG.panelWiring },
            { label: 'Peak Output', value: `${SYSTEM_CONFIG.peakWatts}W` },
            { label: 'Controller', value: SYSTEM_CONFIG.controller },
            { label: 'Batteries', value: `${SYSTEM_CONFIG.batteryCount}× ${SYSTEM_CONFIG.batteryAh}Ah` },
            { label: 'Bank Voltage', value: `${SYSTEM_CONFIG.batteryVoltage}V` },
            { label: 'Total Capacity', value: `${SYSTEM_CONFIG.totalKwh.toFixed(1)} kWh` },
            { label: 'Usable', value: `${SYSTEM_CONFIG.usableKwh.toFixed(1)} kWh` },
          ].map(s => (
            <div key={s.label} className="kpiTile">
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="text-sm font-semibold text-slate-200">{s.value}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3">
          To change system specs, edit <code className="bg-slate-800 px-1 rounded">app/context/SolarContext.tsx</code> → SYSTEM_CONFIG
        </p>
      </div>
    </div>
  );
}
