'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { 
  MapPin, 
  Filter, 
  Navigation, 
  Search, 
  X, 
  ExternalLink, 
  Phone, 
  Globe,
  Star,
  Clock,
  Users
} from 'lucide-react';
import Link from 'next/link';

const SOUTHEAST_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'FL', name: 'Florida' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'GA', name: 'Georgia' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'SC', name: 'South Carolina' },
];

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
  coordinates?: { lat: number; lng: number };
  source_url: string;
  submitted_at: string;
}

export default function MapView() {
  const [places, setPlaces] = useState<DirectoryPlace[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<DirectoryPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<DirectoryPlace | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 30.2949, lng: -87.7435 }); // Gulf Shores
  const [mapZoom, setMapZoom] = useState(10);
  
  // Filter states
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [radius, setRadius] = useState([50]); // miles
  const [showFilters, setShowFilters] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadPlaces();
  }, []);

  useEffect(() => {
    filterPlaces();
  }, [places, selectedState, selectedCategories, searchTerm, radius]);

  const loadPlaces = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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

    // Filter by state
    if (selectedState) {
      filtered = filtered.filter(place => place.state_code === selectedState);
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(place => selectedCategories.includes(place.category));
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(place => 
        place.name.toLowerCase().includes(searchLower) ||
        place.city.toLowerCase().includes(searchLower) ||
        place.description?.toLowerCase().includes(searchLower) ||
        place.address.toLowerCase().includes(searchLower)
      );
    }

    // Filter by radius (if we had user location)
    // This would require geolocation API integration

    setFilteredPlaces(filtered);
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    setSelectedCategories(prev => 
      checked 
        ? [...prev, category]
        : prev.filter(c => c !== category)
    );
  };

  const getDirections = (place: DirectoryPlace) => {
    const address = encodeURIComponent(`${place.address}, ${place.city}, ${place.state_code}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
  };

  const renderMap = () => {
    // This is a placeholder for the actual map implementation
    // In production, you'd integrate with Mapbox, Google Maps, or Leaflet
    return (
      <div className="relative bg-slate-100 rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Interactive Map</h3>
            <p className="text-slate-600 mb-4">Map integration coming soon</p>
            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
              {filteredPlaces.slice(0, 6).map((place, index) => (
                <div key={place.id} className="bg-white p-2 rounded border text-xs">
                  <div className="font-medium truncate">{place.name}</div>
                  <div className="text-slate-500">{place.city}, {place.state_code}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Map controls overlay */}
        <div className="absolute top-4 left-4 z-10">
          <Card className="w-64">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Map Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium">Center: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}</label>
              </div>
              <div>
                <label className="text-xs font-medium">Zoom: {mapZoom}</label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setMapZoom(Math.max(1, mapZoom - 1))}>
                  -
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMapZoom(Math.min(20, mapZoom + 1))}>
                  +
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Smoker-Friendly Places Map</h1>
              <p className="text-slate-600">Discover smoking and vaping-friendly locations across the Southeast</p>
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
        {/* Filters Panel */}
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
              {/* Search */}
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

              {/* State Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All States</SelectItem>
                    {SOUTHEAST_STATES.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filters */}
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
                      <label htmlFor={key} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radius Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Radius: {radius[0]} miles
                </label>
                <Slider
                  value={radius}
                  onValueChange={setRadius}
                  max={200}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Clear Filters */}
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            {renderMap()}
          </div>

          {/* Places List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Places ({filteredPlaces.length})
              </h2>
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
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedPlace?.id === place.id ? 'ring-2 ring-primary' : ''
                    }`}
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

                      {place.description && (
                        <p className="text-sm text-slate-700 mb-2 line-clamp-2">{place.description}</p>
                      )}

                      {/* Amenities */}
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

                      {/* Age Restriction */}
                      {place.age_restriction !== 'none' && (
                        <Badge variant="outline" className="text-xs mb-2">
                          {place.age_restriction}+ Only
                        </Badge>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          getDirections(place);
                        }}>
                          <Navigation className="w-3 h-3 mr-1" />
                          Directions
                        </Button>
                        {place.website_url && (
                          <Button size="sm" variant="outline" onClick={(e) => {
                            e.stopPropagation();
                            window.open(place.website_url, '_blank');
                          }}>
                            <Globe className="w-3 h-3 mr-1" />
                            Website
                          </Button>
                        )}
                        {place.phone && (
                          <Button size="sm" variant="outline" onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${place.phone}`, '_blank');
                          }}>
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
