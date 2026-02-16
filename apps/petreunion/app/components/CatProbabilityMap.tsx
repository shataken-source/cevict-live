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
      // Fetch real weather data from OpenWeatherMap API
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
      let weatherData: WeatherData;

      if (apiKey && lastSeenLat && lastSeenLng) {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lastSeenLat}&lon=${lastSeenLng}&appid=${apiKey}&units=imperial`
        );
        if (response.ok) {
          const data = await response.json();
          weatherData = {
            tempF: Math.round(data.main.temp),
            conditions: data.weather[0]?.main?.toLowerCase() || 'clear',
            windSpeedMph: Math.round(data.wind.speed),
          };
        } else {
          throw new Error('Weather API failed');
        }
      } else {
        // Fallback to default values if no API key or location
        weatherData = {
          tempF: 65,
          conditions: 'clear',
          windSpeedMph: 5,
        };
      }

      // Fetch real terrain data from OpenStreetMap/Overpass API
      // Using default terrain analysis based on location type
      const terrainData = await fetchTerrainFeatures(lastSeenLat, lastSeenLng);

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
        weatherData,
        terrainData
      );

      const log = CatPhysicsEngine.generateTransparencyLog(
        catProfile,
        weatherData,
        terrainData,
        calculatedZones
      );

      setZones(calculatedZones);
      setWeather(weatherData);
      setTransparencyLog(log);
      setLoading(false);
    } catch (error) {
      console.error('Error calculating probability zones:', error);
      setLoading(false);
    }
  }

  // Helper function to fetch terrain features from OpenStreetMap
  async function fetchTerrainFeatures(lat: number, lng: number): Promise<TerrainFeatures> {
    try {
      // Overpass API query for nearby features
      const query = `[out:json][timeout:25];
        (
          node["building"="garage"](around:100,${lat},${lng});
          way["building"="garage"](around:100,${lat},${lng});
          node["man_made"="deck"](around:100,${lat},${lng});
          way["man_made"="deck"](around:100,${lat},${lng});
          node["covered"="yes"](around:100,${lat},${lng});
          way["natural"="wood"](around:200,${lat},${lng});
          relation["natural"="wood"](around:200,${lat},${lng});
        );
        out body;`;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error('Overpass API failed');
      }

      const data = await response.json();
      const elements = data.elements || [];

      // Analyze terrain features
      const hasGarages = elements.some((e: any) => e.tags?.building === 'garage');
      const hasDecks = elements.some((e: any) => e.tags?.man_made === 'deck');
      const hasCrawlspaces = elements.some((e: any) => e.tags?.covered === 'yes');
      const hasWoods = elements.some((e: any) => e.tags?.natural === 'wood');

      // Calculate hiding density based on features
      let hidingDensity = 0.5; // base
      if (hasWoods) hidingDensity += 0.2;
      if (hasGarages) hidingDensity += 0.15;
      if (hasDecks) hidingDensity += 0.1;
      if (hasCrawlspaces) hidingDensity += 0.05;
      hidingDensity = Math.min(hidingDensity, 1.0);

      return {
        hasEngineBlocks: hasGarages || hasDecks, // engines often found near garages/decks
        hasCrawlspaces,
        hasDecks,
        hasGarages,
        hasWoods,
        hidingDensity,
      };
    } catch (error) {
      console.warn('Failed to fetch terrain data, using defaults:', error);
      // Return default terrain features
      return {
        hasEngineBlocks: true,
        hasCrawlspaces: true,
        hasDecks: true,
        hasGarages: true,
        hasWoods: false,
        hidingDensity: 0.7,
      };
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
            className={`border-2 rounded-lg p-4 ${idx === 0
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
