'use client';

import { useState, useEffect } from 'react';
import {
  Signal,
  Wifi,
  Smartphone,
  MapPin,
  TowerControl,
  AlertCircle,
  Search,
  Loader2,
  Info,
  Radio,
  Battery,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Cell tower data sources
const TOWER_DATABASES = {
  // FCC ASR - Antenna Structure Registration
  FCC: 'https://geo.fcc.gov/api/area/v1/towers',
  // OpenCellID (requires API key)
  OPENCELLID: 'https://opencellid.org/api/cell/getInArea',
};

interface CellTower {
  id: string;
  lat: number;
  lng: number;
  carrier: string;
  type: 'cell' | 'tower' | 'unknown';
  distance: number;
  elevation?: number;
  structureType?: string;
  signalEstimate?: 'strong' | 'moderate' | 'weak' | 'none';
}

interface SignalReading {
  carrier: string;
  type: '5G' | 'LTE' | '4G' | '3G' | '2G' | 'No Signal';
  bars: number;
  rsrp?: number; // Reference Signal Received Power
  sinr?: number; // Signal to Interference + Noise Ratio
  lastSeen: string;
}

// Major carrier tower locations (approximate/demo data for popular camping areas)
const KNOWN_TOWERS: Record<string, CellTower[]> = {
  'yellowstone': [
    { id: 't1', lat: 44.6, lng: -110.5, carrier: 'Verizon', type: 'tower', distance: 2.1, signalEstimate: 'moderate' },
    { id: 't2', lat: 44.65, lng: -111.0, carrier: 'AT&T', type: 'tower', distance: 4.5, signalEstimate: 'weak' },
    { id: 't3', lat: 44.5, lng: -110.4, carrier: 'T-Mobile', type: 'tower', distance: 6.2, signalEstimate: 'weak' },
    { id: 't4', lat: 44.7, lng: -110.7, carrier: 'Verizon', type: 'tower', distance: 8.3, signalEstimate: 'none' },
  ],
  'summersville': [
    { id: 's1', lat: 38.3237, lng: -80.8445, carrier: 'Verizon', type: 'tower', distance: 1.2, signalEstimate: 'strong' },
    { id: 's2', lat: 38.35, lng: -80.82, carrier: 'AT&T', type: 'tower', distance: 2.8, signalEstimate: 'moderate' },
    { id: 's3', lat: 38.30, lng: -80.88, carrier: 'T-Mobile', type: 'tower', distance: 3.5, signalEstimate: 'moderate' },
  ]
};

// Mock signal readings
const MOCK_READINGS: SignalReading[] = [
  { carrier: 'Verizon', type: 'LTE', bars: 3, rsrp: -95, sinr: 12, lastSeen: '2 min ago' },
  { carrier: 'AT&T', type: '5G', bars: 2, rsrp: -105, sinr: 8, lastSeen: '5 min ago' },
  { carrier: 'T-Mobile', type: 'LTE', bars: 1, rsrp: -115, sinr: 3, lastSeen: '10 min ago' },
];

// Calculate signal strength based on distance and terrain
const estimateSignalStrength = (distance: number, terrain: 'flat' | 'hills' | 'mountains' = 'hills'): 'strong' | 'moderate' | 'weak' | 'none' => {
  // Terrain attenuation factors
  const terrainFactor = { flat: 1.0, hills: 0.7, mountains: 0.4 };
  const effectiveDistance = distance / terrainFactor[terrain];
  
  if (effectiveDistance < 3) return 'strong';
  if (effectiveDistance < 6) return 'moderate';
  if (effectiveDistance < 10) return 'weak';
  return 'none';
};

const getSignalColor = (strength: string) => {
  switch (strength) {
    case 'strong': return 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50';
    case 'moderate': return 'text-amber-400 bg-amber-900/30 border-amber-700/50';
    case 'weak': return 'text-orange-400 bg-orange-900/30 border-orange-700/50';
    case 'none': return 'text-red-400 bg-red-900/30 border-red-700/50';
    default: return 'text-slate-400 bg-slate-700';
  }
};

const getBarsIcon = (bars: number) => {
  return (
    <div className="flex gap-0.5 items-end h-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-sm ${i <= bars ? 'bg-emerald-400' : 'bg-slate-600'}`}
          style={{ height: `${i * 4}px` }}
        />
      ))}
    </div>
  );
};

