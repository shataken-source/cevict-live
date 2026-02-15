'use client';

import { useState } from 'react';
import { Tv, Radio, Wifi, AlertCircle } from 'lucide-react';

export default function TVGuide() {
  const [zipCode, setZipCode] = useState('82190'); // Yellowstone area
  const [showDigital, setShowDigital] = useState(true);

  // Simulated TV channels for remote camping areas
  const channels = [
    { number: '2.1', name: 'CBS', type: 'network', signal: 'good', show: 'Evening News 6:00 PM' },
    { number: '4.1', name: 'NBC', type: 'network', signal: 'fair', show: 'Nightly News 6:30 PM' },
    { number: '5.1', name: 'ABC', type: 'network', signal: 'good', show: 'World News 5:30 PM' },
    { number: '7.1', name: 'PBS', type: 'network', signal: 'excellent', show: 'Nature Documentary 7:00 PM' },
    { number: '11.1', name: 'FOX', type: 'network', signal: 'fair', show: 'Local News 9:00 PM' },
    { number: '14.1', name: 'MeTV', type: 'digital', signal: 'good', show: 'Classic Sitcoms' },
    { number: '20.1', name: 'Weather', type: 'digital', signal: 'excellent', show: '24/7 Weather Radar' },
    { number: '25.1', name: 'Movies!', type: 'digital', signal: 'fair', show: 'Classic Movies' },
  ];

  const radioStations = [
    { freq: '91.1', name: 'NPR', type: 'FM', genre: 'News/Talk' },
    { freq: '93.5', name: 'K-LOVE', type: 'FM', genre: 'Christian' },
    { freq: '96.7', name: 'Country FM', type: 'FM', genre: 'Country' },
    { freq: '100.3', name: 'Rock Radio', type: 'FM', genre: 'Rock' },
    { freq: '104.5', name: 'Classical', type: 'FM', genre: 'Classical' },
    { freq: '162.4', name: 'NOAA Weather', type: 'WX', genre: 'Weather Alerts' },
  ];

  const signalColor = (signal: string) => {
    switch (signal) {
      case 'excellent': return 'text-emerald-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <Tv className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-semibold">TV & Radio Guide</h2>
        </div>
        <p className="text-slate-400">Local channels and radio stations for your camping area.</p>
      </div>

      {/* Location Input */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-sm text-slate-400 block mb-1">ZIP Code / Location</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="Enter ZIP"
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-32"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showDigital}
              onChange={(e) => setShowDigital(e.target.checked)}
              className="w-4 h-4"
            />
            <label>Show Digital Channels</label>
          </div>
        </div>
      </div>

      {/* TV Channels */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Tv className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Over-the-Air TV Channels</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {channels.filter(c => showDigital || c.type === 'network').map((channel) => (
            <div key={channel.number} className="bg-slate-700 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-slate-800 rounded px-2 py-1 text-sm font-mono">
                  {channel.number}
                </div>
                <div>
                  <div className="font-medium">{channel.name}</div>
                  <div className="text-xs text-slate-400">{channel.show}</div>
                </div>
              </div>
              <div className={`text-xs ${signalColor(channel.signal)}`}>
                {channel.signal}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-amber-900/30 border border-amber-700/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-200">
              Reception varies by terrain. An outdoor antenna improves signal strength in remote areas.
            </div>
          </div>
        </div>
      </div>

      {/* Radio Stations */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold">Radio Stations</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {radioStations.map((station) => (
            <div key={station.freq} className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-lg font-bold font-mono">{station.freq}</div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  station.type === 'WX' ? 'bg-red-900 text-red-400' : 'bg-slate-600'
                }`}>
                  {station.type}
                </span>
              </div>
              <div className="font-medium">{station.name}</div>
              <div className="text-xs text-slate-400">{station.genre}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Info */}
      <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Wifi className="w-5 h-5 text-red-400" />
          <div>
            <div className="font-semibold text-red-400 mb-1">Emergency Broadcast</div>
            <div className="text-sm text-red-200">
              NOAA Weather Radio (162.4 MHz) provides continuous weather updates and emergency alerts. 
              Essential for camping safety.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
