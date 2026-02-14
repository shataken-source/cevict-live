'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface DestinationData {
  id: string;
  name: string;
  country: string;
  avgCost: number;
  bestMonths: number[];
  weather: 'warm' | 'cold' | 'moderate';
  flightTime: number; // hours from US average
  crowdLevel: 'low' | 'medium' | 'high';
  greatFor: string[];
  activities: string[];
}

// Stub data - in production this would come from API
const destinations: Record<string, DestinationData> = {
  'costa-rica': {
    id: 'costa-rica',
    name: 'Costa Rica',
    country: 'Costa Rica',
    avgCost: 150,
    bestMonths: [12, 1, 2, 3],
    weather: 'warm',
    flightTime: 4,
    crowdLevel: 'medium',
    greatFor: ['adventure', 'family', 'eco-tourism'],
    activities: ['surfing', 'rainforest', 'wildlife', 'volcanoes'],
  },
  'hawaii': {
    id: 'hawaii',
    name: 'Hawaii',
    country: 'USA',
    avgCost: 300,
    bestMonths: [4, 5, 9, 10],
    weather: 'warm',
    flightTime: 8,
    crowdLevel: 'high',
    greatFor: ['relax', 'family', 'adventure'],
    activities: ['beach', 'volcanoes', 'surfing', 'snorkeling'],
  },
  'colorado': {
    id: 'colorado',
    name: 'Colorado',
    country: 'USA',
    avgCost: 180,
    bestMonths: [6, 7, 8, 12, 1, 2],
    weather: 'cold',
    flightTime: 3,
    crowdLevel: 'medium',
    greatFor: ['adventure', 'family', 'skiing'],
    activities: ['skiing', 'hiking', 'mountains', 'wildlife'],
  },
  'thailand': {
    id: 'thailand',
    name: 'Thailand',
    country: 'Thailand',
    avgCost: 80,
    bestMonths: [11, 12, 1, 2],
    weather: 'warm',
    flightTime: 18,
    crowdLevel: 'high',
    greatFor: ['culture', 'beach', 'food'],
    activities: ['temples', 'beaches', 'street-food', 'diving'],
  },
};

