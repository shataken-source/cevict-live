'use client';

/**
 * Nearby Smoking-Friendly Places
 * Real data from Google Places API
 */

import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Star, Phone, Globe, Clock, Check, Navigation } from 'lucide-react';

type PlaceType = 'bar' | 'restaurant' | 'lounge' | 'outdoor' | 'hotel' | 'casino' | 'vape_shop' | 'smoke_shop' | 'hookah_lounge';
type SmokingPolicy = 'allowed' | 'designated' | 'outdoor-only' | 'vape-only';

interface Place {
  id: string;
  name: string;
  type: PlaceType;
  address: string;
  distance: string;
  rating: number;
  reviews: number;
  smokingPolicy: SmokingPolicy;
  features: string[];
  verified: boolean;
  phone?: string;
  website?: string;
  hours?: string[];
  lat?: number;
  lng?: number;
}

export default function NearbyPlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | PlaceType>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        fetchPlaces(loc.lat, loc.lng);
      },
      () => {
        setError('Location access denied. Using default location.');
        fetchPlaces(33.749, -84.388); // Atlanta fallback
      }
    );
  };

  const fetchPlaces = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/places/nearby?lat=${lat}&lng=${lng}&radius=5000`);
      
      if (res.ok) {
        const data = await res.json();
        setPlaces(data.places || []);
        setError(null);
      } else {
        setError('Failed to load places from database');
      }
    } catch {
      setError('Network error - places service unavailable');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaces = filter === 'all' 
    ? places 
    : places.filter(p => p.type === filter);

  const getIcon = (type: PlaceType) => {
    const icons: Record<PlaceType, string> = {
      bar: '🍺',
      restaurant: '🍽️',
      lounge: '🛋️',
      outdoor: '🌳',
      hotel: '🏨',
      casino: '🎰',
      vape_shop: '💨',
      smoke_shop: '🚬',
      hookah_lounge: '🪝'
    };
    return icons[type] || '📍';
  };

  const getPolicyBadge = (policy: SmokingPolicy) => {
    const badges: Record<SmokingPolicy, { text: string; color: string }> = {
      'allowed': { text: '✓ Smoking Allowed', color: 'bg-green-100 text-green-700' },
      'designated': { text: 'Designated Areas', color: 'bg-amber-100 text-amber-700' },
      'outdoor-only': { text: 'Outdoor Only', color: 'bg-blue-100 text-blue-700' },
      'vape-only': { text: 'Vape Products', color: 'bg-purple-100 text-purple-700' }
    };
    const badge = badges[policy];
    return <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.text}</span>;
  };

  const openDirections = (place: Place) => {
    if (place.lat && place.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Nearby Places</h3>
              <p className="text-sm text-slate-500">
                {userLocation ? 'Real places near you' : 'Showing local results'}
              </p>
            </div>
          </div>
          <button 
            onClick={getLocation}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title="Refresh location"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {(['all', 'smoke_shop', 'vape_shop', 'bar', 'lounge', 'hookah_lounge'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? '🗺️ All' : `${getIcon(f as PlaceType)} ${f.replace('_', ' ')}`}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">
            <div className="animate-pulse">Finding places near you...</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-amber-600 mb-2">⚠️ {error}</p>
            <button 
              onClick={() => userLocation ? fetchPlaces(userLocation.lat, userLocation.lng) : getLocation()}
              className="text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No places found in this area.</p>
            <p className="text-sm mt-2">Try adjusting filters or expanding your search radius.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlaces.slice(0, 6).map((place) => (
              <div key={place.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex gap-3">
                  <div className="text-3xl flex-shrink-0">{getIcon(place.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 truncate">{place.name}</h4>
                      {place.verified && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{place.address}</p>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {getPolicyBadge(place.smokingPolicy)}
                      <span className="text-sm text-slate-500">{place.distance} mi</span>
                      {place.rating > 0 && (
                        <span className="flex items-center gap-1 text-sm text-amber-600">
                          <Star className="w-4 h-4 fill-amber-400" />
                          {place.rating} ({place.reviews})
                        </span>
                      )}
                    </div>

                    {place.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {place.features.slice(0, 3).map((f, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 mt-3 text-sm">
                      {place.phone && (
                        <a href={`tel:${place.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                          <Phone className="w-4 h-4" /> Call
                        </a>
                      )}
                      {place.website && (
                        <a href={place.website} target="_blank" rel="noopener" className="flex items-center gap-1 text-blue-600 hover:underline">
                          <Globe className="w-4 h-4" /> Website
                        </a>
                      )}
                      <button 
                        onClick={() => openDirections(place)}
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Navigation className="w-4 h-4" /> Directions
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t text-center">
        <a href="/places" className="text-sm text-blue-600 hover:underline">
          View all places →
        </a>
      </div>
    </div>
  );
}
