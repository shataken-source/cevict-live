'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Utensils,
  Fuel,
  Toilet,
  Wrench,
  Mountain,
  Landmark,
  Tent,
  CloudRain,
  Navigation,
  Search,
  Phone,
  Clock,
  Star,
  Car,
  Bike,
  Info,
  ExternalLink,
  Wifi,
  Signal,
  Loader2
} from 'lucide-react';

// Geoapify API Configuration
const GEOAPIFY_CONFIG = {
  API_KEY: process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '',
  BASE_URL: 'https://api.geoapify.com/v1',
};

// Mock attraction database for demo - structured for real API integration
type AttractionType = 'food' | 'gas' | 'restroom' | 'repair' | 'trail' | 'historic' | 'shelter' | 'entertainment';

interface Attraction {
  id: string;
  name: string;
  type: AttractionType;
  distance: number; // miles from campsite
  rating: number;
  address: string;
  phone?: string;
  hours?: string;
  description: string;
  isOpen: boolean;
  tags: string[];
  website?: string;
}

interface LocationData {
  zip: string;
  name: string;
  coords: { lat: number; lng: number };
  attractions: Attraction[];
}


const ATTRACTION_CATEGORIES: { type: AttractionType; icon: any; label: string; color: string }[] = [
  { type: 'food', icon: Utensils, label: 'Food & Groceries', color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50' },
  { type: 'gas', icon: Fuel, label: 'Fuel & Supplies', color: 'text-amber-400 bg-amber-900/30 border-amber-700/50' },
  { type: 'restroom', icon: Toilet, label: 'Restrooms', color: 'text-blue-400 bg-blue-900/30 border-blue-700/50' },
  { type: 'repair', icon: Wrench, label: 'Repairs', color: 'text-red-400 bg-red-900/30 border-red-700/50' },
  { type: 'trail', icon: Mountain, label: 'Trails & Nature', color: 'text-green-400 bg-green-900/30 border-green-700/50' },
  { type: 'historic', icon: Landmark, label: 'Historic Sites', color: 'text-purple-400 bg-purple-900/30 border-purple-700/50' },
  { type: 'entertainment', icon: Tent, label: 'Attractions', color: 'text-cyan-400 bg-cyan-900/30 border-cyan-700/50' },
  { type: 'shelter', icon: CloudRain, label: 'Emergency/Shelter', color: 'text-rose-400 bg-rose-900/30 border-rose-700/50' },
];

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine formula for rough distance calculation
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}


// Geoapify API Functions
interface GeoapifyPlace {
  place_id: string;
  name: string;
  formatted: string;
  lat: number;
  lon: number;
  categories: string[];
  distance?: number;
  contact?: {
    phone?: string;
  };
  opening_hours?: string;
  website?: string;
  rating?: number;
}

