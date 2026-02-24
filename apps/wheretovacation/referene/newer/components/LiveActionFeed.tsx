'use client';

import React, { useState, useEffect } from 'react';
import { 
  Fish, 
  Camera, 
  Clock, 
  MapPin, 
  Users, 
  Star, 
  Waves, 
  Anchor,
  Calendar,
  Trophy,
  Heart,
  Share2,
  RefreshCw
} from 'lucide-react';

interface CatchReport {
  id: string;
  captain: string;
  boat: string;
  time: string;
  location: string;
  catches: Array<{
    species: string;
    size: string;
    count: number;
    photo?: string;
  }>;
  passengers: number;
  weather: string;
  captainQuote: string;
  photos: string[];
  tripType: string;
}

const mockTodayCatches: CatchReport[] = [
  {
    id: '1',
    captain: 'Captain Mike Thompson',
    boat: 'Sea Hunter 32',
    time: '2 hours ago',
    location: 'Orange Beach Marina',
    catches: [
      { species: 'Red Snapper', size: '18-22 lbs', count: 6 },
      { species: 'Triggerfish', size: '3-5 lbs', count: 8 },
      { species: 'King Mackerel', size: '15-20 lbs', count: 2 }
    ],
    passengers: 4,
    weather: 'Partly Cloudy, 2ft seas',
    captainQuote: 'Perfect day on the water! The snapper were biting hard on the morning tide.',
    photos: ['/api/placeholder/400/300'],
    tripType: 'Deep Sea Charter'
  },
  {
    id: '2',
    captain: 'Captain Sarah Jenkins',
    boat: 'Coastal Runner',
    time: '4 hours ago',
    location: 'Gulf Shores Marina',
    catches: [
      { species: 'Speckled Trout', size: '3-5 lbs', count: 12 },
      { species: 'Redfish', size: '6-8 lbs', count: 4 },
      { species: 'Flounder', size: '2-3 lbs', count: 3 }
    ],
    passengers: 3,
    weather: 'Sunny, calm seas',
    captainQuote: 'Inshore fishing was on fire today! The trout were hitting topwater lures all morning.',
    photos: ['/api/placeholder/400/300'],
    tripType: 'Inshore Family Trip'
  },
  {
    id: '3',
    captain: 'Captain David Rodriguez',
    boat: 'Gulf Stormer',
    time: '6 hours ago',
    location: 'Perdido Pass',
    catches: [
      { species: 'Red Snapper', size: '20-25 lbs', count: 8 },
      { species: 'Gag Grouper', size: '15-18 lbs', count: 2 },
      { species: 'Amberjack', size: '30-35 lbs', count: 1 }
    ],
    passengers: 6,
    weather: 'Overcast, 1-2ft seas',
    captainQuote: 'Limited season snapper trip - clients limited out with some nice grouper mixed in!',
    photos: ['/api/placeholder/400/300'],
    tripType: 'Offshore Adventure'
  }
];

const weeklyStats = {
  totalTrips: 47,
  happyCustomers: 186,
  totalCatch: 523,
  topSpecies: 'Red Snapper',
  averageRating: 4.9
};

export default function LiveActionFeed() {
  const [todayCatches, setTodayCatches] = useState<CatchReport[]>(mockTodayCatches);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // In a real implementation, this would fetch from an API
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const refreshFeed = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setLastUpdate(new Date());
    }, 1000);
  };

  const formatTime = (timeString: string) => {
    const now = new Date();
    const match = timeString.match(/(\d+)\s*(hour|hours)/);
    if (match) {
      const hours = parseInt(match[1]);
      const pastTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
      return pastTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    return timeString;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <Fish className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Live from the Dock</h2>
              <p className="text-blue-100 text-sm">Real-time catch reports from today's trips</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-blue-100">Last updated</p>
              <p className="font-mono text-sm">{lastUpdate.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={refreshFeed}
              disabled={isLoading}
              className="p-2 bg-white/20 backdrop-blur rounded-full hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gray-50 p-4 border-b">
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{weeklyStats.totalTrips}</p>
            <p className="text-xs text-gray-600">Trips This Week</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{weeklyStats.happyCustomers}</p>
            <p className="text-xs text-gray-600">Happy Customers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{weeklyStats.totalCatch}</p>
            <p className="text-xs text-gray-600">Fish Caught</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">{weeklyStats.topSpecies}</p>
            <p className="text-xs text-gray-600">Top Species</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <p className="text-2xl font-bold text-yellow-600">{weeklyStats.averageRating}</p>
            </div>
            <p className="text-xs text-gray-600">Average Rating</p>
          </div>
        </div>
      </div>

      {/* Catch Reports */}
      <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
        {todayCatches.map((report) => (
          <div key={report.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Anchor className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{report.captain}</h3>
                  <p className="text-sm text-gray-600">{report.boat} • {report.tripType}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{formatTime(report.time)}</p>
                <p className="text-xs text-gray-500">{report.location}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Today's Catch:</p>
                <div className="space-y-1">
                  {report.catches.map((fish, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Fish className="w-3 h-3 text-blue-500" />
                      <span className="text-gray-700">
                        {fish.count}x {fish.species} ({fish.size})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Trip Details:</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    <span>{report.passengers} passengers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Waves className="w-3 h-3" />
                    <span>{report.weather}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded p-3 mb-3">
              <p className="text-sm text-blue-800 italic">"{report.captainQuote}"</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Photos available</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Load More */}
        <div className="text-center pt-4">
          <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            View more catch reports →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-4 border-t">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <Camera className="w-4 h-4 inline mr-1" />
            Live photos updated throughout the day
          </p>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View full gallery →
          </button>
        </div>
      </div>
    </div>
  );
}
