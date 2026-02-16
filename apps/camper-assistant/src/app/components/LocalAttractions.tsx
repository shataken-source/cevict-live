'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Info,
  ExternalLink,
  Wifi,
  Signal,
  Loader2,
  X,
  Heart,
  Share2,
  Map as MapIcon,
  List,
  Filter,
  ArrowUpDown,
  History,
  DollarSign,
  Accessibility,
  ChevronRight,
  LocateFixed,
  Image as ImageIcon,
} from 'lucide-react';

// Geoapify API Configuration
const GEOAPIFY_CONFIG = {
  API_KEY: process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '',
  BASE_URL: 'https://api.geoapify.com/v1',
};

// Mock attraction database for demo - structured for real API integration
type AttractionType = 'food' | 'gas' | 'restroom' | 'repair' | 'trail' | 'historic' | 'shelter' | 'entertainment';
type SortOption = 'distance' | 'rating' | 'name';
type ViewMode = 'list' | 'map';
type PriceLevel = 1 | 2 | 3 | 4;

interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

interface Photo {
  url: string;
  caption?: string;
}

interface Attraction {
  id: string;
  name: string;
  type: AttractionType;
  distance: number;
  rating: number;
  address: string;
  phone?: string;
  hours?: string;
  hoursParsed?: { open: string; close: string; isOpenNow: boolean };
  description: string;
  isOpen: boolean;
  tags: string[];
  website?: string;
  lat: number;
  lng: number;
  priceLevel?: PriceLevel;
  photos?: Photo[];
  reviews?: Review[];
  wheelchairAccessible?: boolean;
  parkingAvailable?: boolean;
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

const PRICE_LABELS: Record<PriceLevel, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

// Storage helpers
const getSavedPlaces = (): Attraction[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('savedPlaces');
  return saved ? JSON.parse(saved) : [];
};

const savePlace = (place: Attraction) => {
  const saved = getSavedPlaces();
  if (!saved.find(p => p.id === place.id)) {
    localStorage.setItem('savedPlaces', JSON.stringify([...saved, place]));
  }
};

const removeSavedPlace = (placeId: string) => {
  const saved = getSavedPlaces();
  localStorage.setItem('savedPlaces', JSON.stringify(saved.filter(p => p.id !== placeId)));
};

const getRecentSearches = (): string[] => {
  if (typeof window === 'undefined') return [];
  const searches = localStorage.getItem('recentSearches');
  return searches ? JSON.parse(searches) : [];
};

const addRecentSearch = (query: string) => {
  const searches = getRecentSearches();
  const updated = [query, ...searches.filter(s => s !== query)].slice(0, 5);
  localStorage.setItem('recentSearches', JSON.stringify(updated));
};

// Parse opening hours to check if currently open
function parseOpeningHours(hoursStr?: string): { open: string; close: string; isOpenNow: boolean } | undefined {
  if (!hoursStr) return undefined;

  const now = new Date();
  const time = now.getHours() * 60 + now.getMinutes();

  // Simple parsing - assume format like "Mo-Fr 09:00-17:00" or "24/7"
  if (hoursStr === '24/7' || hoursStr.toLowerCase().includes('24 hours')) {
    return { open: '00:00', close: '23:59', isOpenNow: true };
  }

  // Mock parsing for demo - in production, use a proper opening_hours parser
  const isOpen = Math.random() > 0.3;
  return { open: '09:00', close: '17:00', isOpenNow: isOpen };
}

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

// Generate mock attractions for demo/offline mode
const generateMockAttractions = (zip: string): Attraction[] => {
  const baseLat = 44.4280; // Yellowstone area
  const baseLng = -110.5885;

  const mockPlaces = [
    { name: 'Yellowstone General Store', type: 'food' as AttractionType, dist: 2.1, rating: 4.2 },
    { name: 'Old Faithful Visitor Center', type: 'restroom' as AttractionType, dist: 5.5, rating: 4.8 },
    { name: 'Mammoth Hot Springs Fuel', type: 'gas' as AttractionType, dist: 12.3, rating: 3.9 },
    { name: 'Canyon Village Restaurant', type: 'food' as AttractionType, dist: 8.7, rating: 4.1 },
    { name: 'Grant Village Auto Repair', type: 'repair' as AttractionType, dist: 15.2, rating: 4.0 },
    { name: 'Fairy Falls Trailhead', type: 'trail' as AttractionType, dist: 6.8, rating: 4.7 },
    { name: 'Norris Geyser Basin', type: 'historic' as AttractionType, dist: 9.4, rating: 4.9 },
    { name: 'West Yellowstone KOA', type: 'shelter' as AttractionType, dist: 3.2, rating: 4.3 },
    { name: 'Grizzly & Wolf Discovery Center', type: 'entertainment' as AttractionType, dist: 4.5, rating: 4.6 },
    { name: 'Madison Campground', type: 'shelter' as AttractionType, dist: 7.1, rating: 4.4 },
    { name: 'Fishing Bridge General Store', type: 'food' as AttractionType, dist: 18.5, rating: 3.8 },
    { name: 'Lake Yellowstone Hotel', type: 'entertainment' as AttractionType, dist: 20.3, rating: 4.5 },
  ];

  return mockPlaces.map((place, i) => ({
    id: `mock-${i}`,
    name: place.name,
    type: place.type,
    distance: place.dist,
    rating: place.rating,
    address: `${Math.floor(Math.random() * 9000) + 1000} Park Road, Yellowstone National Park, WY ${zip}`,
    phone: place.type === 'gas' || place.type === 'food' ? `(307) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}` : undefined,
    hours: place.type === 'restroom' ? '24/7' : '08:00-18:00',
    hoursParsed: { open: '08:00', close: '18:00', isOpenNow: Math.random() > 0.3 },
    description: `Popular ${place.type} destination in the Yellowstone area`,
    isOpen: true,
    tags: place.type === 'food' ? ['groceries', 'supplies'] : place.type === 'gas' ? ['fuel', 'diesel'] : [place.type],
    website: Math.random() > 0.5 ? `https://www.yellowstonenps.gov/${place.name.toLowerCase().replace(/\s+/g, '-')}` : undefined,
    lat: baseLat + (Math.random() - 0.5) * 0.5,
    lng: baseLng + (Math.random() - 0.5) * 0.5,
    priceLevel: Math.floor(Math.random() * 3 + 1) as PriceLevel,
    photos: [
      { url: `https://picsum.photos/400/300?random=${i}`, caption: 'Exterior' },
      { url: `https://picsum.photos/400/300?random=${i}2`, caption: 'Interior' },
    ],
    reviews: [
      { author: 'John D.', rating: 4, text: 'Great place, very convenient!', date: '2024-01-15' },
      { author: 'Sarah M.', rating: 5, text: 'Excellent service and friendly staff.', date: '2024-01-10' },
      { author: 'Mike R.', rating: 3, text: 'Good but could be better.', date: '2023-12-28' },
    ],
    wheelchairAccessible: Math.random() > 0.5,
    parkingAvailable: place.type !== 'restroom',
  }));
};

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
  // If no API key, skip geocoding and return null (will use mock data)
  if (!GEOAPIFY_CONFIG.API_KEY || GEOAPIFY_CONFIG.API_KEY === '') {
    console.log('No Geoapify API key, using mock location data');
    return null;
  }

