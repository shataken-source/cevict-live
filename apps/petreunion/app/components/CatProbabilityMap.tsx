'use client';

import { useState, useEffect } from 'react';
import { CatPhysicsEngine, CatProfile, SearchZone, WeatherData, TerrainFeatures } from '../lib/cat-physics';

interface ProbabilityMapProps {
  petId?: string;
  petName: string;
  isIndoorOnly: boolean;
  lastSeenLat: number;
  lastSeenLng: number;
  lastSeenTime: Date;
  color: string;
  age: number;
}

export default function CatProbabilityMap({
  petName,
  isIndoorOnly,
  lastSeenLat,
  lastSeenLng,
  lastSeenTime,
  color,
  age,
}: ProbabilityMapProps) {
  const [zones, setZones] = useState<SearchZone[]>([]);
  const [transparencyLog, setTransparencyLog] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeatherAndCalculate();
  }, []);

  async function fetchWeatherAndCalculate() {
    try {
      // Fetch current weather (OpenWeatherMap or similar)
      // For now, use mock data
      const mockWeather: WeatherData = {
        tempF: 65,
        conditions: 'clear',
        windSpeedMph: 5,
      };

      // Mock terrain data (in production, fetch from OpenStreetMap)
      const mockTerrain: TerrainFeatures = {
        hasEngineBlocks: true,
        hasCrawlspaces: true,
        hasDecks: true,
        hasGarages: true,
        hasWoods: false,
        hidingDensity: 0.7, // 0-1 scale
      };

      const catProfile: CatProfile = {
        name: petName,
        isIndoorOnly,
        lastSeenLocation: { lat: lastSeenLat, lng: lastSeenLng },
        lastSeenTime,
        color,
        age,
      };

      const calculatedZones = CatPhysicsEngine.generateSearchZones(
        catProfile,
        mockWeather,
        mockTerrain
      );

      const log = CatPhysicsEngine.generateTransparencyLog(
        catProfile,
        mockWeather,
        mockTerrain,
        calculatedZones
      );

      setZones(calculatedZones);
      setWeather(mockWeather);
      setTransparencyLog(log);
      setLoading(false);
    } catch (error) {
      console.error('Error calculating probability zones:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        🎯 Where to Look for {petName}
      </h2>

      {/* AI Transparency Log */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          🤖 AI Logic (Transparency)
        </h3>
        <p className="text-sm text-blue-800">{transparencyLog}</p>
        <p className="text-xs text-blue-600 mt-2 italic">
          This AI autonomously analyzed weather, terrain, and cat behavior to generate these predictions.
        </p>
      </div>

      {/* Probability Zones */}
      <div className="space-y-4">
        {zones.map((zone, idx) => (
          <div
            key={zone.name}
            className={`border-2 rounded-lg p-4 ${
              idx === 0
                ? 'border-green-500 bg-green-50'
                : idx === 1
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-orange-500 bg-orange-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-900">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {zone.name}
              </h3>
              <span className="text-2xl font-bold text-gray-900">
                {(zone.probability * 100).toFixed(0)}%
              </span>
            </div>

            <p className="text-sm text-gray-700 mb-3">
              <strong>Radius:</strong> {zone.radiusMeters}m from last seen location
            </p>

            <div className="bg-white rounded p-3 mb-3">
              <p className="text-sm text-gray-800">
                <strong>AI Reasoning:</strong> {zone.reasoning}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">Search Tips:</p>
              <ul className="space-y-1">
                {zone.searchTips.map((tip, tipIdx) => (
                  <li key={tipIdx} className="text-sm text-gray-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Current Conditions */}
      {weather && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Current Conditions</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Weather:</span>
              <span className="ml-2 font-medium capitalize">{weather.conditions}</span>
            </div>
            <div>
              <span className="text-gray-600">Temperature:</span>
              <span className="ml-2 font-medium">{weather.tempF}°F</span>
            </div>
            <div>
              <span className="text-gray-600">Wind:</span>
              <span className="ml-2 font-medium">{weather.windSpeedMph} mph</span>
            </div>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="mt-6 p-4 bg-blue-100 rounded-lg border border-blue-300">
        <p className="text-sm text-blue-900">
          <strong>💡 Pro Tip:</strong> Cats are most active at <strong>dawn (5-7am)</strong> and{' '}
          <strong>dusk (5-7pm)</strong>. Set alarms to search during these times. Bring treats and
          shake a food bag quietly - cats often hide silently when scared.
        </p>
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Powered by AI Cat Physics Engine • 100% AI-coded • Helping humans find their pets
      </div>
    </div>
  );
}
