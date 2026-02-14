'use client';

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Waves, 
  Wind, 
  Eye, 
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  MapPin,
  Thermometer,
  Droplets
} from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  windSpeed: number;
  windDirection: string;
  waveHeight: number;
  visibility: number;
  humidity: number;
  uvIndex: number;
  tideStatus: string;
  beachFlag: 'green' | 'yellow' | 'red' | 'double-red';
  lastUpdated: string;
  source: string;
}

const mockWeatherData: WeatherData = {
  location: "Gulf Shores, AL",
  temperature: 72,
  feelsLike: 75,
  condition: "Partly Cloudy",
  windSpeed: 8,
  windDirection: "SE",
  waveHeight: 1.2,
  visibility: 10,
  humidity: 65,
  uvIndex: 6,
  tideStatus: "Incoming (High at 2:30 PM)",
  beachFlag: 'green',
  lastUpdated: "Updated 5 minutes ago",
  source: "National Weather Service - Mobile/Pensacola"
};

const beachFlagInfo = {
  green: {
    color: "bg-green-500",
    text: "Green Flag",
    meaning: "Low Hazard - Calm Conditions",
    icon: Sun,
    description: "Perfect beach conditions. Safe for all swimming activities."
  },
  yellow: {
    color: "bg-yellow-500", 
    text: "Yellow Flag",
    meaning: "Medium Hazard - Moderate Surf",
    icon: Wind,
    description: "Use caution when swimming. Some rip currents possible."
  },
  red: {
    color: "bg-red-500",
    text: "Red Flag", 
    meaning: "High Hazard - Rough Surf",
    icon: Waves,
    description: "Swimming not recommended. Strong currents and high waves."
  },
  'double-red': {
    color: "bg-red-700",
    text: "Double Red Flag",
    meaning: "Extreme Hazard - Water Closed",
    icon: AlertTriangle,
    description: "Water is closed to public. Dangerous conditions present."
  }
};

export default function LocalWeatherWidget() {
  const [weatherData, setWeatherData] = useState<WeatherData>(mockWeatherData);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Simulate real-time updates every 10 minutes
    const interval = setInterval(() => {
      refreshWeather();
    }, 600000); // 10 minutes

    return () => clearInterval(interval);
  }, []);

  const refreshWeather = () => {
    setIsLoading(true);
    // Simulate API call to NWS
    setTimeout(() => {
      setWeatherData({
        ...mockWeatherData,
        lastUpdated: "Updated just now"
      });
      setIsLoading(false);
    }, 1000);
  };

  const getFlagInfo = beachFlagInfo[weatherData.beachFlag];
  const FlagIcon = getFlagInfo.icon;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            <h3 className="font-bold">Local's Weather</h3>
          </div>
          <button
            onClick={refreshWeather}
            disabled={isLoading}
            className="p-1 hover:bg-white/20 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm text-blue-100">
          <MapPin className="w-3 h-3" />
          <span>{weatherData.location}</span>
        </div>
        <p className="text-xs text-blue-200 mt-1">{weatherData.source}</p>
      </div>

      {/* Current Conditions */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{weatherData.temperature}°F</div>
            <div className="text-sm text-gray-600">Feels like {weatherData.feelsLike}°F</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900">{weatherData.condition}</div>
            <div className="text-sm text-gray-600">{weatherData.lastUpdated}</div>
          </div>
        </div>

        {/* Beach Flag Status */}
        <div className={`${getFlagInfo.color} text-white rounded-lg p-3 mb-4`}>
          <div className="flex items-center gap-3">
            <FlagIcon className="w-6 h-6" />
            <div className="flex-1">
              <div className="font-bold">{getFlagInfo.text}</div>
              <div className="text-sm opacity-90">{getFlagInfo.meaning}</div>
            </div>
          </div>
          <p className="text-sm mt-2 opacity-90">{getFlagInfo.description}</p>
        </div>

        {/* Marine Conditions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Waves className="w-4 h-4" />
              <span>Wave Height</span>
            </div>
            <div className="font-medium text-gray-900">{weatherData.waveHeight} ft</div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Wind className="w-4 h-4" />
              <span>Wind</span>
            </div>
            <div className="font-medium text-gray-900">{weatherData.windSpeed} mph {weatherData.windDirection}</div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Eye className="w-4 h-4" />
              <span>Visibility</span>
            </div>
            <div className="font-medium text-gray-900">{weatherData.visibility} miles</div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Thermometer className="w-4 h-4" />
              <span>UV Index</span>
            </div>
            <div className="font-medium text-gray-900">{weatherData.uvIndex} (Moderate)</div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Humidity:</span>
              <span className="font-medium text-gray-900 ml-1">{weatherData.humidity}%</span>
            </div>
            <div>
              <span className="text-gray-600">Tide:</span>
              <span className="font-medium text-gray-900 ml-1">{weatherData.tideStatus}</span>
            </div>
          </div>
        </div>

        {/* NWS Link */}
        <div className="text-center">
          <a 
            href="https://www.weather.gov/mob/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ExternalLink className="w-3 h-3" />
            View Full NWS Forecast
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 px-4 py-2 text-center">
        <p className="text-xs text-gray-600">
          Most accurate marine & coastal forecasts for Gulf Coast planning
        </p>
      </div>
    </div>
  );
}
