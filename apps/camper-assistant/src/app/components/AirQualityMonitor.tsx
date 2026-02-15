'use client';

import { useState, useEffect } from 'react';
import {
  Wind,
  AlertTriangle,
  MapPin,
  Info,
  Search,
  Loader2,
  Heart,
  Eye,
  Activity,
  Thermometer,
  Droplets,
  ChevronDown,
  ChevronUp,
  Wifi
} from 'lucide-react';

// AirNow API Configuration
const AIRNOW_CONFIG = {
  API_KEY: process.env.NEXT_PUBLIC_AIRNOW_API_KEY || '', // Free API available at airnowapi.org
  BASE_URL: 'https://www.airnowapi.org/aq',
};

// Mock AQI data for demo
const MOCK_AQI_DATA = {
  aqi: 45,
  category: 'Good',
  pollutant: 'PM2.5',
  location: 'Summersville, WV',
  timestamp: new Date().toISOString(),
  forecast: [
    { day: 'Today', aqi: 45, category: 'Good' },
    { day: 'Tomorrow', aqi: 52, category: 'Moderate' },
    { day: 'Wed', aqi: 38, category: 'Good' },
    { day: 'Thu', aqi: 65, category: 'Moderate' },
    { day: 'Fri', aqi: 42, category: 'Good' },
  ]
};