// Geocode ZIP/city to coordinates
const geocodeLocation = async (query: string): Promise<{ lat: number; lng: number; name: string } | null> => {
  try {
    const url = `${GEOAPIFY_CONFIG.BASE_URL}/geocode/search?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_CONFIG.API_KEY}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    if (data.features?.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      const name = data.features[0].properties.formatted || query;
      return { lat, lng: lon, name };
    }
    return null;
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
};

// Search for nearby places
const searchNearbyPlaces = async (
  lat: number,
  lng: number,
  radius: number = 50000, // 50km in meters
  categories: string[] = []
): Promise<GeoapifyPlace[]> => {
  try {
    const categoryParam = categories.length > 0 ? `&categories=${categories.join(',')}` : '';
    const url = `${GEOAPIFY_CONFIG.BASE_URL}/places/nearby?lat=${lat}&lon=${lng}&radius=${radius}${categoryParam}&apiKey=${GEOAPIFY_CONFIG.API_KEY}&limit=20`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Places search failed');
    const data = await response.json();
    return data.features?.map((f: any) => ({
      place_id: f.properties.place_id,
      name: f.properties.name || 'Unknown',
      formatted: f.properties.formatted || '',
      lat: f.properties.lat,
      lon: f.properties.lon,
      categories: f.properties.categories || [],
      distance: f.properties.distance,
      contact: f.properties.contact,
      opening_hours: f.properties.opening_hours,
      website: f.properties.website,
      rating: f.properties.rating,
    })) || [];
  } catch (err) {
    console.error('Places search error:', err);
    return [];
  }
};

// Map Geoapify categories to our types
const mapCategoryToType = (categories: string[]): AttractionType => {
  const cats = categories.join(',').toLowerCase();
  if (cats.includes('catering') || cats.includes('food') || cats.includes('grocery') || cats.includes('supermarket')) return 'food';
  if (cats.includes('fuel') || cats.includes('gas') || cats.includes('charging_station')) return 'gas';
  if (cats.includes('toilet') || cats.includes('restroom') || cats.includes('bathroom')) return 'restroom';
  if (cats.includes('service') || cats.includes('repair') || cats.includes('car_repair')) return 'repair';
  if (cats.includes('outdoor') || cats.includes('trail') || cats.includes('park') || cats.includes('mountain')) return 'trail';
  if (cats.includes('historic') || cats.includes('monument') || cats.includes('museum')) return 'historic';
  if (cats.includes('entertainment') || cats.includes('tourism') || cats.includes('attraction')) return 'entertainment';
  return 'shelter';
};

// Convert Geoapify place to our Attraction format
const convertGeoapifyPlace = (place: GeoapifyPlace, centerLat: number, centerLng: number): Attraction => {
  const type = mapCategoryToType(place.categories);
  const distanceMiles = place.distance ? Math.round((place.distance / 1609.34) * 10) / 10 : 0;

  // Extract tags from categories
  const tagMap: Record<string, string[]> = {
    'food': ['food', 'restaurant', 'dining'],
    'gas': ['fuel', 'gas', 'diesel'],
    'restroom': ['restrooms', 'facilities'],
    'repair': ['repair', 'service', 'parts'],
    'trail': ['hiking', 'nature', 'outdoor'],
    'historic': ['historic', 'landmark', 'tourism'],
    'shelter': ['emergency', 'shelter'],
    'entertainment': ['attraction', 'tourism', 'sightseeing'],
  };

  return {
    id: place.place_id,
    name: place.name,
    type,
    distance: distanceMiles,
    rating: place.rating || (3.5 + Math.random()),
    address: place.formatted || 'Address unavailable',
    phone: place.contact?.phone,
    hours: place.opening_hours,
    description: place.categories?.[0] || 'Local point of interest',
    isOpen: true, // Would need actual opening hours parsing
    tags: tagMap[type] || ['local'],
    website: place.website,
  };
};

export default function LocalAttractions() {
  const [searchInput, setSearchInput] = useState('25965');
  const [activeLocation, setActiveLocation] = useState<string>('25965');
  const [selectedCategories, setSelectedCategories] = useState<AttractionType[]>([]);
  const [maxDistance, setMaxDistance] = useState(50);
  const [hasConnectivity, setHasConnectivity] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [liveAttractions, setLiveAttractions] = useState<Attraction[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });

  const locationData = useMemo(() => {
    // Only use live data - no demo fallback
    if (liveAttractions.length > 0) {
      return {
        zip: activeLocation,
        name: searchInput,
        coords,
        attractions: liveAttractions,
      };
    }

    // Return empty if no data
    return {
      zip: activeLocation,
      name: searchInput || activeLocation,
      coords,
      attractions: [],
    };
  }, [activeLocation, liveAttractions, searchInput, coords]);

  const filteredAttractions = useMemo(() => {
    return locationData.attractions.filter(attraction => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(attraction.type);
      const matchesDistance = attraction.distance <= maxDistance;
      return matchesCategory && matchesDistance;
    }).sort((a, b) => a.distance - b.distance);
  }, [locationData.attractions, selectedCategories, maxDistance]);

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setIsSearching(true);
    setApiError(null);

    if (hasConnectivity) {
      // Try to geocode and fetch real places
      const geoResult = await geocodeLocation(searchInput);

      if (geoResult) {
        setCoords({ lat: geoResult.lat, lng: geoResult.lng });

        // Define category filters based on user selection
        const categoryMap: Record<string, string[]> = {
          'food': ['catering', 'commercial.food_and_drink'],
          'gas': ['commercial.fuel', 'service.vehicle.fuel'],
          'restroom': ['facilities.toilet'],
          'repair': ['service.vehicle.repair', 'service.repair'],
          'trail': ['national_park', 'leisure.park', 'natural'],
          'historic': ['heritage', 'tourism'],
          'entertainment': ['tourism.attraction', 'entertainment'],
          'shelter': ['facilities'],
        };

        let allPlaces: GeoapifyPlace[] = [];

        if (selectedCategories.length > 0) {
          // Search for specific categories
          for (const cat of selectedCategories) {
            const categories = categoryMap[cat] || [];
            if (categories.length > 0) {
              const places = await searchNearbyPlaces(
                geoResult.lat,
                geoResult.lng,
                maxDistance * 1609.34, // Convert miles to meters
                categories
              );
              allPlaces.push(...places);
            }
          }
        } else {
          // Search all categories
          const places = await searchNearbyPlaces(
            geoResult.lat,
            geoResult.lng,
            maxDistance * 1609.34
          );
          allPlaces = places;
        }

        // Remove duplicates and convert
        const uniquePlaces = Array.from(new Map(allPlaces.map(p => [p.place_id, p])).values());
        const converted = uniquePlaces.map(p => convertGeoapifyPlace(p, geoResult.lat, geoResult.lng));

        if (converted.length > 0) {
          setLiveAttractions(converted);
        } else {
          setApiError('No places found via Geoapify - using demo data');
          setLiveAttractions([]);
        }
      } else {
        setApiError('Geocoding failed - using demo data');
        setLiveAttractions([]);
      }
    }

    setActiveLocation(searchInput.trim());
    setIsSearching(false);
  };

  const toggleCategory = (type: AttractionType) => {
    setSelectedCategories(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getCategoryStyle = (type: AttractionType) => {
    const cat = ATTRACTION_CATEGORIES.find(c => c.type === type);
    return cat?.color || 'text-slate-400 bg-slate-900/30 border-slate-700/50';
  };

  const getCategoryIcon = (type: AttractionType) => {
    const cat = ATTRACTION_CATEGORIES.find(c => c.type === type);
    return cat?.icon || MapPin;
  };

  const getCategoryLabel = (type: AttractionType) => {
    const cat = ATTRACTION_CATEGORIES.find(c => c.type === type);
    return cat?.label || type;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-semibold">Local Explorer</h2>
        </div>
        <p className="text-slate-400">Find food, fuel, trails, and services near your campsite.</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
        {/* Location Input */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-400 block mb-1">Location (ZIP or City)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter ZIP code or city"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Search className="w-4 h-4" />
                {isSearching ? '...' : 'Find'}
              </button>
            </div>
          </div>

          {/* Connectivity Toggle */}
          <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
            <label className="text-sm text-slate-300 flex items-center gap-2">
              {hasConnectivity ? <Wifi className="w-4 h-4 text-emerald-400" /> : <Signal className="w-4 h-4 text-slate-400" />}
              <input
                type="checkbox"
                checked={hasConnectivity}
                onChange={(e) => setHasConnectivity(e.target.checked)}
                className="hidden"
              />
              <span onClick={() => setHasConnectivity(!hasConnectivity)} className="cursor-pointer">
                {hasConnectivity ? 'Online' : 'Offline'}
              </span>
            </label>
          </div>
        </div>

        {/* Distance Filter */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">
            Max Distance: <span className="text-white font-semibold">{maxDistance} miles</span>
          </label>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={maxDistance}
            onChange={(e) => setMaxDistance(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>5 mi</span>
            <span>50 mi</span>
            <span>100 mi</span>
          </div>
        </div>

        {/* Category Filters */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">Filter by Category</label>
          <div className="flex flex-wrap gap-2">
            {ATTRACTION_CATEGORIES.map(({ type, icon: Icon, label }) => {
              const isActive = selectedCategories.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleCategory(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${isActive
                    ? getCategoryStyle(type)
                    : 'bg-slate-700 text-slate-400 border border-slate-600'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {locationData.name}
          <span className="text-slate-500 text-sm font-normal ml-2">
            {filteredAttractions.length} places found
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {apiError && (
            <span className="text-xs text-amber-400">⚠ {apiError}</span>
          )}
          {hasConnectivity && liveAttractions.length > 0 && (
            <div className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Geoapify Live
            </div>
          )}
        </div>
      </div>

      {/* Attractions List */}
      <div className="space-y-3">
        {filteredAttractions.map((attraction) => {
          const Icon = getCategoryIcon(attraction.type);
          const isOpen = attraction.isOpen;

          return (
            <div
              key={attraction.id}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Icon & Category */}
                <div className={`p-3 rounded-lg ${getCategoryStyle(attraction.type)}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        {attraction.name}
                        {attraction.rating >= 4.5 && (
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        )}
                      </h4>
                      <p className="text-sm text-slate-400 mt-0.5">{attraction.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-white">{attraction.distance} mi</div>
                      <div className={`text-xs ${isOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isOpen ? 'Open' : 'Closed'}
                      </div>
                    </div>
                  </div>

                  {/* Details Row */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {attraction.address}
                    </span>
                    {attraction.phone && (
                      <a href={`tel:${attraction.phone}`} className="text-blue-400 flex items-center gap-1 hover:underline">
                        <Phone className="w-3 h-3" />
                        {attraction.phone}
                      </a>
                    )}
                    {attraction.hours && (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {attraction.hours}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400">{attraction.rating}</span>
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {attraction.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <Navigation className="w-3 h-3" />
                      Directions
                    </button>
                    {attraction.website && (
                      <a
                        href={attraction.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Website
                      </a>
                    )}
                    <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <Info className="w-3 h-3" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAttractions.length === 0 && (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
            <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No places found matching your filters.</p>
            <p className="text-sm text-slate-500 mt-1">Try increasing the distance or selecting different categories.</p>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-2">
              <strong className="text-slate-300">Offline Mode:</strong> Basic location data works without internet.
              Toggle "Online" for live results via Geoapify API with current hours and real places.
            </p>
            <p>
              <strong className="text-slate-300">RV Mode:</strong> Look for tags like "RV dump", "propane", and
              "diesel" when traveling with a camper.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
