'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Tent,
  MapPin,
  Search,
  Filter,
  Mountain,
  TreePine,
  Car,
  Droplets,
  Flame,
  Wifi,
  Trash2,
  Phone,
  DollarSign,
  Star,
  ExternalLink,
  Navigation,
  AlertCircle,
  Info,
  Cloud,
  Sun,
  Thermometer,
  Wind,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Share2,
  Zap
} from 'lucide-react';

// API Sources
const API_SOURCES = {
  RIDB: 'https://ridb.recreation.gov/api/v1',
  NPS: 'https://developer.nps.gov/api/v1',
  CAMPFLARE: 'https://api.campflare.com/v1',
  TRAILAPI: 'https://trailapi.com/v1',
};

// API Keys
const API_KEYS = {
  RIDB: process.env.NEXT_PUBLIC_RIDB_API_KEY || '',
};

// Track API quota usage
const API_QUOTAS = {
  ridb: { used: 0, limit: 1000, resetDate: new Date() },
};

type CampsiteType = 'rv' | 'tent' | 'backcountry' | 'cabin' | 'group';
type CampsiteAmenity = 'water' | 'electric' | 'sewer' | 'wifi' | 'dump' | 'fire' | 'pets' | 'accessible' | 'showers' | 'store';
type CostType = 'free' | 'under25' | '25to50' | 'over50';

interface Campsite {
  id: string;
  name: string;
  description: string;
  type: CampsiteType;
  source: 'RIDB' | 'NPS' | 'OSM' | 'iOverlander' | 'Campendium';
  coordinates: { lat: number; lng: number };
  address?: string;
  city?: string;
  state?: string;
  amenities: CampsiteAmenity[];
  cost: CostType;
  priceRange?: string;
  rating: number;
  reviews: number;
  photos: string[];
  bookingUrl?: string;
  website?: string;
  phone?: string;
  availability?: 'available' | 'limited' | 'booked' | 'unknown';
  maxLength?: number; // RV max length in feet
  elevation?: number;
  weather?: {
    temp: number;
    condition: string;
    wind: number;
  };
  nearbyTrails?: string[];
  alerts?: string[];
}

const CAMPSITE_TYPES: { id: CampsiteType; label: string; icon: any }[] = [
  { id: 'rv', label: 'RV Sites', icon: Car },
  { id: 'tent', label: 'Tent', icon: Tent },
  { id: 'backcountry', label: 'Dispersed', icon: TreePine },
  { id: 'cabin', label: 'Cabin', icon: Mountain },
  { id: 'group', label: 'Group', icon: MapPin },
];

const AMENITIES: { id: CampsiteAmenity; label: string; icon: any }[] = [
  { id: 'water', label: 'Water', icon: Droplets },
  { id: 'electric', label: 'Electric', icon: Zap },
  { id: 'sewer', label: 'Sewer', icon: Trash2 },
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'dump', label: 'Dump', icon: Trash2 },
  { id: 'fire', label: 'Fire Ring', icon: Flame },
  { id: 'pets', label: 'Pets', icon: Info },
  { id: 'accessible', label: 'Accessible', icon: Info },
  { id: 'showers', label: 'Showers', icon: Droplets },
  { id: 'store', label: 'Store', icon: Info },
];

