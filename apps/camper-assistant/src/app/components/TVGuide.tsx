'use client';

import { useState, useMemo } from 'react';
import { Tv, Radio, Wifi, AlertCircle, Compass, Navigation } from 'lucide-react';

// Antenna direction database for common camping areas
const ANTENNA_DIRECTIONS: Record<string, { direction: string; degrees: number; tips: string[]; towers: string }> = {
  '25965': { // Summersville, WV
    direction: 'Northwest',
    degrees: 315,
    towers: 'Oak Hill/Clarksburg area',
    tips: [
      'Point antenna NW toward Oak Hill (310°–320°)',
      'Elevation is critical - place antenna high',
      'Avoid hills/trees blocking NW path',
      'Use window facing NW for indoor antennas'
    ]
  },
  '82190': { // Yellowstone area
    direction: 'South/Southeast',
    degrees: 160,
    towers: 'Cody, WY and Billings, MT',
    tips: [
      'Point antenna SE toward Cody (150°–170°)',
      'Mount high - mountainous terrain blocks signals',
      'Avoid lodgepole pines in direct path',
      'Consider amplified antenna for distance'
    ]
  },
  '90210': { // LA area (example)
    direction: 'North',
    degrees: 0,
    towers: 'Mt. Wilson transmitters',
    tips: [
      'Point antenna North toward Mt. Wilson',
      'Line of sight to north hills important',
      'Indoor antennas work well in valleys',
      'Rescan after repositioning'
    ]
  }
};

// Default direction calculation based on zip code region
function getAntennaDirection(zipCode: string) {
  // Check exact match first
  if (ANTENNA_DIRECTIONS[zipCode]) {
    return ANTENNA_DIRECTIONS[zipCode];
  }

  // Regional approximations based on zip code ranges
  const zip = parseInt(zipCode.substring(0, 3));

  if (zip >= 200 && zip <= 299) { // DC/Mid-Atlantic
    return {
      direction: 'West/Northwest',
      degrees: 290,
      towers: 'Local broadcast towers',
      tips: [
        'Point antenna W/NW toward local towers',
        'Elevation helps in hilly areas',
        'Check AntennaWeb.org for precise bearing',
        'Rescan channels after positioning'
      ]
    };
  }
  if (zip >= 100 && zip <= 199) { // NY/Northeast
    return {
      direction: 'Southwest',
      degrees: 225,
      towers: 'Empire State Building area',
      tips: [
        'Point SW toward major transmitters',
        'NYC towers are southwest of most areas',
        'Use compass app for precise aiming',
        'Amplified antenna may help in valleys'
      ]
    };
  }
  if (zip >= 300 && zip <= 399) { // Southeast
    return {
      direction: 'North',
      degrees: 0,
      towers: 'Regional broadcast towers',
      tips: [
        'Point antenna North generally',
        'Flat terrain favors reception',
        'Mount above roof line if possible',
        'Check FCC DTV Maps for exact bearing'
      ]
    };
  }
  if (zip >= 800 && zip <= 899) { // Mountain West
    return {
      direction: 'East/Southeast',
      degrees: 120,
      towers: 'Denver/front range area',
      tips: [
        'Point E/SE toward major cities',
        'Critical: mount antenna very high',
        'Mountains block signals - line of sight key',
        'Amplified antenna strongly recommended'
      ]
    };
  }
  if (zip >= 900 && zip <= 999) { // West Coast
    return {
      direction: 'East',
      degrees: 90,
      towers: 'Regional broadcast towers',
      tips: [
        'Point antenna East toward transmitters',
        'Coastal areas: avoid salt corrosion',
        'Hills/mountains may require positioning',
        'Use AntennaWeb.org for precise direction'
      ]
    };
  }

  // Default fallback
  return {
    direction: 'Check Online',
    degrees: 0,
    towers: 'Unknown - use lookup tool',
    tips: [
      'Visit AntennaWeb.org and enter your exact address',
      'Use FCC DTV Reception Maps for precise bearing',
      'Point antenna toward nearest city/broadcast towers',
      'Rescan channels after each adjustment'
    ]
  };
}

// Compass SVG component
function CompassRose({ degrees }: { degrees: number }) {
  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* Compass circle */}
      <div className="absolute inset-0 rounded-full border-2 border-slate-500 bg-slate-800/50">
        {/* Cardinal directions */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-bold text-red-400">N</div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400">S</div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">W</div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">E</div>
      </div>

      {/* Rotating needle pointing to direction */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-500"
        style={{ transform: `rotate(${degrees}deg)` }}
      >
        <div className="relative w-1 h-24">
          {/* North/Point end (red) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[20px] border-l-transparent border-r-transparent border-b-red-500"></div>
          {/* South end (white) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[20px] border-l-transparent border-r-transparent border-t-slate-300"></div>
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-400 rounded-full border-2 border-slate-600"></div>
        </div>
      </div>
    </div>
  );
}

export default function TVGuide() {
  const [zipCode, setZipCode] = useState('82190'); // Yellowstone area
  const [showDigital, setShowDigital] = useState(true);

  const antennaInfo = useMemo(() => getAntennaDirection(zipCode), [zipCode]);

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

      {/* Location Input & Antenna Direction */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap gap-4 items-start">
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
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={showDigital}
              onChange={(e) => setShowDigital(e.target.checked)}
              className="w-4 h-4"
            />
            <label>Show Digital Channels</label>
          </div>
        </div>

        {/* Antenna Direction Card */}
        <div className="mt-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-blue-300">Antenna Direction</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Compass */}
            <div className="flex flex-col items-center justify-center">
              <CompassRose degrees={antennaInfo.degrees} />
              <div className="mt-2 text-center">
                <div className="text-2xl font-bold text-white">{antennaInfo.direction}</div>
                <div className="text-sm text-slate-400">{antennaInfo.degrees}°</div>
              </div>
            </div>

            {/* Tips */}
            <div>
              <div className="text-sm text-blue-300 mb-2 font-medium">
                Target: {antennaInfo.towers}
              </div>
              <ul className="space-y-1.5">
                {antennaInfo.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                    <Navigation className="w-3 h-3 mt-1 text-blue-400 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-xs text-slate-500">
                💡 Use a compass app or visit{' '}
                <a
                  href={`https://www.antennaweb.org`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  AntennaWeb.org
                </a>
                {' '}for precise bearing
              </div>
            </div>
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
                <span className={`text-xs px-2 py-0.5 rounded ${station.type === 'WX' ? 'bg-red-900 text-red-400' : 'bg-slate-600'
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
