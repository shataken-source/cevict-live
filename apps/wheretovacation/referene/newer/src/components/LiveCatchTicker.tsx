'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Fish, MapPin, Star, Clock, Waves, Anchor, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LiveCatchTicker, { LiveCatch, LiveActivity } from '@/lib/liveCatchTicker';

interface LiveCatchTickerProps {
  position?: 'header' | 'sidebar' | 'floating';
  showBookNow?: boolean;
  userLocation?: { lat: number; lng: number };
}

export default function LiveCatchTickerComponent({ 
  position = 'header', 
  showBookNow = true,
  userLocation 
}: LiveCatchTickerProps) {
  const [ticker, setTicker] = useState<LiveCatchTicker | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [recentCatches, setRecentCatches] = useState<LiveCatch[]>([]);
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const animationRef = useRef<NodeJS.Timeout>();
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize ticker
    const tickerInstance = new LiveCatchTicker({
      position,
      showPhotos: true,
      showLocation: true,
      filterRadius: 50,
      categories: ['catch', 'booking', 'review'],
      maxItems: 20
    });

    setTicker(tickerInstance);

    // Listen for updates
    tickerInstance.on('update', () => {
      setItems(tickerInstance.getTickerItems());
      setRecentCatches(tickerInstance.getRecentCatches(userLocation));
      setActivities(tickerInstance.getActivityFeed());
    });

    // Initial load
    setItems(tickerInstance.getTickerItems());
    setRecentCatches(tickerInstance.getRecentCatches(userLocation));
    setActivities(tickerInstance.getActivityFeed());

    // Record impression
    tickerInstance.recordImpression();

    return () => {
      tickerInstance.destroy();
    };
  }, [position, userLocation]);

  useEffect(() => {
    // Auto-rotate ticker items
    if (items.length > 1 && position === 'header') {
      animationRef.current = setInterval(() => {
        setCurrentItemIndex((prev) => (prev + 1) % items.length);
      }, 4000);
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [items.length, position]);

  const getTrustLevelBadge = (level: string) => {
    switch (level) {
      case 'veteran':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Star className="w-3 h-3 mr-1" />Veteran</Badge>;
      case 'elite':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><Star className="w-3 h-3 mr-1" />Elite</Badge>;
      case 'verified':
        return <Badge variant="outline">Verified</Badge>;
      default:
        return null;
    }
  };

  const handleBookNow = () => {
    if (ticker) {
      ticker.recordClick('booking');
    }
    // Navigate to booking page
    window.location.href = '/charters';
  };

  const handleItemClick = (type: 'catch' | 'booking' | 'review') => {
    if (ticker) {
      ticker.recordClick(type);
    }
  };

  const getSpeciesEmoji = (species: string): string => {
    const speciesEmojis: Record<string, string> = {
      'king mackerel': '🐟',
      'snapper': '🐠',
      'grouper': '🐡',
      'tuna': '🐟',
      'redfish': '🦈',
      'trout': '🐟',
      'flounder': '🐟',
      'mahi': '🐠',
      'wahoo': '🐟',
      'sailfish': '🐟'
    };
    return speciesEmojis[species.toLowerCase()] || '🐟';
  };

  // Header Ticker Component
  if (position === 'header') {
    return (
      <div className="w-full bg-blue-600 text-white py-2 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <Waves className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-medium">Live Action:</span>
              <div className="flex-1 overflow-hidden">
                <div 
                  className="whitespace-nowrap animate-scroll"
                  style={{
                    animation: 'scroll-left 30s linear infinite',
                    display: 'inline-block'
                  }}
                >
                  {items.length > 0 ? items.map((item, index) => (
                    <span key={index} className="mx-8 text-sm">
                      {item}
                    </span>
                  )) : (
                    <span className="text-sm opacity-75">Loading live activity...</span>
                  )}
                </div>
              </div>
            </div>
            {showBookNow && (
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handleBookNow}
                className="ml-4 bg-white text-blue-600 hover:bg-blue-50"
              >
                Book Now
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sidebar Ticker Component
  if (position === 'sidebar') {
    return (
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blue-900 flex items-center">
            <Waves className="w-5 h-5 mr-2 text-blue-600" />
            Live Action
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(!isVisible)}
            className="text-blue-600 hover:text-blue-800"
          >
            {isVisible ? 'Hide' : 'Show'}
          </Button>
        </div>

        {isVisible && (
          <div className="space-y-3">
            {/* Recent Catches */}
            {recentCatches.slice(0, 3).map((catch_) => (
              <div 
                key={catch_.id}
                className="bg-white p-3 rounded-lg border border-blue-100 cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => handleItemClick('catch')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{getSpeciesEmoji(catch_.species)}</span>
                      <span className="font-semibold text-gray-900">{catch_.weight}lb {catch_.species}</span>
                      {getTrustLevelBadge(catch_.captainTrustLevel)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Captain {catch_.captainName}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {catch_.location.distance}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(catch_.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  {catch_.photos && catch_.photos.length > 0 && (
                    <img 
                      src={catch_.photos[0]} 
                      alt="Catch photo" 
                      className="w-16 h-16 object-cover rounded-lg ml-3"
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Recent Bookings */}
            {activities
              .filter(a => a.type === 'booking')
              .slice(0, 2)
              .map((activity) => (
                <div 
                  key={activity.id}
                  className="bg-green-50 p-3 rounded-lg border border-green-200 cursor-pointer hover:border-green-300 transition-colors"
                  onClick={() => handleItemClick('booking')}
                >
                  <div className="flex items-center">
                    <Anchor className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800">{activity.action}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">{activity.details}</p>
                </div>
              ))}

            {/* Call to Action */}
            {showBookNow && (
              <Button 
                onClick={handleBookNow}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Fish className="w-4 h-4 mr-2" />
                Book Your Trip
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  }

  // Floating Ticker Component
  return (
    <div 
      ref={tickerRef}
      className="fixed bottom-4 right-4 z-50 max-w-sm"
    >
      <Card className="bg-white shadow-lg border-blue-200">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Waves className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="font-semibold text-sm text-blue-900">Live Action</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(!isVisible)}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            >
              ×
            </Button>
          </div>

          {isVisible && items.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-gray-700">
                {items[currentItemIndex]}
              </div>
              <div className="flex justify-center space-x-1">
                {items.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      index === currentItemIndex ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              {showBookNow && (
                <Button 
                  size="sm" 
                  onClick={handleBookNow}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Book Now
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Custom CSS for animation
const style = document.createElement('style');
style.textContent = `
  @keyframes scroll-left {
    0% {
      transform: translateX(100%);
    }
    100% {
      transform: translateX(-100%);
    }
  }
  
  .animate-scroll {
    display: inline-block;
    padding-left: 100%;
  }
`;
document.head.appendChild(style);