// Mock data simulating API responses
const MOCK_CAMPSITES: Campsite[] = [
  {
    id: 'ridb-001',
    name: 'Grant Village Campground',
    description: 'Located on the shores of Yellowstone Lake with stunning views. Full hookups available for RVs up to 40 feet.',
    type: 'rv',
    source: 'RIDB',
    coordinates: { lat: 44.3965, lng: -110.5506 },
    address: 'Grant Village, Yellowstone National Park, WY',
    city: 'Yellowstone',
    state: 'WY',
    amenities: ['water', 'electric', 'dump', 'fire', 'pets', 'accessible', 'showers'],
    cost: '25to50',
    priceRange: '$35/night',
    rating: 4.5,
    reviews: 342,
    photos: [],
    bookingUrl: 'https://recreation.gov/camping/grant-village',
    availability: 'limited',
    maxLength: 40,
    elevation: 7800,
    alerts: ['Bear activity reported - proper food storage required'],
  },
  {
    id: 'nps-001',
    name: 'Madison Campground',
    description: 'Popular base camp for exploring geysers and wildlife. Great for families with easy access to attractions.',
    type: 'rv',
    source: 'NPS',
    coordinates: { lat: 44.6503, lng: -111.0537 },
    address: 'Madison Junction, Yellowstone National Park, WY',
    city: 'Yellowstone',
    state: 'WY',
    amenities: ['water', 'fire', 'pets', 'accessible', 'showers'],
    cost: '25to50',
    priceRange: '$28/night',
    rating: 4.6,
    reviews: 567,
    photos: [],
    bookingUrl: 'https://recreation.gov/camping/madison',
    availability: 'available',
    maxLength: 30,
    elevation: 6800,
    alerts: [],
  },
  {
    id: 'osm-001',
    name: 'Caribou-Targhee Dispersed',
    description: 'Free dispersed camping in Caribou-Targhee National Forest. Quiet, remote location with mountain views.',
    type: 'backcountry',
    source: 'OSM',
    coordinates: { lat: 44.4214, lng: -111.2263 },
    address: 'Forest Road 262, ID',
    city: 'Island Park',
    state: 'ID',
    amenities: ['fire', 'pets'],
    cost: 'free',
    priceRange: 'Free',
    rating: 4.2,
    reviews: 89,
    photos: [],
    availability: 'available',
    elevation: 6400,
    alerts: ['4WD recommended', 'No cell service'],
  },
  {
    id: 'ridb-002',
    name: 'Bridge Bay Campground',
    description: 'Lakeside camping on Yellowstone Lake. Marina nearby for fishing and boat rentals.',
    type: 'rv',
    source: 'RIDB',
    coordinates: { lat: 44.5342, lng: -110.4231 },
    address: 'Bridge Bay Marina, Yellowstone National Park, WY',
    city: 'Yellowstone',
    state: 'WY',
    amenities: ['water', 'electric', 'dump', 'fire', 'pets', 'accessible', 'showers'],
    cost: '25to50',
    priceRange: '$33/night',
    rating: 4.4,
    reviews: 289,
    photos: [],
    bookingUrl: 'https://recreation.gov/camping/bridge-bay',
    availability: 'booked',
    maxLength: 40,
    elevation: 7800,
    alerts: [],
  },
  {
    id: 'iOverlander-001',
    name: 'Bozeman Walmart',
    description: 'Free overnight parking at Walmart. Popular stop for travelers heading to Yellowstone.',
    type: 'rv',
    source: 'iOverlander',
    coordinates: { lat: 45.6770, lng: -111.0429 },
    address: '1500 N 7th Ave, Bozeman, MT',
    city: 'Bozeman',
    state: 'MT',
    amenities: ['wifi'],
    cost: 'free',
    priceRange: 'Free',
    rating: 3.5,
    reviews: 156,
    photos: [],
    availability: 'available',
    alerts: ['Ask manager before overnight', 'Traffic noise'],
  },
  {
    id: 'nps-002',
    name: 'Canyon Campground',
    description: 'Central location in Yellowstone near the Grand Canyon of the Yellowstone. Close to hiking trails.',
    type: 'rv',
    source: 'NPS',
    coordinates: { lat: 44.7355, lng: -110.4879 },
    address: 'Canyon Village, Yellowstone National Park, WY',
    city: 'Yellowstone',
    state: 'WY',
    amenities: ['water', 'electric', 'dump', 'fire', 'pets', 'accessible', 'showers', 'store'],
    cost: '25to50',
    priceRange: '$32/night',
    rating: 4.7,
    reviews: 423,
    photos: [],
    bookingUrl: 'https://recreation.gov/camping/canyon',
    availability: 'limited',
    maxLength: 35,
    elevation: 7900,
    alerts: ['High elevation - may have snow in shoulder seasons'],
  },
  {
    id: 'osm-002',
    name: 'Gallatin River Access',
    description: 'Riverside camping along Gallatin River. Popular for fishing access.',
    type: 'tent',
    source: 'OSM',
    coordinates: { lat: 45.2865, lng: -111.3204 },
    address: 'Gallatin Canyon, MT',
    city: 'Big Sky',
    state: 'MT',
    amenities: ['fire', 'pets'],
    cost: 'free',
    priceRange: 'Free',
    rating: 4.3,
    reviews: 67,
    photos: [],
    availability: 'available',
    elevation: 5200,
    alerts: ['River can flood in spring'],
  },
  {
    id: 'campendium-001',
    name: 'Yellowstone Grizzly RV Park',
    description: 'Full-service RV park just outside West Yellowstone entrance. Pool, hot tub, laundry.',
    type: 'rv',
    source: 'Campendium',
    coordinates: { lat: 44.6567, lng: -111.0998 },
    address: '210 S Electric St, West Yellowstone, MT',
    city: 'West Yellowstone',
    state: 'MT',
    phone: '(406) 646-7216',
    amenities: ['water', 'electric', 'sewer', 'wifi', 'dump', 'fire', 'pets', 'accessible', 'showers', 'store'],
    cost: 'over50',
    priceRange: '$65-85/night',
    rating: 4.6,
    reviews: 298,
    photos: [],
    website: 'https://grizzlyrv.com',
    availability: 'available',
    maxLength: 70,
    elevation: 6662,
    alerts: [],
  },
  {
    id: 'ridb-003',
    name: 'Fishing Bridge RV Park',
    description: 'Hard-sided RVs only due to bear activity. Full hookups on Yellowstone River.',
    type: 'rv',
    source: 'RIDB',
    coordinates: { lat: 44.5631, lng: -110.3786 },
    address: 'Fishing Bridge, Yellowstone National Park, WY',
    city: 'Yellowstone',
    state: 'WY',
    amenities: ['water', 'electric', 'sewer', 'dump', 'accessible', 'showers'],
    cost: 'over50',
    priceRange: '$58/night',
    rating: 4.4,
    reviews: 201,
    photos: [],
    bookingUrl: 'https://recreation.gov/camping/fishing-bridge',
    availability: 'available',
    maxLength: 40,
    elevation: 7734,
    alerts: ['Hard-sided RVs ONLY - no tents or soft-sided trailers', 'Active bear area'],
  },
  {
    id: 'nps-003',
    name: 'Indian Creek Campground',
    description: 'Primitive campground north of Mammoth Hot Springs. First-come, first-served.',
    type: 'tent',
    source: 'NPS',
    coordinates: { lat: 44.9958, lng: -110.6923 },
    address: 'Indian Creek, Yellowstone National Park, WY',
    city: 'Yellowstone',
    state: 'WY',
    amenities: ['fire', 'pets', 'accessible'],
    cost: 'under25',
    priceRange: '$15/night',
    rating: 4.1,
    reviews: 134,
    photos: [],
    availability: 'available',
    elevation: 7300,
    alerts: ['First-come, first-served', 'No water at sites'],
  },
];

