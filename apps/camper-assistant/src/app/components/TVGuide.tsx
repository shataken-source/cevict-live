'use client';

import { useState, useMemo, useEffect } from 'react';
import { Tv, Radio, Wifi, AlertCircle, Compass, Navigation, Loader2, X, Maximize2 } from 'lucide-react';

// Channel type from API
interface Channel {
  number: string;
  name: string;
  affiliate?: string;
  type: string;
  signal: string;
  show: string;
  logo?: string | null;
}

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

// Transmitter Radar Map - Shows colorful tower locations
function TransmitterMap({ degrees, onCenterClick, size = 'normal' }: { degrees: number; onCenterClick?: () => void; size?: 'normal' | 'large' }) {
  // Simulated transmitter data with channel numbers matching the list below
  const transmitters = [
    { name: 'CBS', channel: '2.1', angle: degrees + 5, distance: 38, color: '#3b82f6', strength: 'good' },
    { name: 'NBC', channel: '4.1', angle: degrees - 25, distance: 52, color: '#f97316', strength: 'fair' },
    { name: 'ABC', channel: '5.1', angle: degrees - 15, distance: 45, color: '#ef4444', strength: 'good' },
    { name: 'PBS', channel: '7.1', angle: degrees - 5, distance: 35, color: '#a855f7', strength: 'excellent' },
    { name: 'FOX', channel: '11.1', angle: degrees + 12, distance: 41, color: '#eab308', strength: 'fair' },
    { name: 'MeTV', channel: '14.1', angle: degrees + 20, distance: 48, color: '#06b6d4', strength: 'good' },
    { name: 'Weather', channel: '20.1', angle: degrees - 30, distance: 33, color: '#10b981', strength: 'excellent' },
    { name: 'Movies', channel: '25.1', angle: degrees + 25, distance: 55, color: '#f59e0b', strength: 'fair' },
  ];

  const isLarge = size === 'large';
  const containerClass = isLarge ? 'w-80 h-80' : 'w-40 h-40';
  const centerDotSize = isLarge ? 'w-6 h-6' : 'w-4 h-4';
  const pulseSize = isLarge ? 'w-12 h-12' : 'w-8 h-8';
  const fontSize = isLarge ? 'text-sm' : 'text-[8px]';
  const labelOffset = isLarge ? 20 : 14;

  return (
    <div className={`relative ${containerClass} mx-auto`}>
      {/* Radar background circles */}
      <div className="absolute inset-0 rounded-full border-2 border-slate-600/30 bg-slate-800/30" />
      <div className="absolute inset-4 rounded-full border border-slate-600/20" />
      <div className="absolute inset-8 rounded-full border border-slate-600/10" />

      {/* Crosshairs */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-px bg-slate-600/20" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-px h-full bg-slate-600/20" />
      </div>

      {/* You are here - center - NOW CLICKABLE */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${centerDotSize} bg-emerald-500 rounded-full border-2 border-emerald-300 shadow-lg shadow-emerald-500/50 z-20 cursor-pointer hover:scale-110 transition-transform`}
        onClick={onCenterClick}
        title="Click to enlarge"
      />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${pulseSize} bg-emerald-500/20 rounded-full animate-pulse`} />
      <div className={`absolute top-[60%] left-1/2 -translate-x-1/2 ${fontSize} text-emerald-400 font-bold`}>YOU</div>

      {/* Transmitters as colorful dots */}
      {transmitters.map((tower, i) => {
        const rad = ((tower.angle - 90) * Math.PI) / 180;
        const x = 50 + (tower.distance / 60) * 35 * Math.cos(rad);
        const y = 50 + (tower.distance / 60) * 35 * Math.sin(rad);

        return (
          <div key={i}>
            {/* Tower dot */}
            <div
              className="absolute w-3 h-3 rounded-full border border-white/50 shadow-lg transition-all hover:scale-125 cursor-pointer"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: tower.color,
                boxShadow: `0 0 8px ${tower.color}`,
              }}
              title={`${tower.name} - ${tower.distance} mi - ${tower.strength}`}
            />
            {/* Tower label with channel number */}
            <div
              className="absolute text-[7px] font-bold text-white bg-slate-900/90 px-1 rounded border border-white/20"
              style={{
                left: `${x}%`,
                top: `${y - labelOffset}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {tower.channel}
            </div>
            {/* Network name below */}
            <div
              className="absolute text-[6px] text-white/70"
              style={{
                left: `${x}%`,
                top: `${y + 10}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {tower.name}
            </div>
            {/* Signal ring */}
            <div
              className="absolute w-6 h-6 rounded-full border opacity-30"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                borderColor: tower.color,
              }}
            />
          </div>
        );
      })}

      {/* Range rings legend */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
        <span className="text-[7px] text-slate-400">25mi</span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
        <span className="text-[7px] text-slate-400">50mi</span>
      </div>
    </div>
  );
}
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
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState<'real' | 'mock'>('mock');

  const antennaInfo = useMemo(() => getAntennaDirection(zipCode), [zipCode]);

  // State for enlarged map modal
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Fetch TV guide data when ZIP changes
  useEffect(() => {
    fetchChannels(zipCode);
  }, [zipCode]);

  const fetchChannels = async (zip: string) => {
    if (!zip || zip.length < 5) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/tv-guide?zip=${zip}`);
      const data = await response.json();

      if (data.channels) {
        setChannels(data.channels);
        setDataSource(data.source === 'schedules-direct' ? 'real' : 'mock');
        if (data.message) {
          console.log('TV Guide:', data.message);
        }
      } else {
        setError('No channels found for this area');
      }
    } catch (err) {
      setError('Failed to load TV guide data');
      console.error('TV Guide fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZip = e.target.value.slice(0, 5);
    setZipCode(newZip);
    if (newZip.length === 5) {
      fetchChannels(newZip);
    }
  };

  const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
  const [wildfires, setWildfires] = useState<WildfireData[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  interface RadioStation {
    id: string;
    name: string;
    genre: string;
    location: string;
    url: string;
    logo: string | null;
    bitrate: number;
    codec?: string;
    isPopular: boolean;
  }

  interface WildfireData {
    id: string;
    lat: number;
    lon: number;
    distance: number;
    direction: string;
    intensity: string;
    threat: string;
    confidence: string;
    detected: string;
  }

  interface WeatherAlert {
    id: string;
    title: string;
    headline: string;
    description: string;
    severity: string;
    isFireRelated: boolean;
    category: string;
    area: string;
    expires: string;
  }

  // Fetch radio stations, wildfires, and alerts when ZIP changes
  useEffect(() => {
    fetchChannels(zipCode);
    fetchRadioStations(zipCode);
    fetchWildfireAndAlerts(zipCode);
  }, [zipCode]);

  const fetchRadioStations = async (zip: string) => {
    if (!zip || zip.length < 5) return;

    try {
      const response = await fetch(`/api/radio?zip=${zip}`);
      const data = await response.json();

      if (data.stations) {
        setRadioStations(data.stations);
      }
    } catch (err) {
      console.error('Radio fetch error:', err);
    }
  };

  const fetchWildfireAndAlerts = async (zip: string) => {
    if (!zip || zip.length < 5) return;

    setAlertsLoading(true);

    try {
      // Get coordinates from ZIP (simplified - would use geocoding in production)
      const coords = getZipCoords(zip);

      // Fetch wildfire data
      const [fireResponse, alertsResponse] = await Promise.all([
        fetch(`/api/wildfire?lat=${coords.lat}&lon=${coords.lon}&radius=100`),
        fetch(`/api/weather-alerts?lat=${coords.lat}&lon=${coords.lon}`)
      ]);

      if (fireResponse.ok) {
        const fireData = await fireResponse.json();
        setWildfires(fireData.fires || []);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setWeatherAlerts(alertsData.alerts || []);
      }
    } catch (err) {
      console.error('Wildfire/Alerts fetch error:', err);
    } finally {
      setAlertsLoading(false);
    }
  };

  const getZipState = (zip: string): string | null => {
    if (!zip || zip.length < 3) return null;
    const prefix = parseInt(zip.substring(0, 3));

    // ZIP to state mapping
    if (prefix >= 350 && prefix <= 369) return 'Alabama';
    if (prefix >= 995 && prefix <= 999) return 'Alaska';
    if (prefix >= 850 && prefix <= 865) return 'Arizona';
    if (prefix >= 716 && prefix <= 729) return 'Arkansas';
    if (prefix >= 900 && prefix <= 961) return 'California';
    if (prefix >= 800 && prefix <= 816) return 'Colorado';
    if (prefix >= 600 && prefix <= 629) return 'Illinois';
    if (prefix >= 460 && prefix <= 479) return 'Indiana';
    if (prefix >= 500 && prefix <= 528) return 'Iowa';
    if (prefix >= 660 && prefix <= 679) return 'Kansas';
    if (prefix >= 400 && prefix <= 427) return 'Kentucky';
    if (prefix >= 700 && prefix <= 715) return 'Louisiana';
    if (prefix >= 390 && prefix <= 399) return 'Mississippi';
    if (prefix >= 630 && prefix <= 658) return 'Missouri';
    if (prefix >= 590 && prefix <= 599) return 'Montana';
    if (prefix >= 680 && prefix <= 693) return 'Nebraska';
    if (prefix >= 889 && prefix <= 898) return 'Nevada';
    if (prefix >= 100 && prefix <= 149) return 'New York';
    if (prefix >= 150 && prefix <= 196) return 'Pennsylvania';
    if (prefix >= 300 && prefix <= 319) return 'Georgia';
    if (prefix >= 320 && prefix <= 349) return 'Florida';
    if (prefix >= 820 && prefix <= 831) return 'Wyoming';
    if (prefix >= 247 && prefix <= 268) return 'West Virginia';
    if (prefix >= 377 && prefix <= 379) return 'Tennessee';

    return null;
  };

  const getZipCoords = (zip: string): { lat: string; lon: string } => {
    // Simplified ZIP to coord mapping for common camping areas
    const zipPrefix = parseInt(zip.substring(0, 3));

    const coordMap: Record<number, { lat: string; lon: string }> = {
      821: { lat: '44.5', lon: '-110.0' }, // Yellowstone
      259: { lat: '38.5', lon: '-80.5' }, // WV
      902: { lat: '34.0', lon: '-118.2' }, // LA
      377: { lat: '35.7', lon: '-83.5' }, // Smokies
    };

    return coordMap[zipPrefix] || { lat: '39.8', lon: '-98.5' }; // US center default
  };

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
              onChange={handleZipChange}
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
              id="showDigital"
            />
            <label htmlFor="showDigital">Show Digital Channels</label>
          </div>
          {loading && (
            <div className="flex items-center gap-2 mt-6 text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>

        {/* Antenna Direction Card */}
        <div className="mt-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-blue-300">Antenna Direction</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Compass */}
            <div className="flex flex-col items-center justify-center px-2">
              <CompassRose degrees={antennaInfo.degrees} />
              <div className="mt-2 text-center">
                <div className="text-xl font-bold text-white">{antennaInfo.direction}</div>
                <div className="text-sm text-slate-400">{antennaInfo.degrees}°</div>
              </div>
            </div>

            {/* Transmitter Radar Map */}
            <div className="flex flex-col items-center justify-center px-2">
              <TransmitterMap
                degrees={antennaInfo.degrees}
                onCenterClick={() => setIsMapModalOpen(true)}
              />
              <div className="mt-2 text-center">
                <div className="text-sm text-slate-400">Nearby Transmitters</div>
                <div className="text-xs text-slate-500 flex items-center gap-1 justify-center">
                  <Maximize2 className="w-3 h-3" />
                  Click center to enlarge
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="px-2">
              <div className="text-sm text-blue-300 mb-2 font-medium">
                Target: {antennaInfo.towers}
              </div>
              <ul className="space-y-1">
                {antennaInfo.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                    <Navigation className="w-3 h-3 mt-1 text-blue-400 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-xs text-slate-500">
                💡{' '}
                <a
                  href={`https://www.antennaweb.org`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  AntennaWeb.org
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TV Channels */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Over-the-Air TV Channels</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${dataSource === 'real' ? 'bg-emerald-900 text-emerald-400' : 'bg-amber-900 text-amber-400'}`}>
              {dataSource === 'real' ? 'Live Data' : 'Sample Data'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-lg p-3">
            <div className="text-sm text-red-200">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {channels.filter(c => showDigital || c.type === 'network').map((channel) => (
            <div key={channel.number} className="bg-slate-700 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-slate-800 rounded px-2 py-1 text-sm font-mono">
                  {channel.number}
                </div>
                <div>
                  <div className="font-medium">{channel.affiliate || channel.name}</div>
                  <div className="text-xs text-slate-400">{channel.show}</div>
                </div>
              </div>
              <div className={`text-xs ${signalColor(channel.signal)}`}>
                {channel.signal}
              </div>
            </div>
          ))}
        </div>

        {channels.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-500">
            No channels available. Enter a ZIP code to see local channels.
          </div>
        )}

        <div className="mt-4 bg-amber-900/30 border border-amber-700/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-200">
              Reception varies by terrain. An outdoor antenna improves signal strength in remote areas.
            </div>
          </div>
        </div>
      </div>

      {/* Radio Stations - Real Data */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold">Local Radio Stations</h3>
          </div>
          <div className="flex items-center gap-2">
            {radioStations.length > 0 && (
              <span className="text-xs px-2 py-1 rounded bg-emerald-900 text-emerald-400">
                {getZipState(zipCode) || 'National'}
              </span>
            )}
            <span className="text-xs text-slate-400">via Radio Browser</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {radioStations.map((station) => (
            <div key={station.id} className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <div className="text-lg font-bold text-emerald-400">📻</div>
                <span className={`text-xs px-2 py-0.5 rounded ${station.isPopular ? 'bg-emerald-900 text-emerald-400' : 'bg-slate-600'
                  }`}>
                  {station.genre}
                </span>
              </div>
              <div className="font-medium truncate">{station.name}</div>
              <div className="text-xs text-slate-400">{station.location}</div>
              {station.bitrate > 0 && (
                <div className="text-xs text-slate-500 mt-1">{station.bitrate}kbps {station.codec}</div>
              )}
            </div>
          ))}
        </div>

        {radioStations.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            Enter ZIP code to find local radio stations
          </div>
        )}
      </div>

      {/* Wildfire Monitor */}
      <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-orange-500 animate-pulse" />
            <h3 className="font-semibold text-sm sm:text-base">Active Wildfire Monitor</h3>
          </div>
          <span className="text-xs text-slate-400">via NASA FIRMS</span>
        </div>

        {alertsLoading ? (
          <div className="flex items-center justify-center py-6 sm:py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          </div>
        ) : wildfires.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              {wildfires.slice(0, 6).map((fire) => (
                <div key={fire.id} className={`rounded-lg p-2 sm:p-3 border ${fire.threat === 'critical' ? 'bg-red-900/50 border-red-600' :
                  fire.threat === 'high' ? 'bg-orange-900/50 border-orange-600' :
                    fire.threat === 'moderate' ? 'bg-amber-900/50 border-amber-600' :
                      'bg-slate-700 border-slate-600'
                  }`}>
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <span className={`text-xs font-bold uppercase ${fire.threat === 'critical' ? 'text-red-400' :
                      fire.threat === 'high' ? 'text-orange-400' :
                        fire.threat === 'moderate' ? 'text-amber-400' :
                          'text-slate-400'
                      }`}>
                      {fire.threat.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">{fire.direction} {fire.distance}km</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-200">
                    Intensity: {fire.intensity} • Confidence: {fire.confidence}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Detected: {fire.detected}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 sm:mt-4 bg-orange-900/30 border border-orange-700/50 rounded-lg p-2 sm:p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-orange-200">
                  {wildfires.filter(f => f.threat === 'critical' || f.threat === 'high').length} active fires within 100km.
                  Stay informed and be prepared to evacuate if conditions worsen.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 text-slate-500 text-sm">
            No active fires detected in your area. Stay safe!
          </div>
        )}
      </div>

      {/* Weather Alerts - Fire Weather */}
      <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-red-400" />
            <h3 className="font-semibold text-sm sm:text-base">Weather Alerts</h3>
          </div>
          <span className="text-xs text-slate-400">via NWS</span>
        </div>

        {weatherAlerts.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {weatherAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className={`rounded-lg p-2 sm:p-3 border ${alert.isFireRelated ? 'bg-red-900/30 border-red-700' :
                alert.severity === 'critical' ? 'bg-red-900/20 border-red-600' :
                  alert.severity === 'severe' ? 'bg-orange-900/20 border-orange-600' :
                    'bg-slate-700 border-slate-600'
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2 text-sm">
                      {alert.isFireRelated && <span className="text-red-400">🔥</span>}
                      <span className="truncate">{alert.title}</span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-400 mt-1">{alert.headline}</div>
                    <div className="text-xs text-slate-500 mt-2">{alert.area}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded shrink-0 ${alert.severity === 'critical' ? 'bg-red-900 text-red-400' :
                    alert.severity === 'severe' ? 'bg-orange-900 text-orange-400' :
                      'bg-slate-600'
                    }`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 text-slate-500 text-sm">
            No active weather alerts for your area.
          </div>
        )}

        <div className="mt-3 sm:mt-4 bg-red-900/30 border border-red-700/50 rounded-lg p-2 sm:p-3">
          <div className="flex items-start gap-2">
            <Wifi className="w-4 h-4 text-red-400 mt-0.5" />
            <div className="text-xs sm:text-sm text-red-200">
              NOAA Weather Radio provides continuous weather updates and emergency alerts.
              Essential for camping safety.
            </div>
          </div>
        </div>
      </div>

      {/* Enlarged Map Modal */}
      {isMapModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsMapModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Compass className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Transmitter Radar Map</h3>
              </div>
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Large Map */}
            <div className="flex flex-col items-center">
              <TransmitterMap
                degrees={antennaInfo.degrees}
                size="large"
              />

              {/* Legend */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  { name: 'CBS', color: '#3b82f6', ch: '2.1' },
                  { name: 'NBC', color: '#f97316', ch: '4.1' },
                  { name: 'ABC', color: '#ef4444', ch: '5.1' },
                  { name: 'PBS', color: '#a855f7', ch: '7.1' },
                  { name: 'FOX', color: '#eab308', ch: '11.1' },
                  { name: 'MeTV', color: '#06b6d4', ch: '14.1' },
                  { name: 'Weather', color: '#10b981', ch: '20.1' },
                  { name: 'Movies', color: '#f59e0b', ch: '25.1' },
                ].map((station) => (
                  <div key={station.ch} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: station.color, boxShadow: `0 0 6px ${station.color}` }}
                    />
                    <span className="text-slate-300">{station.name} {station.ch}</span>
                  </div>
                ))}
              </div>

              {/* Info */}
              <div className="mt-4 text-center text-sm text-slate-400">
                <p>Direction: <span className="text-blue-400 font-semibold">{antennaInfo.direction}</span> ({antennaInfo.degrees}°)</p>
                <p className="mt-1">Target: {antennaInfo.towers}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
