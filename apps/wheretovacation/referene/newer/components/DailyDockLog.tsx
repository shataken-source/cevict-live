'use client';

import React, { useState, useEffect } from 'react';
import { 
  Fish, 
  Clock, 
  MapPin, 
  Camera, 
  Play, 
  RefreshCw, 
  Instagram, 
  TrendingUp,
  Users,
  Calendar,
  Video,
  Image as ImageIcon
} from 'lucide-react';

interface DockLogEntry {
  id: string;
  timestamp: string;
  captain: string;
  location: string;
  catch: string;
  size?: string;
  count?: number;
  photoUrl?: string;
  videoUrl?: string;
  instagramUrl?: string;
  weather: string;
  conditions: string;
  customers?: string;
}

export default function DailyDockLog() {
  const [logEntries, setLogEntries] = useState<DockLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLiveVideo, setShowLiveVideo] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Mock data for demonstration - would connect to real API
  const mockLogEntries: DockLogEntry[] = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      captain: 'Captain Mike Thompson',
      location: 'Perdido Pass',
      catch: 'Red Snapper',
      size: '12.5 lbs',
      count: 6,
      photoUrl: '/api/placeholder/400/300',
      weather: 'Sunny',
      conditions: 'Light winds, 2ft seas',
      customers: 'The Miller Family',
      instagramUrl: 'https://instagram.com/p/example1'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      captain: 'Captain Sarah Jenkins',
      location: 'Gulf Shores',
      catch: 'King Mackerel',
      size: '18.2 lbs',
      count: 3,
      photoUrl: '/api/placeholder/400/300',
      weather: 'Partly Cloudy',
      conditions: 'Moderate winds, 3ft seas',
      customers: 'Corporate Group',
      instagramUrl: 'https://instagram.com/p/example2'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      captain: 'Captain David Rodriguez',
      location: 'Back Bay',
      catch: 'Speckled Trout',
      count: 15,
      photoUrl: '/api/placeholder/400/300',
      weather: 'Overcast',
      conditions: 'Calm waters, light winds',
      customers: 'The Johnson Group',
      instagramUrl: 'https://instagram.com/p/example3'
    }
  ];

  useEffect(() => {
    // Initialize with mock data
    setLogEntries(mockLogEntries);
    setLastUpdated('Just now');
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      refreshLog();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const refreshLog = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // In real implementation, this would fetch from your API
      const newEntry: DockLogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        captain: 'Captain Mike Thompson',
        location: 'Orange Beach Marina',
        catch: 'Spanish Mackerel',
        size: '8.5 lbs',
        count: 4,
        photoUrl: '/api/placeholder/400/300',
        weather: 'Sunny',
        conditions: 'Perfect conditions!',
        customers: 'Family of Four',
        instagramUrl: 'https://instagram.com/p/new'
      };
      
      setLogEntries(prev => [newEntry, ...prev.slice(0, 9)]);
      setLastUpdated('Just now');
      setIsLoading(false);
    }, 1000);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const openLiveVideo = () => {
    setShowLiveVideo(true);
    // In real implementation, this would open a live video feed
    setTimeout(() => setShowLiveVideo(false), 15000); // Auto-close after 15 seconds
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <Fish className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Daily Dock Log</h2>
              <p className="text-blue-100">Live from the Gulf Coast</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshLog}
              disabled={isLoading}
              className="p-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">LIVE</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-blue-100">Last updated: {lastUpdated}</p>
          <button
            onClick={openLiveVideo}
            className="flex items-center gap-2 bg-yellow-500 text-blue-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-colors"
          >
            <Play className="w-4 h-4" />
            Live from the Dock
          </button>
        </div>
      </div>

      {/* Live Video Modal */}
      {showLiveVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-4 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Live from the Dock</h3>
              <button
                onClick={() => setShowLiveVideo(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>
            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <Video className="w-12 h-12 mx-auto mb-2" />
                <p>Live video feed would appear here</p>
                <p className="text-sm text-gray-400">Auto-closing in 15 seconds...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instagram Feed Integration */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3 mb-4">
          <Instagram className="w-5 h-5 text-pink-600" />
          <h3 className="font-bold text-gray-900"> tagged #GulfCoastCharters</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Dock Log Entries */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900">Today's Catches</h3>
          <span className="text-sm text-gray-500">({logEntries.length} entries)</span>
        </div>

        <div className="space-y-4">
          {logEntries.map((entry) => (
            <div key={entry.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0">
                  {entry.photoUrl && (
                    <img 
                      src={entry.photoUrl} 
                      alt={entry.catch}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900">{entry.catch}</h4>
                      {entry.size && (
                        <span className="text-sm text-gray-600">{entry.size}</span>
                      )}
                      {entry.count && (
                        <span className="text-sm text-gray-600"> • {entry.count} fish</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{formatTime(entry.timestamp)}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{entry.customers}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{entry.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Fish className="w-3 h-3" />
                      <span>{entry.weather}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{entry.conditions}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600">Captain {entry.captain.split(' ')[1]}</p>
                    {entry.instagramUrl && (
                      <a 
                        href={entry.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-pink-600 hover:text-pink-700 text-sm"
                      >
                        <Instagram className="w-4 h-4" />
                        View on Instagram
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span>Building FOMO for your next adventure!</span>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View Full Log Archive
          </button>
        </div>
      </div>
    </div>
  );
}