export default function DestinationComparison() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sync with URL on mount and when search params change
  useEffect(() => {
    const compareIds = searchParams.get('compare');
    if (compareIds) {
      const ids = compareIds.split(',').filter(id => destinations[id]);
      setSelectedIds(ids);
    }
  }, [searchParams]);

  // Update URL when selection changes
  const updateComparison = (ids: string[]) => {
    if (ids.length === 0) {
      // Remove compare param if no destinations selected
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('compare');
      router.push(`?${newParams.toString()}`, { scroll: false });
    } else {
      // Update compare param with selected IDs
      router.push(`?compare=${ids.join(',')}`, { scroll: false });
    }
  };

  const addToComparison = (destinationId: string) => {
    if (selectedIds.includes(destinationId)) return;
    if (selectedIds.length >= 3) return; // Max 3 destinations
    
    const newIds = [...selectedIds, destinationId];
    setSelectedIds(newIds);
    updateComparison(newIds);
  };

  const removeFromComparison = (destinationId: string) => {
    const newIds = selectedIds.filter(id => id !== destinationId);
    setSelectedIds(newIds);
    updateComparison(newIds);
  };

  const clearComparison = () => {
    setSelectedIds([]);
    updateComparison([]);
  };

  const selectedDestinations = selectedIds.map(id => destinations[id]).filter(Boolean);

  const getScoreColor = (score: number, isGood: boolean = true) => {
    if (isGood) {
      if (score >= 80) return 'text-green-400';
      if (score >= 60) return 'text-blue-400';
      return 'text-yellow-400';
    } else {
      if (score <= 20) return 'text-green-400';
      if (score <= 40) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'warm': return '🌞';
      case 'cold': return '❄️';
      case 'moderate': return '🌤️';
      default: return '🌡️';
    }
  };

  const getCrowdIcon = (level: string) => {
    switch (level) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Compare Destinations</h1>
        <p className="text-blue-200 max-w-2xl mx-auto">
          Compare up to 3 destinations side-by-side to make the perfect choice for your next vacation.
        </p>
      </div>

      {/* Destination Selection */}
      <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Select Destinations to Compare</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(destinations).map(([id, dest]) => {
            const isSelected = selectedIds.includes(id);
            const canSelect = selectedIds.length < 3 || isSelected;
            
            return (
              <button
                key={id}
                onClick={() => isSelected ? removeFromComparison(id) : addToComparison(id)}
                disabled={!canSelect}
                className={`p-3 rounded-lg border transition-all text-left ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-white'
                    : canSelect
                    ? 'bg-white/5 border-white/20 text-blue-200 hover:bg-white/10'
                    : 'bg-gray-500/10 border-gray-500/20 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="font-medium">{dest.name}</div>
                <div className="text-sm opacity-75">{dest.country}</div>
                {isSelected && <div className="text-xs mt-1">✓ Selected</div>}
                {!canSelect && !isSelected && <div className="text-xs mt-1">Max 3</div>}
              </button>
            );
          })}
        </div>
        
        {selectedIds.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-blue-200">
              {selectedIds.length} of 3 destinations selected
            </div>
            <button
              onClick={clearComparison}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {selectedDestinations.length > 0 && (
        <div className="bg-white/10 backdrop-blur rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left p-4 text-white font-semibold">Feature</th>
                  {selectedDestinations.map(dest => (
                    <th key={dest.id} className="text-center p-4 text-white font-semibold">
                      {dest.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Cost */}
                <tr className="border-b border-white/10">
                  <td className="p-4 text-blue-200">
                    <div className="flex items-center gap-2">
                      <span>💰</span>
                      <span>Average Daily Cost</span>
                    </div>
                  </td>
                  {selectedDestinations.map(dest => (
                    <td key={dest.id} className="text-center p-4">
                      <div className={`font-bold ${getScoreColor(100 - (dest.avgCost / 300) * 100)}`}>
                        ${dest.avgCost}
                      </div>
                      <div className="text-sm text-blue-300">
                        {dest.avgCost <= 100 ? 'Budget' : dest.avgCost <= 200 ? 'Moderate' : 'Luxury'}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Flight Time */}
                <tr className="border-b border-white/10">
                  <td className="p-4 text-blue-200">
                    <div className="flex items-center gap-2">
                      <span>✈️</span>
                      <span>Flight Time (from US)</span>
                    </div>
                  </td>
                  {selectedDestinations.map(dest => (
                    <td key={dest.id} className="text-center p-4">
                      <div className={`font-bold ${getScoreColor(dest.flightTime, false)}`}>
                        {dest.flightTime}h
                      </div>
                      <div className="text-sm text-blue-300">
                        {dest.flightTime <= 4 ? 'Short' : dest.flightTime <= 8 ? 'Medium' : 'Long'}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Weather */}
                <tr className="border-b border-white/10">
                  <td className="p-4 text-blue-200">
                    <div className="flex items-center gap-2">
                      <span>🌡️</span>
                      <span>Weather Type</span>
                    </div>
                  </td>
                  {selectedDestinations.map(dest => (
                    <td key={dest.id} className="text-center p-4">
                      <div className="text-2xl mb-1">{getWeatherIcon(dest.weather)}</div>
                      <div className="font-medium text-white capitalize">{dest.weather}</div>
                    </td>
                  ))}
                </tr>

                {/* Crowd Level */}
                <tr className="border-b border-white/10">
                  <td className="p-4 text-blue-200">
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      <span>Crowd Level</span>
                    </div>
                  </td>
                  {selectedDestinations.map(dest => (
                    <td key={dest.id} className="text-center p-4">
                      <div className="text-2xl mb-1">{getCrowdIcon(dest.crowdLevel)}</div>
                      <div className={`font-medium capitalize ${
                        dest.crowdLevel === 'low' ? 'text-green-400' :
                        dest.crowdLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {dest.crowdLevel}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Best Months */}
                <tr className="border-b border-white/10">
                  <td className="p-4 text-blue-200">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>Best Months</span>
                    </div>
                  </td>
                  {selectedDestinations.map(dest => (
                    <td key={dest.id} className="text-center p-4">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {dest.bestMonths.map(month => (
                          <span key={month} className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs">
                            {new Date(2000, month - 1).toLocaleDateString('en', { month: 'short' })}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Great For */}
                <tr className="border-b border-white/10">
                  <td className="p-4 text-blue-200">
                    <div className="flex items-center gap-2">
                      <span>🎯</span>
                      <span>Great For</span>
                    </div>
                  </td>
                  {selectedDestinations.map(dest => (
                    <td key={dest.id} className="text-center p-4">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {dest.greatFor.map(style => (
                          <span key={style} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs capitalize">
                            {style}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Top Activities */}
                <tr>
                  <td className="p-4 text-blue-200">
                    <div className="flex items-center gap-2">
                      <span>🎪</span>
                      <span>Top Activities</span>
                    </div>
                  </td>
                  {selectedDestinations.map(dest => (
                    <td key={dest.id} className="text-center p-4">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {dest.activities.slice(0, 4).map(activity => (
                          <span key={activity} className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs capitalize">
                            {activity}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Share URL */}
          <div className="p-4 border-t border-white/20 bg-black/20">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-300">
                Share this comparison: {typeof window !== 'undefined' ? window.location.href : ''}
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors text-sm"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedDestinations.length === 0 && (
        <div className="bg-white/10 backdrop-blur rounded-xl p-12 border border-white/20 text-center">
          <div className="text-6xl mb-4">⚖️</div>
          <h3 className="text-xl font-bold text-white mb-2">No Destinations Selected</h3>
          <p className="text-blue-200 mb-6">
            Select 2-3 destinations above to start comparing them side-by-side.
          </p>
        </div>
      )}
    </div>
  );
}