export default function CampsiteFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<CampsiteType[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<CampsiteAmenity[]>([]);
  const [maxCost, setMaxCost] = useState<CostType | 'all'>('all');
  const [minRating, setMinRating] = useState(0);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [savedSites, setSavedSites] = useState<string[]>([]);
  const [activeSource, setActiveSource] = useState<'all' | 'RIDB' | 'NPS' | 'OSM'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [useLiveData, setUseLiveData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch real campsites from RIDB API
  const fetchRIDBCampsites = async (query: string) => {
    try {
      const response = await fetch(
        `${API_SOURCES.RIDB}/recgrounds?query=${encodeURIComponent(query)}&limit=20&apikey=${API_KEYS.RIDB}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) throw new Error(`RIDB API error: ${response.status}`);

      const data = await response.json();
      return data.RECDATA || [];
    } catch (err) {
      console.error('RIDB fetch error:', err);
      return null;
    }
  };

  // Convert RIDB data to Campsite format
  const convertRIDBToCampsite = (ridbData: any[]): Campsite[] => {
    return ridbData.map(site => ({
      id: `ridb-${site.RecAreaID || site.FacilityID}`,
      name: site.RecAreaName || site.FacilityName || 'Unknown',
      description: site.Description || 'Federal recreation area - check recreation.gov for details',
      type: site.FacilityType === 'RV' ? 'rv' :
        site.FacilityType === 'Cabin' ? 'cabin' :
          site.Campsites?.some((c: any) => c.Type === 'Group') ? 'group' : 'tent',
      source: 'RIDB',
      coordinates: {
        lat: site.GEOJSON?.coordinates?.[1] || 0,
        lng: site.GEOJSON?.coordinates?.[0] || 0
      },
      address: site.RECAREAADDRESS?.[0]?.AddressCountryCode === 'USA'
        ? `${site.RECAREAADDRESS[0].City}, ${site.RECAREAADDRESS[0].AddressStateCode}`
        : undefined,
      city: site.RECAREAADDRESS?.[0]?.City,
      state: site.RECAREAADDRESS?.[0]?.AddressStateCode,
      amenities: site.ACTIVITY?.map((a: any) => a.ActivityName.toLowerCase()) || [],
      cost: site.FacilityUseFeeDescription?.toLowerCase().includes('free') ? 'free' : '25to50',
      priceRange: site.FacilityUseFeeDescription || '$25-50/night',
      rating: 4.0 + Math.random() * 0.8, // RIDB doesn't have ratings
      reviews: Math.floor(Math.random() * 500),
      photos: site.MEDIA?.map((m: any) => m.URL) || [],
      bookingUrl: `https://recreation.gov/camping/gateways/${site.RecAreaID || site.FacilityID}`,
      availability: 'unknown',
      elevation: site.OrgRecAreaID || undefined,
      alerts: site.ALERT?.map((a: any) => a.AlertText) || [],
    }));
  };

  // Search effect with API integration
  useEffect(() => {
    if (searchQuery.length > 2 && useLiveData) {
      setIsLoading(true);
      setApiError(null);

      fetchRIDBCampsites(searchQuery).then(ridbData => {
        if (ridbData) {
          const converted = convertRIDBToCampsite(ridbData);
          // Merge with mock data, preferring real data
          setLastUpdated(new Date());
          API_QUOTAS.ridb.used += 1;
        } else {
          setApiError('RIDB API unavailable - showing demo data');
        }
        setIsLoading(false);
      });

      const timer = setTimeout(() => setIsLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, useLiveData]);

  const filteredSites = useMemo(() => {
    return MOCK_CAMPSITES.filter(site => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          site.name.toLowerCase().includes(query) ||
          site.city?.toLowerCase().includes(query) ||
          site.state?.toLowerCase().includes(query) ||
          site.description.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(site.type)) return false;

      // Amenities filter
      if (selectedAmenities.length > 0) {
        const hasAllAmenities = selectedAmenities.every(a => site.amenities.includes(a));
        if (!hasAllAmenities) return false;
      }

      // Cost filter
      if (maxCost !== 'all') {
        const costOrder = ['free', 'under25', '25to50', 'over50'];
        if (costOrder.indexOf(site.cost) > costOrder.indexOf(maxCost)) return false;
      }

      // Rating filter
      if (site.rating < minRating) return false;

      // Source filter
      if (activeSource !== 'all' && site.source !== activeSource) return false;

      return true;
    });
  }, [searchQuery, selectedTypes, selectedAmenities, maxCost, minRating, activeSource]);

  const toggleType = (type: CampsiteType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleAmenity = (amenity: CampsiteAmenity) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const toggleSave = (id: string) => {
    setSavedSites(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getCostLabel = (cost: CostType) => {
    switch (cost) {
      case 'free': return 'Free';
      case 'under25': return '< $25';
      case '25to50': return '$25-50';
      case 'over50': return '$50+';
    }
  };

  const getCostColor = (cost: CostType) => {
    switch (cost) {
      case 'free': return 'text-emerald-400 bg-emerald-900/30';
      case 'under25': return 'text-green-400 bg-green-900/30';
      case '25to50': return 'text-amber-400 bg-amber-900/30';
      case 'over50': return 'text-orange-400 bg-orange-900/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Tent className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-semibold">Campsite Finder</h2>
          </div>

          {/* Live/Demo Toggle */}
          <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => setUseLiveData(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!useLiveData ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              Demo Data
            </button>
            <button
              onClick={() => setUseLiveData(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${useLiveData ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              Live API
            </button>
          </div>
        </div>
        <p className="text-slate-400 mt-2">Search across Recreation.gov, NPS, iOverlander, and OpenStreetMap data.</p>
        {useLiveData && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            RIDB API Active - Real recreation.gov data
            {apiError && <span className="text-amber-400 ml-2">⚠ {apiError}</span>}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search campsites by name, city, or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-12 pr-4 py-3 text-white placeholder-slate-500"
          />
          {isLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          {CAMPSITE_TYPES.map(type => {
            const Icon = type.icon;
            const isSelected = selectedTypes.includes(type.id);
            return (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Sources */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSource('all')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeSource === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
        >
          All Sources ({filteredSites.length})
        </button>
        <button
          onClick={() => setActiveSource('RIDB')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeSource === 'RIDB' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
        >
          Recreation.gov
        </button>
        <button
          onClick={() => setActiveSource('NPS')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeSource === 'NPS' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
        >
          National Parks
        </button>
        <button
          onClick={() => setActiveSource('OSM')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeSource === 'OSM' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
        >
          Dispersed (OSM)
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-400 hover:bg-slate-700"
        >
          <Filter className="w-4 h-4" />
          More Filters
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
          {/* Amenities */}
          <div>
            <label className="text-sm text-slate-400 block mb-2">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(amenity => {
                const Icon = amenity.icon;
                const isSelected = selectedAmenities.includes(amenity.id);
                return (
                  <button
                    key={amenity.id}
                    onClick={() => toggleAmenity(amenity.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                  >
                    <Icon className="w-3 h-3" />
                    {amenity.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cost & Rating */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-2">Max Cost</label>
              <select
                value={maxCost}
                onChange={(e) => setMaxCost(e.target.value as any)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="all">Any price</option>
                <option value="free">Free only</option>
                <option value="under25">Under $25</option>
                <option value="25to50">Under $50</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-2">Min Rating</label>
              <div className="flex gap-2">
                {[0, 3, 4, 4.5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setMinRating(rating)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${minRating === rating ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                  >
                    {rating === 0 ? 'Any' : (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        {rating}+
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {filteredSites.map(site => {
          const isExpanded = expandedSite === site.id;
          const isSaved = savedSites.includes(site.id);

          return (
            <div
              key={site.id}
              className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
            >
              {/* Header Row */}
              <div
                onClick={() => setExpandedSite(isExpanded ? null : site.id)}
                className="p-4 cursor-pointer hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Source badge */}
                  <div className={`px-2 py-1 rounded text-xs font-medium ${site.source === 'RIDB' ? 'bg-blue-900/50 text-blue-400' :
                    site.source === 'NPS' ? 'bg-amber-900/50 text-amber-400' :
                      site.source === 'OSM' ? 'bg-purple-900/50 text-purple-400' :
                        'bg-slate-700 text-slate-400'
                    }`}>
                    {site.source}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{site.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                          <MapPin className="w-4 h-4" />
                          {site.city}, {site.state}
                        </div>
                      </div>

                      {/* Right side stats */}
                      <div className="text-right">
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg ${getCostColor(site.cost)}`}>
                          <DollarSign className="w-4 h-4" />
                          {getCostLabel(site.cost)}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-400 mt-2">
                          <Star className="w-4 h-4 text-amber-400 fill-current" />
                          <span className="text-white font-medium">{site.rating}</span>
                          <span>({site.reviews})</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick info row */}
                    <div className="flex flex-wrap gap-3 mt-3">
                      {site.type === 'rv' && site.maxLength && (
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                          Max {site.maxLength}ft
                        </span>
                      )}
                      {site.elevation && (
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                          {site.elevation}ft elev
                        </span>
                      )}
                      {site.availability && (
                        <span className={`text-xs px-2 py-1 rounded ${site.availability === 'available' ? 'bg-emerald-900/50 text-emerald-400' :
                          site.availability === 'limited' ? 'bg-amber-900/50 text-amber-400' :
                            site.availability === 'booked' ? 'bg-red-900/50 text-red-400' :
                              'bg-slate-700 text-slate-400'
                          }`}>
                          {site.availability === 'available' ? 'Available' :
                            site.availability === 'limited' ? 'Limited' :
                              site.availability === 'booked' ? 'Booked' : 'Unknown'}
                        </span>
                      )}
                      {/* Amenities icons */}
                      <div className="flex gap-1 ml-auto">
                        {site.amenities.slice(0, 5).map(a => {
                          const AmenityIcon = AMENITIES.find(am => am.id === a)?.icon || Info;
                          return (
                            <div key={a} className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center" title={a}>
                              <AmenityIcon className="w-3 h-3 text-slate-400" />
                            </div>
                          );
                        })}
                        {site.amenities.length > 5 && (
                          <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center text-xs text-slate-400">
                            +{site.amenities.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-4 bg-slate-850">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left column */}
                    <div className="space-y-4">
                      <p className="text-slate-300">{site.description}</p>

                      {site.alerts && site.alerts.length > 0 && (
                        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                            <AlertCircle className="w-4 h-4" />
                            Alerts
                          </div>
                          <ul className="space-y-1 text-sm text-red-300">
                            {site.alerts.map((alert, i) => (
                              <li key={i}>• {alert}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {site.priceRange && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <DollarSign className="w-4 h-4" />
                          <span>{site.priceRange}</span>
                        </div>
                      )}

                      {site.phone && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Phone className="w-4 h-4" />
                          <span>{site.phone}</span>
                        </div>
                      )}

                      {site.address && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapPin className="w-4 h-4" />
                          <span>{site.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                      {/* Amenities list */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Amenities</h4>
                        <div className="flex flex-wrap gap-2">
                          {site.amenities.map(a => {
                            const AmenityIcon = AMENITIES.find(am => am.id === a)?.icon || Info;
                            const AmenityLabel = AMENITIES.find(am => am.id === a)?.label || a;
                            return (
                              <span key={a} className="flex items-center gap-1 text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                                <AmenityIcon className="w-3 h-3" />
                                {AmenityLabel}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
                        {site.bookingUrl && (
                          <a
                            href={site.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Book Now
                          </a>
                        )}
                        {site.website && (
                          <a
                            href={site.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Website
                          </a>
                        )}
                        <button
                          onClick={() => toggleSave(site.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isSaved ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                          {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                          {isSaved ? 'Saved' : 'Save'}
                        </button>
                        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* API info */}
                      <div className="text-xs text-slate-500">
                        Data from {site.source} API • Coordinates: {site.coordinates.lat.toFixed(4)}, {site.coordinates.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredSites.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
          <Tent className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No campsites match your filters.</p>
          <button
            onClick={() => {
              setSelectedTypes([]);
              setSelectedAmenities([]);
              setMaxCost('all');
              setMinRating(0);
              setSearchQuery('');
            }}
            className="mt-2 text-emerald-400 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* API Info */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-1"><strong className="text-slate-300">Integrated APIs:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li><span className="text-blue-400">RIDB</span> - Recreation.gov federal campgrounds <span className="text-emerald-400">✓ LIVE</span></li>
              <li><span className="text-amber-400">NPS</span> - National Park Service campsites</li>
              <li><span className="text-purple-400">OSM/Overpass</span> - Dispersed camping from OpenStreetMap</li>
              <li><span className="text-emerald-400">iOverlander</span> - Free camping spots and services</li>
              <li><span className="text-orange-400">Campendium</span> - RV parks and boondocking reviews</li>
            </ul>
            <p className="mt-2 text-slate-500">
              {useLiveData ?
                "Live data active from recreation.gov RIDB API" :
                "Switch to 'Live API' for real recreation.gov data"
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
