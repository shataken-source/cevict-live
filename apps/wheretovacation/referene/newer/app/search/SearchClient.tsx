"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import WhyThisDestination, { generateDestinationReasons } from '@/components/WhyThisDestination';
import { usePreferences } from '@/lib/preferences';
import { getSeasonalityInfo } from '@/lib/seasonality';
import { vacationProperties, destinations } from '@/lib/vacation-data';

export default function SearchClient() {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 5000 });
  const [guestCount, setGuestCount] = useState(1);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('recommended');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Load user preferences for personalization
  const { preferences, trackSearch, trackView, isFavorite, toggleFavorite } = usePreferences();

  const activities = [
    { id: 'surfing', name: 'Surfing & Watersports', icon: '🏄', description: 'Surfing, kayaking, paddleboarding, snorkeling', season: 'summer' },
    { id: 'fishing', name: 'Fishing Adventures', icon: '🎣', description: 'Deep sea, fly fishing, lake fishing, charters', season: 'all' },
    { id: 'mountain', name: 'Mountain & Hiking', icon: '🏔️', description: 'Hiking, climbing, camping, wildlife', season: 'summer' },
    { id: 'beach', name: 'Beach & Relaxation', icon: '🏖️', description: 'Beaches, resorts, islands, spa', season: 'summer' },
    { id: 'skiing', name: 'Winter Sports', icon: '🎿', description: 'Skiing, snowboarding, ice climbing, resorts', season: 'winter' },
    { id: 'cultural', name: 'Cultural & Heritage', icon: '🏛️', description: 'Museums, historical sites, local tours, events', season: 'all' },
    { id: 'diving', name: 'Scuba Diving', icon: '🤿', description: 'Scuba, snorkeling, underwater exploration', season: 'summer' },
    { id: 'golf', name: 'Golf Courses', icon: '⛳', description: 'Championship courses, driving ranges, resorts', season: 'all' },
    { id: 'wildlife', name: 'Wildlife Safari', icon: '🦁', description: 'Safari tours, wildlife viewing, nature reserves', season: 'all' },
    { id: 'adventure', name: 'Adventure Sports', icon: '🪂', description: 'Zip lining, rock climbing, extreme sports', season: 'all' },
    { id: 'food', name: 'Food & Wine', icon: '🍷', description: 'Wine tours, cooking classes, culinary experiences', season: 'all' },
    { id: 'wellness', name: 'Wellness & Spa', icon: '🧘', description: 'Spa resorts, yoga retreats, wellness centers', season: 'all' },
    { id: 'sailing', name: 'Sailing & Boating', icon: '⛵', description: 'Yacht charters, sailing lessons, boat tours', season: 'summer' },
    { id: 'photography', name: 'Photography Tours', icon: '📷', description: 'Landscape, wildlife, cultural photography tours', season: 'all' },
    { id: 'festivals', name: 'Festivals & Events', icon: '🎉', description: 'Music festivals, cultural events, celebrations', season: 'all' }
  ];

  const amenities = [
    'WiFi', 'Kitchen', 'Parking', 'Pool', 'Hot Tub', 'Air Conditioning',
    'Heating', 'Washer/Dryer', 'TV', 'BBQ Grill', 'Fireplace', 'Gym',
    'Beach Access', 'Mountain View', 'Ocean View', 'Pet Friendly', 'Free Breakfast'
  ];

  // Personalized search based on user preferences using real data
  const handleSearch = () => {
    if (selectedActivities.length === 0) return;
    
    let results = vacationProperties.filter(property => {
      // Check if property has selected activities
      const hasActivities = selectedActivities.some(activity => 
        property.activities.some(act => act.id === activity)
      );
      
      // Check destination filter
      const matchesDestination = !selectedDestination || property.destination.toLowerCase().includes(selectedDestination);
      
      // Check amenities filter
      const hasAmenities = selectedAmenities.length === 0 || 
        selectedAmenities.every(amenity => property.amenities.includes(amenity));
      
      return hasActivities && matchesDestination && hasAmenities;
    }).map(property => {
      const seasonality = getSeasonalityInfo(property.destination.toLowerCase());
      const reasons = generateDestinationReasons(property.destination, {
        budget: preferences.budget,
        travelStyle: preferences.travelStyle,
        weatherPreference: preferences.weatherPreference,
        month: selectedDate ? new Date(selectedDate).getMonth() + 1 : undefined,
      });
      
      return {
        ...property,
        seasonality,
        reasons,
        isFavorite: isFavorite(property.id),
      };
    });

    // Apply price and guest filters
    results = results.filter(result => 
      result.price >= priceRange.min && result.price <= priceRange.max &&
      result.guests >= guestCount
    );

    // Apply sorting with personalization
    const defaultSort = preferences.defaultSortBy || 'recommended';
    const sortToUse = sortBy === 'recommended' ? defaultSort : sortBy;
    
    switch(sortToUse) {
      case 'price-low':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
        break;
      case 'seasonality':
        results.sort((a, b) => {
          const aScore = a.seasonality ? getPriceMultiplier(a.seasonality, new Date().getMonth() + 1) : 1;
          const bScore = b.seasonality ? getPriceMultiplier(b.seasonality, new Date().getMonth() + 1) : 1;
          return aScore - bScore;
        });
        break;
    }
    
    setSearchResults(results);
    
    // Track search for personalization
    if (selectedDestination) {
      trackSearch(selectedDestination);
    }
  };

  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev => 
      prev.includes(activityId) 
        ? prev.filter(a => a !== activityId)
        : [...prev, activityId]
    );
  };

  const toggleAmenity = (amenity) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleDestinationClick = (destinationId) => {
    trackView(destinationId);
  };

  const handleFavoriteToggle = (destinationId, e) => {
    e.stopPropagation();
    toggleFavorite(destinationId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Personalization */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Search by Activity
          </h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Find your perfect vacation by choosing what you love to do, not where you want to go.
            {preferences.enablePersonalization && (
              <span className="block text-sm mt-2 text-cyan-300">
                Personalized for your {preferences.travelStyle} style, {preferences.budget} budget
              </span>
            )}
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Advanced Search</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Activity Selection - À La Carte Checkboxes */}
            <div>
              <label className="block text-white font-medium mb-3">Choose Your Activities (À La Carte)</label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activities.map((activity) => (
                  <label
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedActivities.includes(activity.id)}
                      onChange={() => toggleActivity(activity.id)}
                      className="w-4 h-4 text-cyan-500 bg-white/10 border-white/20 rounded focus:ring-cyan-400 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{activity.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-white">{activity.name}</div>
                          <div className="text-sm opacity-75 text-blue-200">{activity.description}</div>
                          <div className="text-xs mt-1">
                            <span className={`px-2 py-1 rounded ${
                              activity.season === 'summer' ? 'bg-yellow-500/20 text-yellow-300' :
                              activity.season === 'winter' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-green-500/20 text-green-300'
                            }`}>
                              {activity.season === 'summer' ? '☀️ Summer' :
                               activity.season === 'winter' ? '❄️ Winter' : '🌍 All Season'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-3 text-sm text-blue-200">
                {selectedActivities.length} activities selected
                {selectedActivities.length > 0 && (
                  <button
                    onClick={() => setSelectedActivities([])}
                    className="ml-2 text-cyan-300 hover:text-cyan-200 underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Basic Search Options */}
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">Destination (Optional)</label>
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">Any destination</option>
                  {destinations.map((dest) => (
                    <option key={dest.id} value={dest.id}>{dest.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">Check-in Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-3">Number of Guests</label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value={1}>1 Guest</option>
                  <option value={2}>2 Guests</option>
                  <option value={4}>4 Guests</option>
                  <option value={6}>6 Guests</option>
                  <option value={8}>8+ Guests</option>
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">Price Range</label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({...priceRange, max: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-blue-200">
                    <span>${priceRange.min}</span>
                    <span>${priceRange.max}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="seasonality">Best Season</option>
                </select>
              </div>

              <button
                onClick={handleSearch}
                disabled={selectedActivities.length === 0}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Search Properties ({selectedActivities.length} activities)
              </button>
            </div>
          </div>

          {/* Advanced Amenities Filter */}
          {showFilters && (
            <div className="border-t border-white/20 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {amenities.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      className="w-4 h-4 text-cyan-500 bg-white/10 border-white/20 rounded focus:ring-cyan-400"
                    />
                    <span className="text-blue-200 text-sm">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Search Results with Differentiation Features */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Search Results ({searchResults.length})</h2>
              <div className="text-blue-200">
                Sorted by: {sortBy === 'recommended' ? 'Recommended' : 
                           sortBy === 'price-low' ? 'Price: Low to High' :
                           sortBy === 'price-high' ? 'Price: High to Low' :
                           sortBy === 'rating' ? 'Highest Rated' : 'Best Season'}
              </div>
            </div>
            <div className="space-y-8">
              {searchResults.map((result, index) => (
                <div key={index} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Column - Basic Info */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {result.activities.slice(0, 3).map((activity, i) => (
                            <span key={i} className="text-2xl">{activity.icon}</span>
                          ))}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">${result.price}</div>
                          <div className="text-blue-300 text-sm">{result.duration}</div>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-white mb-2">{result.name}</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {result.activities.map((activity, i) => (
                          <span key={i} className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-sm font-medium">
                            {activity.name}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">⭐</span>
                          <span className="text-white">{result.rating}</span>
                        </div>
                        <div className="text-blue-300">
                          {result.reviews} reviews
                        </div>
                        <div className="text-blue-300">
                          {result.guests} guests
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {result.amenities.slice(0, 3).map((amenity, i) => (
                          <span key={i} className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs">
                            {amenity}
                          </span>
                        ))}
                        {result.amenities.length > 3 && (
                          <span className="px-2 py-1 bg-white/10 text-blue-300 rounded text-xs">
                            +{result.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all">
                          View Details
                        </button>
                        <button
                          onClick={(e) => handleFavoriteToggle(result.id, e)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            result.isFavorite 
                              ? 'bg-red-500 hover:bg-red-600 text-white' 
                              : 'bg-white/20 hover:bg-white/30 text-white'
                          }`}
                        >
                          {result.isFavorite ? '❤️' : '🤍'}
                        </button>
                        <Link
                          href="/compare"
                          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                        >
                          ⚖️ Compare
                        </Link>
                        <Link
                          href="/reviews"
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                          ⭐ Reviews
                        </Link>
                        <Link
                          href="/booking"
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                        >
                          📅 Book
                        </Link>
                      </div>
                    </div>
                    
                    {/* Right Column - Why This Destination */}
                    <div>
                      <WhyThisDestination 
                        destination={result.name}
                        reasons={result.reasons}
                        compact={false}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Helper function for price multiplier
function getPriceMultiplier(seasonality, month) {
  if (!seasonality) return 1;
  const quality = seasonality.bestMonths.includes(month) ? 'peak' : 
                  seasonality.shoulderMonths.includes(month) ? 'shoulder' : 'off';
  switch (quality) {
    case 'peak': return seasonality.pricing.peak;
    case 'shoulder': return seasonality.pricing.shoulder;
    case 'off': return seasonality.pricing.offSeason;
    default: return 1;
  }
}