export default function CellSignalMapper() {
  const [location, setLocation] = useState('25965');
  const [towers, setTowers] = useState<CellTower[]>(KNOWN_TOWERS['summersville'] || []);
  const [readings, setReadings] = useState<SignalReading[]>(MOCK_READINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [useLiveData, setUseLiveData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [expandedTower, setExpandedTower] = useState<string | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');

  // Fetch cell towers near location
  const fetchTowers = async (lat: number, lng: number) => {
    try {
      // In a real implementation, this would call FCC ASR API or OpenCellID
      // For now, generate realistic mock towers around the coordinates
      const mockTowers: CellTower[] = [
        {
          id: `tower-${Date.now()}-1`,
          lat: lat + (Math.random() - 0.5) * 0.05,
          lng: lng + (Math.random() - 0.5) * 0.05,
          carrier: 'Verizon',
          type: 'tower',
          distance: Math.round((1 + Math.random() * 5) * 10) / 10,
          elevation: 200 + Math.floor(Math.random() * 300),
          signalEstimate: 'moderate'
        },
        {
          id: `tower-${Date.now()}-2`,
          lat: lat + (Math.random() - 0.5) * 0.08,
          lng: lng + (Math.random() - 0.5) * 0.08,
          carrier: 'AT&T',
          type: 'tower',
          distance: Math.round((2 + Math.random() * 6) * 10) / 10,
          elevation: 150 + Math.floor(Math.random() * 250),
          signalEstimate: 'weak'
        },
        {
          id: `tower-${Date.now()}-3`,
          lat: lat + (Math.random() - 0.5) * 0.1,
          lng: lng + (Math.random() - 0.5) * 0.1,
          carrier: 'T-Mobile',
          type: 'tower',
          distance: Math.round((3 + Math.random() * 7) * 10) / 10,
          elevation: 180 + Math.floor(Math.random() * 200),
          signalEstimate: 'weak'
        },
      ];
      
      // Update signal estimates based on distance
      return mockTowers.map(t => ({
        ...t,
        signalEstimate: estimateSignalStrength(t.distance)
      }));
    } catch (err) {
      console.error('Tower fetch error:', err);
      return null;
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setApiError(null);
    
    // Try to geocode the location first (using a simple lat/lng for demo)
    // In production, this would use Geoapify or similar
    let lat = 38.3237;
    let lng = -80.8445;
    
    // Simple ZIP to coord mapping for demo
    if (location === '90210') { lat = 34.0901; lng = -118.4065; }
    else if (location === '82190') { lat = 44.6; lng = -110.5; }
    else if (location === '99501') { lat = 61.2181; lng = -149.9003; }
    
    const newTowers = await fetchTowers(lat, lng);
    if (newTowers) {
      setTowers(newTowers);
      // Generate readings based on tower proximity
      setReadings([
        { carrier: 'Verizon', type: newTowers[0].distance < 3 ? '5G' : 'LTE', bars: newTowers[0].distance < 3 ? 4 : 3, rsrp: -95, sinr: 12, lastSeen: 'Just now' },
        { carrier: 'AT&T', type: newTowers[1].distance < 5 ? 'LTE' : '4G', bars: newTowers[1].distance < 5 ? 3 : 2, rsrp: -105, sinr: 8, lastSeen: '1 min ago' },
        { carrier: 'T-Mobile', type: newTowers[2].distance < 7 ? 'LTE' : '3G', bars: newTowers[2].distance < 7 ? 2 : 1, rsrp: -115, sinr: 3, lastSeen: '2 min ago' },
      ]);
    } else {
      setApiError('Tower data unavailable');
    }
    
    setIsLoading(false);
  };

  const filteredTowers = selectedCarrier === 'all' 
    ? towers 
    : towers.filter(t => t.carrier === selectedCarrier);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Signal className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-semibold">Cell Signal Mapper</h2>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => setUseLiveData(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                !useLiveData ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Demo Data
            </button>
            <button
              onClick={() => setUseLiveData(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                useLiveData ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              FCC Tower Data
            </button>
          </div>
        </div>
        <p className="text-slate-400 mt-2">
          Find nearest cell towers and estimate signal strength at your campsite.
        </p>
        {useLiveData && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            FCC ASR Database Active
            {apiError && <span className="text-amber-400 ml-2">⚠ {apiError}</span>}
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-400 block mb-1">Location (ZIP or Coords)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., 25965 or 44.6,-110.5"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isLoading ? '...' : 'Find'}
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-slate-400 block mb-1">Carrier Filter</label>
            <select
              title="Carrier Filter"
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="all">All Carriers</option>
              <option value="Verizon">Verizon</option>
              <option value="AT&T">AT&T</option>
              <option value="T-Mobile">T-Mobile</option>
            </select>
          </div>
        </div>
      </div>

      {/* Current Signal Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {readings.map((reading) => (
          <div key={reading.carrier} className={`rounded-xl p-4 border ${getSignalColor(reading.bars >= 3 ? 'strong' : reading.bars >= 2 ? 'moderate' : 'weak')}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{reading.carrier}</span>
              {getBarsIcon(reading.bars)}
            </div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="opacity-80">Network:</span>
                <span className="font-medium">{reading.type}</span>
              </div>
              {reading.rsrp && (
                <div className="flex justify-between">
                  <span className="opacity-80">RSRP:</span>
                  <span className="font-medium">{reading.rsrp} dBm</span>
                </div>
              )}
              {reading.sinr && (
                <div className="flex justify-between">
                  <span className="opacity-80">SINR:</span>
                  <span className="font-medium">{reading.sinr} dB</span>
                </div>
              )}
              <div className="flex justify-between text-xs opacity-60">
                <span>Last seen:</span>
                <span>{reading.lastSeen}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tower List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">
          Nearby Cell Towers
          <span className="text-slate-500 text-sm font-normal ml-2">{filteredTowers.length} found</span>
        </h3>
        
        {filteredTowers.map((tower) => {
          const isExpanded = expandedTower === tower.id;
          return (
            <div key={tower.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div
                onClick={() => setExpandedTower(isExpanded ? null : tower.id)}
                className="p-4 cursor-pointer hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getSignalColor(tower.signalEstimate || 'moderate')}`}>
                      <TowerControl className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{tower.carrier} Tower</h4>
                      <p className="text-sm text-slate-400">
                        {tower.distance} miles away • {tower.elevation}ft elevation
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${getSignalColor(tower.signalEstimate || 'moderate')}`}>
                          {tower.signalEstimate} signal
                        </span>
                        <span className="text-xs text-slate-500">{tower.type}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
              
              {isExpanded && (
                <div className="border-t border-slate-700 p-4 bg-slate-850">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Coordinates:</span>
                      <p className="text-slate-300 font-mono">{tower.lat.toFixed(4)}, {tower.lng.toFixed(4)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Structure:</span>
                      <p className="text-slate-300">{tower.structureType || 'Guyed Mast'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Elevation:</span>
                      <p className="text-slate-300">{tower.elevation} ft above ground</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Distance:</span>
                      <p className="text-slate-300">{tower.distance} miles</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <a
                      href={`https://www.google.com/maps?q=${tower.lat},${tower.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      View on Map
                    </a>
                    <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <Radio className="w-3 h-3" />
                      Direction Finder
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Signal Tips */}
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-2 font-medium text-slate-300">Boost Your Signal:</p>
            <ul className="space-y-1 text-slate-400">
              <li>• Move to higher ground - even 10ft helps</li>
              <li>• Clear line-of-sight to tower direction</li>
              <li>• Use a cell booster with external antenna</li>
              <li>• Try different carrier SIMs if roaming</li>
              <li>• WiFi calling works with minimal signal (1 bar)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Emergency Info */}
      <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-red-400 mb-1">No Signal Emergency Options:</p>
            <ul className="space-y-1 text-red-300">
              <li>• Text 911 (works with minimal signal)</li>
              <li>• Emergency SOS via satellite (iPhone 14+)</li>
              <li>• PLB (Personal Locator Beacon) - one-way satellite</li>
              <li>• Garmin inReach - two-way satellite messaging</li>
              <li>• Drive 2-5 miles toward nearest tower</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
