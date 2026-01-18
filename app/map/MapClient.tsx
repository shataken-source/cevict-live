'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { ALL_STATES } from '@/lib/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { MapPin, Filter, Navigation, Search, X, Phone, Globe } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon paths in bundlers
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const PLACE_CATEGORIES = {
  lounge: 'Smoking Lounge',
  patio: 'Restaurant/Bar Patio',
  hotel: 'Hotel (Smoking Rooms)',
  bar: 'Bar/Nightclub',
  restaurant: 'Restaurant',
  shop: 'Vape/Tobacco Shop',
  other: 'Other',
};

const CATEGORY_COLORS = {
  lounge: 'bg-purple-100 text-purple-800',
  patio: 'bg-green-100 text-green-800',
  hotel: 'bg-blue-100 text-blue-800',
  bar: 'bg-red-100 text-red-800',
  restaurant: 'bg-orange-100 text-orange-800',
  shop: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
};

const AMENITY_ICONS = {
  outdoor_seating: '🌿',
  covered: '☂️',
  food: '🍽️',
  drinks: '🍺',
  valet: '🚗',
  music: '🎵',
  tv: '📺',
  wifi: '📶',
};

interface DirectoryPlace {
  id: string;
  name: string;
  address: string;
  city: string;
  state_code: string;
  category: string;
  description?: string;
  notes?: string;
  website_url?: string;
  phone?: string;
  age_restriction: 'none' | '18+' | '21+';
  amenities: string[];
  coordinates?: any;
  source_url: string;
  submitted_at: string;
}

