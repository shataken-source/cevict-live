'use client';

import { useState, useEffect } from 'react';
import { CloudRain, Sun, Wind, Droplets, Thermometer, AlertTriangle } from 'lucide-react';

export default function WeatherWidget() {
  const [location, setLocation] = useState('Yellowstone National Park');
  const [weather, setWeather] = useState({
    temp: 72,
    condition: 'Partly Cloudy',
    humidity: 45,
    windSpeed: 8,
    uvIndex: 6,
    pressure: 30.12,
  });

  // 7-day forecast
  const forecast = [
    { day: 'Today', high: 75, low: 52, condition: 'Partly Cloudy', icon: 'cloud' },
    { day: 'Tomorrow', high: 78, low: 55, condition: 'Sunny', icon: 'sun' },
    { day: 'Wed', high: 73, low: 50, condition: 'Thunderstorms', icon: 'storm' },
    { day: 'Thu', high: 68, low: 48, condition: 'Rain', icon: 'rain' },
    { day: 'Fri', high: 71, low: 49, condition: 'Partly Cloudy', icon: 'cloud' },
    { day: 'Sat', high: 76, low: 53, condition: 'Sunny', icon: 'sun' },
    { day: 'Sun', high: 79, low: 56, condition: 'Sunny', icon: 'sun' },
  ];

  const hourly = [
    { time: '6 AM', temp: 55, precip: 0 },
    { time: '9 AM', temp: 62, precip: 10 },
    { time: '12 PM', temp: 72, precip: 20 },
    { time: '3 PM', temp: 75, precip: 30 },
    { time: '6 PM', temp: 68, precip: 60 },
    { time: '9 PM', temp: 58, precip: 80 },
  ];

  return (
    <div className="space-y-6">
      {/* Location Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Weather</h2>
            <p className="text-slate-400">{location}</p>
          </div>
          <button className="text-sm text-emerald-400 hover:text-emerald-300">
            Change Location
          </button>
        </div>
      </div>

      {/* Current Conditions */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Weather */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center">
              <Sun className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="text-5xl font-bold">{weather.temp}°F</div>
              <div className="text-slate-400">{weather.condition}</div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Droplets className="w-4 h-4" />
                Humidity
              </div>
              <div className="text-xl font-semibold">{weather.humidity}%</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Wind className="w-4 h-4" />
                Wind
              </div>
              <div className="text-xl font-semibold">{weather.windSpeed} mph</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Thermometer className="w-4 h-4" />
                UV Index
              </div>
              <div className="text-xl font-semibold text-amber-400">{weather.uvIndex}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CloudRain className="w-4 h-4" />
                Pressure
              </div>
              <div className="text-xl font-semibold">{weather.pressure}"</div>
            </div>
          </div>
        </div>

        {/* Storm Warning */}
        <div className="mt-6 bg-red-900/30 border border-red-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <div className="font-semibold text-red-400">Severe Thunderstorm Warning</div>
              <div className="text-sm text-red-200 mt-1">
                Expected at 6:00 PM. Heavy rain, lightning, and wind gusts up to 40 mph.
                Secure loose items and avoid open areas.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Forecast */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-semibold mb-4">Hourly Forecast</h3>
        <div className="grid grid-cols-6 gap-4">
          {hourly.map((hour) => (
            <div key={hour.time} className="text-center">
              <div className="text-sm text-slate-400">{hour.time}</div>
              <div className="text-lg font-semibold my-2">{hour.temp}°</div>
              <div className="text-xs text-blue-400">{hour.precip}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-semibold mb-4">7-Day Forecast</h3>
        <div className="space-y-3">
          {forecast.map((day) => (
            <div key={day.day} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-16 font-medium">{day.day}</div>
                {day.icon === 'sun' && <Sun className="w-5 h-5 text-amber-400" />}
                {day.icon === 'cloud' && <CloudRain className="w-5 h-5 text-slate-400" />}
                {day.icon === 'rain' && <CloudRain className="w-5 h-5 text-blue-400" />}
                {day.icon === 'storm' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                <span className="text-slate-400">{day.condition}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold">{day.high}°</span>
                <span className="text-slate-500">{day.low}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