interface AQIData {
  aqi: number;
  category: string;
  pollutant: string;
  location: string;
  timestamp: string;
  forecast: { day: string; aqi: number; category: string }[];
}

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500', label: 'Good' };
  if (aqi <= 100) return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500', label: 'Moderate' };
  if (aqi <= 150) return { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500', label: 'Unhealthy for Sensitive' };
  if (aqi <= 200) return { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500', label: 'Unhealthy' };
  if (aqi <= 300) return { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500', label: 'Very Unhealthy' };
  return { bg: 'bg-rose-900', text: 'text-rose-400', border: 'border-rose-900', label: 'Hazardous' };
};

const getHealthRecommendations = (aqi: number) => {
  if (aqi <= 50) return {
    general: 'Air quality is satisfactory. Enjoy outdoor activities!',
    sensitive: 'No restrictions for sensitive groups.',
    outdoor: 'Perfect conditions for hiking, camping, and outdoor exercise.',
    icon: Heart
  };
  if (aqi <= 100) return {
    general: 'Air quality is acceptable.',
    sensitive: 'Sensitive individuals should consider limiting prolonged outdoor exertion.',
    outdoor: 'Good for most activities. Sensitive people should watch for symptoms.',
    icon: Activity
  };
  if (aqi <= 150) return {
    general: 'Members of sensitive groups may experience health effects.',
    sensitive: 'People with heart/lung disease, older adults, children should reduce outdoor activity.',
    outdoor: 'Consider shortening outdoor activities or choosing less strenuous options.',
    icon: AlertTriangle
  };
  if (aqi <= 200) return {
    general: 'Everyone may begin to experience health effects.',
    sensitive: 'Sensitive groups should avoid outdoor exertion.',
    outdoor: 'Avoid prolonged outdoor activities. Consider indoor alternatives.',
    icon: AlertTriangle
  };
  return {
    general: 'Health warnings of emergency conditions.',
    sensitive: 'Everyone should avoid all outdoor exertion.',
    outdoor: 'Stay indoors. Seal windows. Use air purifier if available.',
    icon: AlertTriangle
  };
};

export default function AirQualityMonitor() {
  const [location, setLocation] = useState('25965');
  const [aqiData, setAqiData] = useState<AQIData>(MOCK_AQI_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [useLiveData, setUseLiveData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Fetch real AQI data from AirNow
  const fetchAQIData = async (zip: string) => {
    try {
      // AirNow API endpoint for current conditions by ZIP
      const url = `${AIRNOW_CONFIG.BASE_URL}/observation/zipCode/current/?format=application/json&zipCode=${zip}&distance=25&API_KEY=${AIRNOW_CONFIG.API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('AirNow API error:', response.status, errorText);
        throw new Error(`AirNow API error: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const reading = data[0];
        return {
          aqi: reading.AQI,
          category: reading.Category?.Name || 'Unknown',
          pollutant: reading.ParameterName,
          location: `${reading.ReportingArea}, ${reading.StateCode}`,
          timestamp: reading.DateObserved,
          forecast: [], // Would need separate API call for forecast
        };
      }
      return null;
    } catch (err) {
      console.error('AirNow fetch error:', err);
      return null;
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setApiError(null);

    if (useLiveData) {
      const liveData = await fetchAQIData(location);
      if (liveData) {
        setAqiData(liveData);
      } else {
        setApiError('AirNow API unavailable - showing demo data');
      }
    } else {
      // Generate realistic mock data based on location
      const baseAQI = Math.floor(Math.random() * 80) + 20;
      setAqiData({
        aqi: baseAQI,
        category: baseAQI <= 50 ? 'Good' : 'Moderate',
        pollutant: 'PM2.5',
        location: `Area ${location}`,
        timestamp: new Date().toISOString(),
        forecast: [
          { day: 'Today', aqi: baseAQI, category: baseAQI <= 50 ? 'Good' : 'Moderate' },
          { day: 'Tomorrow', aqi: baseAQI + 10, category: baseAQI + 10 <= 50 ? 'Good' : 'Moderate' },
          { day: 'Wed', aqi: Math.max(20, baseAQI - 15), category: 'Good' },
          { day: 'Thu', aqi: baseAQI + 20, category: baseAQI + 20 <= 100 ? 'Moderate' : 'Unhealthy for Sensitive' },
          { day: 'Fri', aqi: baseAQI, category: baseAQI <= 50 ? 'Good' : 'Moderate' },
        ]
      });
    }

    setIsLoading(false);
  };

  const colors = getAQIColor(aqiData.aqi);
  const recommendations = getHealthRecommendations(aqiData.aqi);
  const HealthIcon = recommendations.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Wind className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold">Air Quality Monitor</h2>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => setUseLiveData(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!useLiveData ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              Demo Data
            </button>
            <button
              onClick={() => setUseLiveData(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${useLiveData ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              AirNow API
            </button>
          </div>
        </div>
        <p className="text-slate-400 mt-2">
          Real-time air quality index and health recommendations for your campsite.
        </p>
        {useLiveData && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-400">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            EPA AirNow API Active
            {apiError && <span className="text-amber-400 ml-2">⚠ {apiError}</span>}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter ZIP code"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {isLoading ? '...' : 'Check'}
          </button>
        </div>
      </div>

      {/* Current AQI Display */}
      <div className={`rounded-xl p-6 border-2 ${colors.border} bg-slate-800`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm text-slate-400 mb-1">Current Air Quality - {aqiData.location}</div>
            <div className="flex items-baseline gap-3">
              <span className={`text-6xl font-bold ${colors.text}`}>{aqiData.aqi}</span>
              <span className={`text-xl font-semibold ${colors.text}`}>{colors.label}</span>
            </div>
            <div className="text-sm text-slate-400 mt-2">
              Primary Pollutant: <span className="text-slate-200">{aqiData.pollutant}</span>
            </div>
          </div>

          <div className={`w-24 h-24 rounded-full ${colors.bg} flex items-center justify-center`}>
            <span className="text-3xl font-bold text-white">{aqiData.aqi}</span>
          </div>
        </div>
      </div>

      {/* Health Recommendations */}
      <div className={`rounded-xl p-4 border ${colors.border} bg-slate-800/50`}>
        <div className="flex items-start gap-3">
          <HealthIcon className={`w-5 h-5 mt-0.5 ${colors.text}`} />
          <div className="space-y-2">
            <p className={`font-medium ${colors.text}`}>{recommendations.general}</p>
            <p className="text-sm text-slate-400">
              <span className="font-medium text-slate-300">Sensitive Groups:</span> {recommendations.sensitive}
            </p>
            <p className="text-sm text-slate-400">
              <span className="font-medium text-slate-300">Outdoor Activities:</span> {recommendations.outdoor}
            </p>
          </div>
        </div>
      </div>

      {/* 5-Day Forecast */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="font-semibold mb-4">5-Day AQI Forecast</h3>
        <div className="grid grid-cols-5 gap-2">
          {aqiData.forecast.map((day) => {
            const dayColors = getAQIColor(day.aqi);
            const isExpanded = expandedDay === day.day;

            return (
              <div key={day.day} className="space-y-2">
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                  className={`w-full p-3 rounded-lg border ${dayColors.border} bg-slate-700/50 hover:bg-slate-700 transition-colors text-center`}
                >
                  <div className="text-xs text-slate-400 mb-1">{day.day}</div>
                  <div className={`text-2xl font-bold ${dayColors.text}`}>{day.aqi}</div>
                  <div className={`text-xs ${dayColors.text}`}>{day.category}</div>
                </button>

                {isExpanded && (
                  <div className="p-2 bg-slate-700 rounded-lg text-xs text-slate-400 text-center">
                    {getHealthRecommendations(day.aqi).outdoor}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AQI Scale Reference */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Info className="w-4 h-4" />
          AQI Scale Reference
        </h3>
        <div className="space-y-2">
          {[
            { range: '0-50', label: 'Good', color: 'bg-emerald-500', desc: 'Air quality is satisfactory' },
            { range: '51-100', label: 'Moderate', color: 'bg-yellow-500', desc: 'Acceptable for most, sensitive groups may experience minor effects' },
            { range: '101-150', label: 'Unhealthy for Sensitive', color: 'bg-orange-500', desc: 'Sensitive groups may experience health effects' },
            { range: '151-200', label: 'Unhealthy', color: 'bg-red-500', desc: 'Everyone may experience health effects' },
            { range: '201-300', label: 'Very Unhealthy', color: 'bg-purple-500', desc: 'Health alert: everyone may experience serious effects' },
            { range: '301+', label: 'Hazardous', color: 'bg-rose-900', desc: 'Emergency conditions: entire population at risk' },
          ].map((level) => (
            <div key={level.range} className="flex items-center gap-3 text-sm">
              <div className={`w-12 h-6 rounded ${level.color} flex items-center justify-center text-xs font-medium text-white`}>
                {level.range}
              </div>
              <span className="font-medium text-slate-300 w-32">{level.label}</span>
              <span className="text-slate-400 flex-1">{level.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pollutant Info */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="font-semibold mb-3">Common Pollutants</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-slate-300">PM2.5</span>
            </div>
            <p className="text-slate-400 text-xs">Fine particles that penetrate deep into lungs. Sources: wildfires, vehicles, industry.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-slate-300">PM10</span>
            </div>
            <p className="text-slate-400 text-xs">Coarse particles like dust and pollen. Sources: roads, construction, agriculture.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <span className="font-medium text-slate-300">Ozone (O₃)</span>
            </div>
            <p className="text-slate-400 text-xs">Ground-level ozone. Sources: vehicle exhaust + sunlight. Worse on hot summer days.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-400" />
              <span className="font-medium text-slate-300">NO₂</span>
            </div>
            <p className="text-slate-400 text-xs">Nitrogen dioxide from combustion. Sources: vehicles, power plants, wildfires.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
