"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function WeatherPage() {
  const [selectedActivity, setSelectedActivity] = useState('surfing');
  
  const activities = [
    { id: 'surfing', name: '🏄 Surfing', icon: '🏄' },
    { id: 'hiking', name: '🏔️ Hiking', icon: '🏔️' },
    { id: 'skiing', name: '🎿 Skiing', icon: '🎿' },
    { id: 'beach', name: '🏖️ Beach', icon: '🏖️' }
  ];

  const weatherData = {
    surfing: {
      locations: [
        { name: 'Costa Rica', temp: '82°F', condition: 'Perfect', waveHeight: '4-6 ft', wind: '5 mph' },
        { name: 'Hawaii', temp: '78°F', condition: 'Excellent', waveHeight: '6-8 ft', wind: '8 mph' },
        { name: 'California', temp: '68°F', condition: 'Good', waveHeight: '3-5 ft', wind: '12 mph' }
      ],
      bestTime: 'December - March',
      tips: 'Early morning sessions offer best conditions and fewer crowds'
    },
    hiking: {
      locations: [
        { name: 'Yosemite', temp: '65°F', condition: 'Clear', elevation: '8,000 ft', precipitation: '0%' },
        { name: 'Rocky Mountains', temp: '58°F', condition: 'Partly Cloudy', elevation: '10,000 ft', precipitation: '10%' },
        { name: 'Appalachians', temp: '72°F', condition: 'Sunny', elevation: '6,000 ft', precipitation: '5%' }
      ],
      bestTime: 'May - September',
      tips: 'Check avalanche conditions in spring and fall at high elevations'
    },
    skiing: {
      locations: [
        { name: 'Aspen', temp: '25°F', condition: 'Snowing', snowfall: '12"', base: '48"', lifts: 'Open' },
        { name: 'Park City', temp: '22°F', condition: 'Partly Cloudy', snowfall: '6"', base: '42"', lifts: 'Open' },
        { name: 'Vermont', temp: '18°F', condition: 'Clear', snowfall: '3"', base: '36"', lifts: 'Open' }
      ],
      bestTime: 'December - March',
      tips: 'Mid-week offers shorter lift lines and better snow conditions'
    },
    beach: {
      locations: [
        { name: 'Caribbean', temp: '85°F', condition: 'Sunny', waterTemp: '82°F', uvIndex: 'High' },
        { name: 'Mediterranean', temp: '78°F', condition: 'Clear', waterTemp: '75°F', uvIndex: 'Moderate' },
        { name: 'Thailand', temp: '88°F', condition: 'Partly Cloudy', waterTemp: '86°F', uvIndex: 'Very High' }
      ],
      bestTime: 'April - June, September - October',
      tips: 'Bring reef-safe sunscreen and stay hydrated in tropical climates'
    }
  };

  const currentActivity = weatherData[selectedActivity];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Activity Weather Intelligence
          </h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Get weather conditions tailored to your favorite vacation activities.
          </p>
        </div>

        {/* Activity Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur rounded-lg p-1">
            {activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => setSelectedActivity(activity.id)}
                className={`px-6 py-3 rounded-md font-medium transition-all ${
                  selectedActivity === activity.id
                    ? 'bg-white text-blue-900'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                {activity.icon} {activity.name.replace(/[^\s]/g, '').substring(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Weather Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Locations */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold text-white mb-4">Top Destinations</h3>
            {currentActivity.locations.map((location, index) => (
              <div key={index} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-semibold text-white">{location.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">
                      {location.condition === 'Perfect' || location.condition === 'Excellent' ? '🌟' :
                       location.condition === 'Clear' || location.condition === 'Sunny' ? '☀️' :
                       location.condition === 'Snowing' ? '❄️' : '⛅'}
                    </span>
                    <span className="text-white font-medium">{location.condition}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{location.temp}</div>
                    <div className="text-blue-300 text-sm">Temperature</div>
                  </div>
                  {Object.entries(location).filter(([key]) => 
                    !['name', 'temp', 'condition'].includes(key)
                  ).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-lg font-bold text-white">{value}</div>
                      <div className="text-blue-300 text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Best Time to Go</h3>
              <p className="text-3xl font-bold text-cyan-400 mb-2">{currentActivity.bestTime}</p>
              <p className="text-blue-200 text-sm">Optimal season for this activity</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Pro Tips</h3>
              <p className="text-blue-200">{currentActivity.tips}</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Weather Alerts</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span className="text-blue-200">No active alerts for selected destinations</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400">⚠</span>
                  <span className="text-blue-200">High UV index in tropical locations</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            ← Back to Activity Search
          </Link>
        </div>
      </div>
    </div>
  );
}