export default function MapClient() {
  const [places, setPlaces] = useState<DirectoryPlace[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<DirectoryPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<DirectoryPlace | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 30.2949, lng: -87.7435 }); // Gulf Shores
  const [mapZoom, _setMapZoom] = useState(10);

  // Filter states
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [radius, setRadius] = useState([50]); // miles
  const [showFilters, setShowFilters] = useState(false);

  const _mapRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadPlaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterPlaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, selectedState, selectedCategories, searchTerm, radius]);

  const loadPlaces = async () => {
    try {
      setLoading(true);
      if (!supabase) throw new Error('Supabase client not available');
      const client = supabase as NonNullable<typeof supabase>;

      const { data, error } = await client
        .from('sr_directory_places')
        .select('*')
        .eq('status', 'verified')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaces(data || []);
    } catch (error) {
      console.error('Error loading places:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlaces = () => {
    let filtered = [...places];

    if (selectedState) {
      filtered = filtered.filter((place) => place.state_code === selectedState);
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((place) => selectedCategories.includes(place.category));
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (place) =>
          place.name.toLowerCase().includes(searchLower) ||
          place.city.toLowerCase().includes(searchLower) ||
          place.description?.toLowerCase().includes(searchLower) ||
          place.address.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPlaces(filtered);
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    setSelectedCategories((prev) => (checked ? [...prev, category] : prev.filter((c) => c !== category)));
  };

  const getDirections = (place: DirectoryPlace) => {
    const address = encodeURIComponent(`${place.address}, ${place.city}, ${place.state_code}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
  };

  const renderMap = () => {
    const markers = filteredPlaces
      .map((p) => ({ place: p, coords: normalizePoint(p.coordinates) }))
      .filter((x) => !!x.coords) as { place: DirectoryPlace; coords: { lat: number; lng: number } }[];

    return (
      <div className="relative bg-slate-100 rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={mapZoom} scrollWheelZoom style={{ height: '600px', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {markers.map(({ place, coords }) => (
            <Marker
              key={place.id}
              position={[coords.lat, coords.lng]}
              eventHandlers={{
                click: () => setSelectedPlace(place),
              }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700 }}>{place.name}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    {place.city}, {place.state_code}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>{place.address}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Smoker-Friendly Places Map</h1>
              <p className="text-slate-600">Discover smoking and vaping-friendly locations across all 50 states</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" />
                Filters {selectedCategories.length > 0 && `(${selectedCategories.length})`}
              </Button>
              <Button asChild>
                <Link href="/submit-place">
                  <MapPin className="w-4 h-4 mr-2" />
                  Add Place
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showFilters && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filter Places</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search places, cities, addresses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All States</SelectItem>
                    {ALL_STATES.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Categories</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(PLACE_CATEGORIES).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={selectedCategories.includes(key)}
                        onCheckedChange={(checked) => handleCategoryToggle(key, checked as boolean)}
                      />
                      <label htmlFor={key} className="text-sm font-medium leading-none">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Search Radius: {radius[0]} miles</label>
                <Slider value={radius} onValueChange={setRadius} max={200} min={5} step={5} className="w-full" />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedState('');
                    setSelectedCategories([]);
                    setSearchTerm('');
                    setRadius([50]);
                  }}
                >
                  Clear All Filters
                </Button>
                <div className="text-sm text-slate-600 flex items-center">
                  Showing {filteredPlaces.length} of {places.length} places
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{renderMap()}</div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Places ({filteredPlaces.length})</h2>
              <Button variant="outline" size="sm" onClick={() => setMapCenter({ lat: 30.2949, lng: -87.7435 })}>
                <Navigation className="w-4 h-4 mr-1" />
                Reset View
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-slate-600">Loading places...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredPlaces.map((place) => (
                  <Card
                    key={place.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedPlace?.id === place.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedPlace(place)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-slate-900">{place.name}</h3>
                        <Badge className={CATEGORY_COLORS[place.category as keyof typeof CATEGORY_COLORS]}>
                          {PLACE_CATEGORIES[place.category as keyof typeof PLACE_CATEGORIES]}
                        </Badge>
                      </div>

                      <div className="text-sm text-slate-600 mb-2">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {place.address}, {place.city}, {place.state_code}
                      </div>

                      {place.description && <p className="text-sm text-slate-700 mb-2 line-clamp-2">{place.description}</p>}

                      {place.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {place.amenities.slice(0, 4).map((amenity) => (
                            <span key={amenity} className="text-xs" title={amenity}>
                              {AMENITY_ICONS[amenity as keyof typeof AMENITY_ICONS] || '•'}
                            </span>
                          ))}
                          {place.amenities.length > 4 && (
                            <span className="text-xs text-slate-500">+{place.amenities.length - 4} more</span>
                          )}
                        </div>
                      )}

                      {place.age_restriction !== 'none' && (
                        <Badge variant="outline" className="text-xs mb-2">
                          {place.age_restriction}+ Only
                        </Badge>
                      )}

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            getDirections(place);
                          }}
                        >
                          <Navigation className="w-3 h-3 mr-1" />
                          Directions
                        </Button>
                        {place.website_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(place.website_url, '_blank');
                            }}
                          >
                            <Globe className="w-3 h-3 mr-1" />
                            Website
                          </Button>
                        )}
                        {place.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${place.phone}`, '_blank');
                            }}
                          >
                            <Phone className="w-3 h-3 mr-1" />
                            Call
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredPlaces.length === 0 && (
                  <div className="text-center py-8">
                    <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No places found</h3>
                    <p className="text-slate-600 mb-4">Try adjusting your filters or search terms</p>
                    <Button asChild>
                      <Link href="/submit-place">Submit the first place</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizePoint(value: any): { lat: number; lng: number } | null {
  if (!value) return null;

  // Supabase Postgres point can come back as "(lng,lat)" or {x,y} or { latitude, longitude }
  if (typeof value === 'string') {
    const m = value.match(/\(?\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*\)?/);
    if (!m) return null;
    const x = Number(m[1]);
    const y = Number(m[3]);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    // Assume Postgres point: (x,y) = (lng,lat)
    return { lat: y, lng: x };
  }

  if (typeof value === 'object') {
    if (typeof value.lat === 'number' && typeof value.lng === 'number') return { lat: value.lat, lng: value.lng };
    if (typeof value.latitude === 'number' && typeof value.longitude === 'number') return { lat: value.latitude, lng: value.longitude };
    if (typeof value.x === 'number' && typeof value.y === 'number') return { lat: value.y, lng: value.x };
  }

  return null;
}

