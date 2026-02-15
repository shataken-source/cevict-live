'use client';

/**
 * Nearby Smoking-Friendly Places
 * Location-based recommendations
 */

import { useState, useEffect } from 'react';

interface Place {
  id: string;
  name: string;
  type: 'bar' | 'restaurant' | 'lounge' | 'outdoor' | 'hotel' | 'casino';
  address: string;
  distance: string;
  rating: number;
  reviews: number;
  smokingPolicy: 'allowed' | 'designated' | 'outdoor-only' | 'vape-only';
  features: string[];
  verified: boolean;
}

export default function NearbyPlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Place['type']>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        fetchNearbyPlaces(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocationError('Unable to get your location. Please enable location services.');
        setLoading(false);
        setPlaces(getSamplePlaces());
      }
    );
  };

  const fetchNearbyPlaces = async (lat: number, lng: number) => {
    // Using sample data - API endpoint not implemented yet
    setPlaces(getSamplePlaces());
    setLoading(false);
  };

  const getSamplePlaces = (): Place[] => [
    {
      id: '1',
      name: 'The Smoking Room',
      type: 'lounge',
      address: '123 Main St, Atlanta, GA',
      distance: '0.3 mi',
      rating: 4.5,
      reviews: 127,
      smokingPolicy: 'allowed',
      features: ['Full Bar', 'Live Music', 'Outdoor Patio'],
      verified: true
    },
    {
      id: '2',
      name: 'Bourbon & Cigars',
      type: 'bar',
      address: '456 Oak Ave, Atlanta, GA',
      distance: '0.7 mi',
      rating: 4.8,
      reviews: 89,
      smokingPolicy: 'designated',
      features: ['Cigar Selection', 'Private Rooms', 'Happy Hour'],
      verified: true
    },
    {
      id: '3',
      name: 'Cloud Nine Vape Lounge',
      type: 'lounge',
      address: '789 Peach St, Atlanta, GA',
      distance: '1.2 mi',
      rating: 4.2,
      reviews: 56,
      smokingPolicy: 'vape-only',
      features: ['Vape Products', 'Gaming', 'WiFi'],
      verified: false
    },
    {
      id: '4',
      name: 'The Garden Terrace',
      type: 'outdoor',
      address: '321 Park Blvd, Atlanta, GA',
      distance: '1.5 mi',
      rating: 4.6,
      reviews: 203,
      smokingPolicy: 'outdoor-only',
      features: ['Restaurant', 'Pet Friendly', 'Parking'],
      verified: true
    },
  ];

  const getTypeIcon = (type: Place['type']) => {
    switch (type) {
      case 'bar': return '🍺';
      case 'restaurant': return '🍽️';
      case 'lounge': return '🛋️';
      case 'outdoor': return '🌳';
      case 'hotel': return '🏨';
      case 'casino': return '🎰';
      default: return '📍';
    }
  };

  const getPolicyBadge = (policy: Place['smokingPolicy']) => {
    switch (policy) {
      case 'allowed':
        return { text: 'Smoking Allowed', color: 'bg-green-500/20 text-green-600' };
      case 'designated':
        return { text: 'Designated Area', color: 'bg-blue-500/20 text-blue-600' };
      case 'outdoor-only':
        return { text: 'Outdoor Only', color: 'bg-yellow-500/20 text-yellow-600' };
      case 'vape-only':
        return { text: 'Vape Only', color: 'bg-purple-500/20 text-purple-600' };
    }
  };

  const filteredPlaces = filter === 'all'
    ? places
    : places.filter(p => p.type === filter);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Finding places near you...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
              📍
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Nearby Places</h2>
              <p className="text-sm text-slate-500">
                {userLocation ? 'Based on your location' : 'Enable location for better results'}
              </p>
            </div>
          </div>
          <button
            onClick={requestLocation}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'bar', 'restaurant', 'lounge', 'outdoor', 'casino'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {type === 'all' ? '🗺️ All' : `${getTypeIcon(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}`}
            </button>
          ))}
        </div>
      </div>

      {/* Location Error */}
      {locationError && (
        <div className="mx-6 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-yellow-800 text-sm">{locationError}</p>
        </div>
      )}

      {/* Places List */}
      <div className="divide-y divide-slate-100">
        {filteredPlaces.map(place => {
          const policy = getPolicyBadge(place.smokingPolicy);
          return (
            <div
              key={place.id}
              className="p-6 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                  {getTypeIcon(place.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{place.name}</h3>
                    {place.verified && (
                      <span className="text-blue-500" title="Verified">✓</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{place.address}</p>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${policy.color}`}>
                      {policy.text}
                    </span>
                    <span className="text-xs text-slate-400">{place.distance}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-medium text-slate-900">{place.rating}</span>
                      <span className="text-slate-400 text-sm">({place.reviews})</span>
                    </div>
                    <div className="flex gap-1">
                      {place.features.slice(0, 3).map(feature => (
                        <span
                          key={feature}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
        <a href="/submit-place" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          📝 Know a smoking-friendly place? Add it here!
        </a>
      </div>
    </div>
  );
}