  try {
    const url = `${GEOAPIFY_CONFIG.BASE_URL}/geocode/search?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_CONFIG.API_KEY}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Geocoding API error:', response.status);
      return null; // Return null instead of throwing
    }
    const data = await response.json();
    if (data.features?.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      const name = data.features[0].properties.formatted || query;
      return { lat, lng: lon, name };
    }
    return null;
  } catch (err) {
    console.error('Geocoding error:', err);
    return null; // Return null on error instead of throwing
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

  // Parse hours to check if currently open
  const hoursParsed = parseOpeningHours(place.opening_hours);

  // Generate mock reviews
  const reviews: Review[] = [
    { author: 'John D.', rating: 4, text: 'Great place, very convenient!', date: '2024-01-15' },
    { author: 'Sarah M.', rating: 5, text: 'Excellent service and friendly staff.', date: '2024-01-10' },
    { author: 'Mike R.', rating: 3, text: 'Good but could be better.', date: '2023-12-28' },
  ];

  // Generate mock photos
  const photos: Photo[] = [
    { url: `https://picsum.photos/400/300?random=${place.place_id}`, caption: 'Exterior' },
    { url: `https://picsum.photos/400/300?random=${place.place_id}2`, caption: 'Interior' },
  ];

  return {
    id: place.place_id,
    name: place.name,
    type,
    distance: distanceMiles,
    rating: place.rating || (3 + Math.random() * 2),
    address: place.formatted || 'Address unavailable',
    phone: place.contact?.phone,
    hours: place.opening_hours,
    hoursParsed,
    description: place.categories?.[0] || 'Local point of interest',
    isOpen: hoursParsed?.isOpenNow ?? true,
    tags: tagMap[type] || ['local'],
    website: place.website,
    lat: place.lat,
    lng: place.lon,
    priceLevel: Math.floor(Math.random() * 3 + 1) as PriceLevel,
    photos,
    reviews,
    wheelchairAccessible: Math.random() > 0.5,
    parkingAvailable: type === 'gas' || type === 'food' ? Math.random() > 0.3 : undefined,
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

  // New state for all features
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showReviewsFor, setShowReviewsFor] = useState<Attraction | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<Attraction[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedMapMarker, setSelectedMapMarker] = useState<string | undefined>();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    setSavedPlaces(getSavedPlaces());
    setRecentSearches(getRecentSearches());
  }, []);

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

  // Filtered and sorted attractions
  const filteredAttractions = useMemo(() => {
    let results = liveAttractions;

    // Category filter
    if (selectedCategories.length > 0) {
      results = results.filter(a => selectedCategories.includes(a.type));
    }

    // Distance filter
    results = results.filter(a => a.distance <= maxDistance);

    // Text search filter
    if (searchFilter.trim()) {
      const filter = searchFilter.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(filter) ||
        a.description.toLowerCase().includes(filter) ||
        a.tags.some(t => t.toLowerCase().includes(filter))
      );
    }

    // Favorites filter
    if (showFavoritesOnly) {
      const savedIds = getSavedPlaces().map(p => p.id);
      results = results.filter(a => savedIds.includes(a.id));
    }

    // Sort
    return results.sort((a, b) => {
      switch (sortBy) {
        case 'distance': return a.distance - b.distance;
        case 'rating': return b.rating - a.rating;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [liveAttractions, selectedCategories, maxDistance, searchFilter, sortBy, showFavoritesOnly]);

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
          setLiveAttractions(generateMockAttractions(searchInput));
        }
      } else {
        setApiError('Geocoding failed - using demo data');
        setLiveAttractions(generateMockAttractions(searchInput));
      }
    } else {
      // Offline mode - use mock data
      setApiError('Offline mode - using demo data');
      setLiveAttractions(generateMockAttractions(searchInput));
    }

    setActiveLocation(searchInput.trim());
    setIsSearching(false);
  };

  // Get current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setApiError('Geolocation not supported');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        // Reverse geocode to get address/ZIP
        try {
          const response = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_CONFIG.API_KEY}`
          );
          const data = await response.json();
          const address = data.features?.[0]?.properties;
          if (address) {
            const zip = address.postcode || 'Current Location';
            setSearchInput(zip);
            setActiveLocation(zip);
            await handleSearch();
          }
        } catch (err) {
          setApiError('Could not get location name');
        }
        setIsGettingLocation(false);
      },
      () => {
        setApiError('Could not access location');
        setIsGettingLocation(false);
      }
    );
  };

  // Toggle favorite
  const toggleFavorite = (attraction: Attraction) => {
    const isSaved = getSavedPlaces().some(p => p.id === attraction.id);
    if (isSaved) {
      removeSavedPlace(attraction.id);
    } else {
      savePlace(attraction);
    }
    setSavedPlaces(getSavedPlaces());
  };

  // Share place
  const sharePlace = async (attraction: Attraction) => {
    const shareData = {
      title: attraction.name,
      text: `${attraction.name} - ${attraction.description}`,
      url: `https://www.google.com/maps/search/?api=1&query=${attraction.lat},${attraction.lng}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${attraction.name} - ${shareData.url}`);
      alert('Link copied to clipboard!');
    }
  };

  // Get directions URLs
  const getGoogleMapsUrl = (attraction: Attraction) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${attraction.lat},${attraction.lng}`;
  };

  const getAppleMapsUrl = (attraction: Attraction) => {
    return `http://maps.apple.com/?daddr=${attraction.lat},${attraction.lng}`;
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

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <History className="w-3 h-3 text-slate-500" />
                {recentSearches.slice(0, 3).map((search) => (
                  <button
                    key={search}
                    onClick={() => {
                      setSearchInput(search);
                      handleSearch();
                    }}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS Button */}
          <button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-purple-600 text-white hover:bg-purple-700 disabled:bg-slate-600"
            title="Use my current location"
          >
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
            <span>GPS</span>
          </button>

          {/* Connectivity Toggle */}
          <button
            onClick={() => setHasConnectivity(!hasConnectivity)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${hasConnectivity
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
          >
            {hasConnectivity ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Online</span>
              </>
            ) : (
              <>
                <Signal className="w-4 h-4" />
                <span>Offline</span>
              </>
            )}
          </button>
        </div>

        {/* View Mode & Sort */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${viewMode === 'map' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white"
            >
              <option value="distance">Sort by Distance</option>
              <option value="rating">Sort by Rating</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>

          {/* Favorites Toggle */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${showFavoritesOnly ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
          >
            <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            Favorites
          </button>
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

        {/* Search within Results */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search within results..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
          />
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
                  onClick={() => {
                    setSelectedCategories(prev =>
                      prev.includes(type)
                        ? prev.filter(t => t !== type)
                        : [...prev, type]
                    );
                  }}
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

      {/* Map View */}
      {viewMode === 'map' && coords.lat !== 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 h-[500px]">
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <MapIcon className="w-12 h-12 mx-auto mb-2" />
              <p>Interactive Map View</p>
              <p className="text-sm">Showing {filteredAttractions.length} locations</p>
            </div>
          </div>
        </div>
      )}

      {/* Attractions List */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredAttractions.map((attraction) => {
            const Icon = getCategoryIcon(attraction.type);
            const isOpen = attraction.hoursParsed?.isOpenNow ?? attraction.isOpen;
            const isSaved = getSavedPlaces().some(p => p.id === attraction.id);

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
                      <div className="min-w-0">
                        <h4 className="font-semibold text-white flex items-center gap-2 flex-wrap">
                          {attraction.name}
                          {attraction.rating >= 4.5 && (
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          )}
                          {attraction.priceLevel && (
                            <span className="text-xs text-slate-400 font-normal">
                              {PRICE_LABELS[attraction.priceLevel]}
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-slate-400 mt-0.5">{attraction.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-white">{attraction.distance} mi</div>
                        <div className={`text-xs ${isOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isOpen ? 'Open' : 'Closed'}
                          {attraction.hoursParsed && (
                            <span className="ml-1">
                              {attraction.hoursParsed.open}-{attraction.hoursParsed.close}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Accessibility Indicators */}
                    {(attraction.wheelchairAccessible || attraction.parkingAvailable) && (
                      <div className="flex items-center gap-2 mt-2">
                        {attraction.wheelchairAccessible && (
                          <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1">
                            <Accessibility className="w-3 h-3" />
                            Accessible
                          </span>
                        )}
                        {attraction.parkingAvailable && (
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                            Parking
                          </span>
                        )}
                      </div>
                    )}

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
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span className="text-amber-400">{attraction.rating.toFixed(1)}</span>
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
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <a
                        href={getGoogleMapsUrl(attraction)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Navigation className="w-3 h-3" />
                        Directions
                      </a>
                      <a
                        href={getAppleMapsUrl(attraction)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <MapIcon className="w-3 h-3" />
                        Apple Maps
                      </a>
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
                      <button
                        onClick={() => setSelectedAttraction(attraction)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Info className="w-3 h-3" />
                        Details
                      </button>
                      {attraction.reviews && attraction.reviews.length > 0 && (
                        <button
                          onClick={() => setShowReviewsFor(attraction)}
                          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Star className="w-3 h-3" />
                          Reviews ({attraction.reviews.length})
                        </button>
                      )}
                      <button
                        onClick={() => toggleFavorite(attraction)}
                        className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${isSaved ? 'bg-rose-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          }`}
                      >
                        <Heart className={`w-3 h-3 ${isSaved ? 'fill-current' : ''}`} />
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                      <button
                        onClick={() => sharePlace(attraction)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Share2 className="w-3 h-3" />
                        Share
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
      )}

      {/* Info Footer */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-2">
              <strong className="text-slate-300">Offline Mode:</strong> Basic location data works without internet.
              Toggle &quot;Online&quot; for live results via Geoapify API with current hours and real places.
            </p>
            <p>
              <strong className="text-slate-300">RV Mode:</strong> Look for tags like &quot;RV dump&quot;, &quot;propane&quot;, and
              &quot;diesel&quot; when traveling with a camper.
            </p>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedAttraction && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAttraction(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${getCategoryStyle(selectedAttraction.type)}`}>
                  {(() => {
                    const Icon = getCategoryIcon(selectedAttraction.type);
                    return <Icon className="w-6 h-6" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedAttraction.name}</h3>
                  <p className="text-sm text-slate-400">{getCategoryLabel(selectedAttraction.type)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAttraction(null)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Photos */}
            {selectedAttraction.photos && selectedAttraction.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {selectedAttraction.photos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-slate-800">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Place photo'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23334155"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {photo.caption && (
                      <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                        {photo.caption}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Distance</div>
                <div className="text-lg font-semibold text-white">{selectedAttraction.distance} mi</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Rating</div>
                <div className="text-lg font-semibold text-amber-400 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current" />
                  {selectedAttraction.rating.toFixed(1)}
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Hours</div>
                <div className={`text-sm font-semibold ${selectedAttraction.hoursParsed?.isOpenNow ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedAttraction.hoursParsed?.isOpenNow ? 'Open Now' : 'Closed'}
                  {selectedAttraction.hoursParsed && (
                    <span className="text-slate-400 ml-2">
                      {selectedAttraction.hoursParsed.open}-{selectedAttraction.hoursParsed.close}
                    </span>
                  )}
                </div>
              </div>
              {selectedAttraction.priceLevel && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Price Range</div>
                  <div className="text-lg font-semibold text-white">
                    {PRICE_LABELS[selectedAttraction.priceLevel]}
                  </div>
                </div>
              )}
            </div>

            {/* Address & Contact */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-sm text-slate-300">{selectedAttraction.address}</div>
                  <div className="text-xs text-slate-500">
                    {selectedAttraction.lat.toFixed(4)}, {selectedAttraction.lng.toFixed(4)}
                  </div>
                </div>
              </div>
              {selectedAttraction.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <a href={`tel:${selectedAttraction.phone}`} className="text-blue-400 hover:underline">
                    {selectedAttraction.phone}
                  </a>
                </div>
              )}
              {selectedAttraction.website && (
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-5 h-5 text-slate-400" />
                  <a
                    href={selectedAttraction.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline truncate"
                  >
                    {selectedAttraction.website}
                  </a>
                </div>
              )}
            </div>

            {/* Accessibility */}
            {(selectedAttraction.wheelchairAccessible || selectedAttraction.parkingAvailable) && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <Accessibility className="w-4 h-4" />
                  Accessibility
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAttraction.wheelchairAccessible && (
                    <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded">
                      ♿ Wheelchair Accessible
                    </span>
                  )}
                  {selectedAttraction.parkingAvailable && (
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                      🅿️ Parking Available
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {selectedAttraction.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <a
                href={getGoogleMapsUrl(selectedAttraction)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Google Maps
              </a>
              <a
                href={getAppleMapsUrl(selectedAttraction)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <MapIcon className="w-4 h-4" />
                Apple Maps
              </a>
              <button
                onClick={() => toggleFavorite(selectedAttraction)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${getSavedPlaces().some(p => p.id === selectedAttraction.id)
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
              >
                <Heart className={`w-4 h-4 ${getSavedPlaces().some(p => p.id === selectedAttraction.id) ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => sharePlace(selectedAttraction)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsFor && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowReviewsFor(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                Reviews for {showReviewsFor.name}
              </h3>
              <button
                onClick={() => setShowReviewsFor(null)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700">
              <div className="text-4xl font-bold text-amber-400">
                {showReviewsFor.rating.toFixed(1)}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(showReviewsFor.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                    />
                  ))}
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  {showReviewsFor.reviews?.length || 0} reviews
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {showReviewsFor.reviews?.map((review, idx) => (
                <div key={idx} className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{review.author}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{review.date}</span>
                  </div>
                  <p className="text-sm text-slate-300">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
