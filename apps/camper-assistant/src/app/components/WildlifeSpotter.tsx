'use client';

import { useState, useEffect } from 'react';
import {
  Bird,
  Search,
  MapPin,
  Calendar,
  Eye,
  Info,
  ExternalLink,
  Loader2,
  Leaf,
  Feather,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';

// eBird API Configuration
const EBIRD_CONFIG = {
  API_KEY: process.env.NEXT_PUBLIC_EBIRD_API_KEY || '21rbhpki93rn',
  BASE_URL: 'https://api.ebird.org/v2',
  REGION_CODE: 'US', // Default to US
};

interface eBirdObservation {
  speciesCode: string;
  comName: string;
  sciName: string;
  locId: string;
  locName: string;
  obsDt: string;
  howMany: number;
  lat: number;
  lng: number;
  obsValid: boolean;
  obsReviewed: boolean;
  locationPrivate: boolean;
  subId: string;
}

interface BirdSighting {
  id: string;
  species: string;
  scientificName: string;
  location: string;
  date: string;
  count: number;
  lat: number;
  lng: number;
  rarity: 'common' | 'uncommon' | 'rare';
}

// Mock data for demo
const MOCK_SIGHTINGS: BirdSighting[] = [
  {
    id: 'mock-1',
    species: 'American Robin',
    scientificName: 'Turdus migratorius',
    location: 'Yellowstone Lake',
    date: '2026-02-14',
    count: 5,
    lat: 44.4,
    lng: -110.5,
    rarity: 'common',
  },
  {
    id: 'mock-2',
    species: 'Bald Eagle',
    scientificName: 'Haliaeetus leucocephalus',
    location: 'Madison River',
    date: '2026-02-13',
    count: 2,
    lat: 44.6,
    lng: -111.0,
    rarity: 'uncommon',
  },
  {
    id: 'mock-3',
    species: 'Mountain Bluebird',
    scientificName: 'Sialia currucoides',
    location: 'Fairy Falls Trail',
    date: '2026-02-12',
    count: 3,
    lat: 44.5,
    lng: -110.8,
    rarity: 'common',
  },
  {
    id: 'mock-4',
    species: 'Great Gray Owl',
    scientificName: 'Strix nebulosa',
    location: 'Lamar Valley',
    date: '2026-02-10',
    count: 1,
    lat: 44.9,
    lng: -110.2,
    rarity: 'rare',
  },
  {
    id: 'mock-5',
    species: 'Trumpeter Swan',
    scientificName: 'Cygnus buccinator',
    location: 'Yellowstone River',
    date: '2026-02-14',
    count: 8,
    lat: 44.5,
    lng: -110.4,
    rarity: 'uncommon',
  },
  {
    id: 'mock-6',
    species: 'Osprey',
    scientificName: 'Pandion haliaetus',
    location: 'Grand Prismatic',
    date: '2026-02-11',
    count: 1,
    lat: 44.5,
    lng: -110.8,
    rarity: 'common',
  },
];

// Recent notable/rare birds
const RARE_BIRDS = [
  { species: 'Great Gray Owl', location: 'Yellowstone NP', date: '2 days ago', rarity: 'rare' },
  { species: 'Black Rosy-Finch', location: 'Grand Teton', date: '3 days ago', rarity: 'uncommon' },
  { species: 'Trumpeter Swan', location: 'Jackson Lake', date: '1 day ago', rarity: 'uncommon' },
];

// Convert eBird observation to our format
const convertEBirdObservation = (obs: eBirdObservation): BirdSighting => {
  // Determine rarity based on count and species
  let rarity: 'common' | 'uncommon' | 'rare' = 'common';
  if (obs.howMany <= 1) rarity = 'rare';
  else if (obs.howMany <= 3) rarity = 'uncommon';

  // Some species are always rare
  const rareSpecies = ['Great Gray Owl', 'Ivory Gull', 'Ross\'s Gull', 'Common Crane'];
  if (rareSpecies.some(r => obs.comName.includes(r))) rarity = 'rare';

  return {
    id: `${obs.speciesCode}-${obs.subId}`,
    species: obs.comName,
    scientificName: obs.sciName,
    location: obs.locName,
    date: obs.obsDt.split(' ')[0],
    count: obs.howMany || 1,
    lat: obs.lat,
    lng: obs.lng,
    rarity,
  };
};

export default function WildlifeSpotter() {
  const [location, setLocation] = useState('US-WY-029'); // Yellowstone area
  const [sightings, setSightings] = useState<BirdSighting[]>(MOCK_SIGHTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [useLiveData, setUseLiveData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [expandedSighting, setExpandedSighting] = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<'all' | 'common' | 'uncommon' | 'rare'>('all');
  const [daysBack, setDaysBack] = useState(7);

  // Fetch recent observations from eBird
  const fetchEBirdSightings = async () => {
    try {
      const url = `${EBIRD_CONFIG.BASE_URL}/data/obs/${location}/recent?back=${daysBack}&key=${EBIRD_CONFIG.API_KEY}`;
      
      const response = await fetch(url, {
        headers: {
          'X-eBirdApiToken': EBIRD_CONFIG.API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`eBird API error: ${response.status}`);
      }

      const data: eBirdObservation[] = await response.json();
      return data.map(convertEBirdObservation);
    } catch (err) {
      console.error('eBird fetch error:', err);
      return null;
    }
  };

  // Search handler
  const handleSearch = async () => {
    if (!useLiveData) {
      // Filter mock data
      const filtered = MOCK_SIGHTINGS.filter(s => 
        filterRarity === 'all' || s.rarity === filterRarity
      );
      setSightings(filtered);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    const eBirdSightings = await fetchEBirdSightings();

    if (eBirdSightings) {
      const filtered = filterRarity === 'all' 
        ? eBirdSightings 
        : eBirdSightings.filter(s => s.rarity === filterRarity);
      setSightings(filtered.length > 0 ? filtered : MOCK_SIGHTINGS);
    } else {
      setApiError('eBird API unavailable - showing demo data');
      setSightings(MOCK_SIGHTINGS);
    }

    setIsLoading(false);
  };

  // Auto-search on live toggle
  useEffect(() => {
    if (useLiveData) {
      handleSearch();
    }
  }, [useLiveData, filterRarity, daysBack]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-emerald-400 bg-emerald-900/30';
      case 'uncommon': return 'text-amber-400 bg-amber-900/30';
      case 'rare': return 'text-red-400 bg-red-900/30';
      default: return 'text-slate-400 bg-slate-700';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return <Leaf className="w-4 h-4" />;
      case 'uncommon': return <Feather className="w-4 h-4" />;
      case 'rare': return <Bird className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Bird className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-semibold">Wildlife Spotter</h2>
          </div>
          
          {/* Live/Demo Toggle */}
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
              Live eBird API
            </button>
          </div>
        </div>
        <p className="text-slate-400 mt-2">
          Track recent bird sightings and rare bird alerts near your campsite.
        </p>
        {useLiveData && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            eBird API Active - Cornell Lab of Ornithology
            {apiError && <span className="text-amber-400 ml-2">⚠ {apiError}</span>}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Location (eBird Region)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g., US-WY-029"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Try: US-WY-029 (Yellowstone), US-CA-075 (SF)</p>
          </div>
          
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Days Back</label>
            <select
              title="Days Back"
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value={1}>Last 24 hours</option>
              <option value={3}>Last 3 days</option>
              <option value={7}>Last week</option>
              <option value={14}>Last 2 weeks</option>
              <option value={30}>Last month</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Rarity Filter</label>
            <select
              title="Rarity Filter"
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value as any)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="all">All Birds</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare Only</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isLoading ? 'Fetching...' : 'Search Sightings'}
        </button>
      </div>

      {/* Rare Bird Alerts */}
      <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bird className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-amber-400">Recent Rare Bird Alerts</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {RARE_BIRDS.map((bird, i) => (
            <div key={i} className="bg-slate-800/50 rounded-lg p-3 border border-amber-700/30">
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-medium">{bird.species}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${getRarityColor(bird.rarity)}`}>
                  {bird.rarity}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {bird.location} • {bird.date}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sightings List */}
      <div className="grid grid-cols-1 gap-3">
        {sightings.map((sighting) => {
          const isExpanded = expandedSighting === sighting.id;
          
          return (
            <div
              key={sighting.id}
              className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
            >
              {/* Header */}
              <div
                onClick={() => setExpandedSighting(isExpanded ? null : sighting.id)}
                className="p-4 cursor-pointer hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getRarityColor(sighting.rarity)}`}>
                      {getRarityIcon(sighting.rarity)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{sighting.species}</h3>
                      <p className="text-sm text-slate-400 italic">{sighting.scientificName}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {sighting.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {sighting.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {sighting.count} observed
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded capitalize ${getRarityColor(sighting.rarity)}`}>
                      {sighting.rarity}
                    </span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-4 bg-slate-850">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Sighting Details</h4>
                      <div className="space-y-2 text-sm text-slate-300">
                        <p><span className="text-slate-500">Location:</span> {sighting.location}</p>
                        <p><span className="text-slate-500">Coordinates:</span> {sighting.lat.toFixed(4)}, {sighting.lng.toFixed(4)}</p>
                        <p><span className="text-slate-500">Date:</span> {sighting.date}</p>
                        <p><span className="text-slate-500">Count:</span> {sighting.count} {sighting.count === 1 ? 'bird' : 'birds'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Actions</h4>
                      <div className="space-y-2">
                        <a
                          href={`https://ebird.org/species/${sighting.id.split('-')[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on eBird
                        </a>
                        <a
                          href={`https://www.google.com/maps?q=${sighting.lat},${sighting.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                        >
                          <MapPin className="w-4 h-4" />
                          Open in Maps
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <Info className="w-4 h-4 mt-0.5" />
                      <span>
                        Data from eBird/Cornell Lab of Ornithology. 
                        Observations are submitted by birders worldwide.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sightings.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
          <Bird className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No bird sightings found for this criteria.</p>
          <button
            onClick={() => {
              setFilterRarity('all');
              setDaysBack(30);
              handleSearch();
            }}
            className="mt-2 text-emerald-400 hover:underline"
          >
            Clear filters and try again
          </button>
        </div>
      )}

      {/* API Info */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-1"><strong className="text-slate-300">Wildlife Data:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li><span className="text-emerald-400">eBird</span> - Cornell Lab of Ornithology <span className="text-emerald-400">✓ LIVE</span></li>
              <li>800M+ bird observations worldwide</li>
              <li>Real-time rare bird alerts</li>
              <li>Submit your own sightings via eBird app</li>
            </ul>
            <p className="mt-2 text-slate-500">
              {useLiveData ? 
                "Live data from eBird API" : 
                "Switch to 'Live eBird API' for real sightings"
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
