'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  ExternalLink,
  AlertCircle,
  DollarSign,
  BarChart3,
  Settings,
  Eye,
  MousePointer,
  Clock
} from 'lucide-react';

interface AdConfig {
  id: string;
  type: 'banner' | 'sidebar' | 'content' | 'native' | 'footer' | 'header';
  size: string;
  position: string;
  responsive: boolean;
  targeting: {
    locations: string[];
    userTypes: string[];
    interests: string[];
    timeOfDay: string[];
  };
  content: {
    title?: string;
    description?: string;
    imageUrl?: string;
    linkUrl?: string;
    ctaText?: string;
    advertiserName: string;
  };
  analytics: {
    impressions: number;
    clicks: number;
    ctr: number;
    revenue: number;
  };
  isActive: boolean;
  priority: number;
}

interface AdManagerProps {
  placement: 'top-banner' | 'header-banner' | 'sidebar' | 'content' | 'footer' | 'native';
  className?: string;
  showLabel?: boolean;
  userLocation?: string;
  userType?: 'guest' | 'member' | 'captain' | 'admin';
}

export default function AdManager({ 
  placement, 
  className = '', 
  showLabel = true,
  userLocation = 'general',
  userType = 'guest'
}: AdManagerProps) {
  const [currentAd, setCurrentAd] = useState<AdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adIndex, setAdIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showAdInfo, setShowAdInfo] = useState(false);

  // Sample ad configurations - in production, this would come from an API
  const adConfigs: AdConfig[] = [
    {
      id: 'gcc-weather-alerts',
      type: 'banner',
      size: '728x90',
      position: 'top-banner',
      responsive: true,
      targeting: {
        locations: ['gulf-coast', 'alabama', 'florida'],
        userTypes: ['guest', 'member', 'captain'],
        interests: ['fishing', 'weather', 'boating'],
        timeOfDay: ['morning', 'evening']
      },
      content: {
        title: 'Never Let Bad Weather Ruin Your Trip',
        description: 'Get real-time weather alerts 24 hours before dangerous conditions',
        imageUrl: '/api/placeholder/728/90',
        linkUrl: '/weather-alerts',
        ctaText: 'Start Free',
        advertiserName: 'Gulf Coast Charters'
      },
      analytics: {
        impressions: 12543,
        clicks: 892,
        ctr: 7.11,
        revenue: 446.00
      },
      isActive: true,
      priority: 10
    },
    {
      id: 'breakwater-first-aid',
      type: 'sidebar',
      size: '300x250',
      position: 'sidebar',
      responsive: true,
      targeting: {
        locations: ['gulf-coast'],
        userTypes: ['captain', 'member'],
        interests: ['safety', 'gear', 'boating'],
        timeOfDay: ['all']
      },
      content: {
        title: 'Captain-Approved First Aid Kit',
        description: 'Breakwater Supply Marine First Aid Kit - USCG Compliant',
        imageUrl: '/api/placeholder/300/250',
        linkUrl: '/gear/breakwater-first-aid',
        ctaText: 'Shop Now',
        advertiserName: 'Breakwater Supply'
      },
      analytics: {
        impressions: 8234,
        clicks: 234,
        ctr: 2.84,
        revenue: 117.00
      },
      isActive: true,
      priority: 8
    },
    {
      id: 'pelican-phone-pouch',
      type: 'content',
      size: '728x90',
      position: 'content',
      responsive: true,
      targeting: {
        locations: ['gulf-coast'],
        userTypes: ['guest', 'member'],
        interests: ['gear', 'technology', 'boating'],
        timeOfDay: ['all']
      },
      content: {
        title: 'Protect Your Phone on the Water',
        description: 'Pelican Marine Floating Pouch - 100% Waterproof',
        imageUrl: '/api/placeholder/728/90',
        linkUrl: '/gear/pelican-pouch',
        ctaText: 'Learn More',
        advertiserName: 'Pelican Marine'
      },
      analytics: {
        impressions: 9876,
        clicks: 456,
        ctr: 4.62,
        revenue: 228.00
      },
      isActive: true,
      priority: 7
    },
    {
      id: 'community-membership',
      type: 'native',
      size: '600x300',
      position: 'content',
      responsive: true,
      targeting: {
        locations: ['all'],
        userTypes: ['guest'],
        interests: ['community', 'fishing', 'learning'],
        timeOfDay: ['all']
      },
      content: {
        title: 'Join Our Fishing Community',
        description: 'Connect with 10,000+ anglers, share catches, earn rewards',
        imageUrl: '/api/placeholder/600/300',
        linkUrl: '/community/join',
        ctaText: 'Join Free',
        advertiserName: 'Gulf Coast Charters'
      },
      analytics: {
        impressions: 15234,
        clicks: 1234,
        ctr: 8.10,
        revenue: 617.00
      },
      isActive: true,
      priority: 9
    }
  ];

  useEffect(() => {
    loadAd();
  }, [placement, userLocation, userType]);

  useEffect(() => {
    if (!isPaused && currentAd && adConfigs.length > 1) {
      const interval = setInterval(() => {
        setAdIndex((prev) => (prev + 1) % adConfigs.length);
      }, 10000); // Rotate ads every 10 seconds

      return () => clearInterval(interval);
    }
  }, [isPaused, currentAd, adConfigs.length]);

  const loadAd = () => {
    setIsLoading(true);
    
    // Filter ads based on targeting
    const eligibleAds = adConfigs.filter(ad => {
      if (!ad.isActive) return false;
      
      // Check if ad matches current placement
      if (ad.position !== placement) return false;
      
      // Check location targeting
      if (ad.targeting.locations.length > 0 && 
          !ad.targeting.locations.includes(userLocation) && 
          !ad.targeting.locations.includes('all')) {
        return false;
      }
      
      // Check user type targeting
      if (ad.targeting.userTypes.length > 0 && 
          !ad.targeting.userTypes.includes(userType)) {
        return false;
      }
      
      return true;
    });

    // Sort by priority and select the best ad
    eligibleAds.sort((a, b) => b.priority - a.priority);
    
    if (eligibleAds.length > 0) {
      setCurrentAd(eligibleAds[adIndex % eligibleAds.length]);
    }
    
    setIsLoading(false);
  };

  const trackImpression = () => {
    if (currentAd) {
      // In production, this would call an analytics API
      console.log(`Ad impression tracked: ${currentAd.id}`);
    }
  };

  const trackClick = () => {
    if (currentAd) {
      // In production, this would call an analytics API
      console.log(`Ad click tracked: ${currentAd.id}`);
      
      // Open the link in a new window
      if (currentAd.content.linkUrl) {
        window.open(currentAd.content.linkUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const renderAdContent = () => {
    if (!currentAd) return null;

    const { content, type, size } = currentAd;

    switch (type) {
      case 'native':
        return (
          <div className="gcc-ad-native-content">
            <div className="gcc-ad-native-image">
              <img 
                src={content.imageUrl} 
                alt={content.title}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="gcc-ad-native-text">
              <h3 className="gcc-ad-native-title">{content.title}</h3>
              <p className="gcc-ad-native-description">{content.description}</p>
              <button 
                onClick={trackClick}
                className="gcc-ad-native-cta"
              >
                {content.ctaText}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {content.imageUrl && (
              <img 
                src={content.imageUrl} 
                alt={content.title}
                className="absolute inset-0 w-full h-full object-cover rounded-lg"
              />
            )}
            <div className="relative z-10 text-center p-4">
              {content.title && (
                <h3 className="font-bold text-lg mb-2 text-gray-900">
                  {content.title}
                </h3>
              )}
              {content.description && (
                <p className="text-sm text-gray-700 mb-3">
                  {content.description}
                </p>
              )}
              <button 
                onClick={trackClick}
                className="gcc-btn gcc-btn-primary gcc-btn-sm"
              >
                {content.ctaText}
              </button>
            </div>
          </div>
        );
    }
  };

  const getAdClassName = () => {
    const baseClass = 'gcc-ad';
    const placementClass = `gcc-ad-${placement}`;
    const customClass = className;
    
    return `${baseClass} ${placementClass} ${customClass}`.trim();
  };

  if (isLoading) {
    return (
      <div className={getAdClassName()}>
        <div className="gcc-ad-content">
          <div className="animate-pulse flex items-center justify-center h-full">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentAd) {
    return null;
  }

  // Track impression when ad comes into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackImpression();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    const adElement = document.getElementById(`ad-${currentAd.id}`);
    if (adElement) {
      observer.observe(adElement);
    }

    return () => observer.disconnect();
  }, [currentAd]);

  return (
    <div className={getAdClassName()}>
      {showLabel && (
        <div className="gcc-ad-label flex items-center gap-2">
          <span>Advertisement</span>
          <button
            onClick={() => setShowAdInfo(!showAdInfo)}
            className="opacity-60 hover:opacity-100 transition-opacity"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
      )}
      
      <div 
        id={`ad-${currentAd.id}`}
        className="gcc-ad-content"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {renderAdContent()}
        
        {/* Ad controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
          {adConfigs.length > 1 && (
            <>
              <button
                onClick={() => setAdIndex((prev) => (prev - 1 + adConfigs.length) % adConfigs.length)}
                className="p-1 bg-white/80 rounded-full shadow-sm hover:bg-white"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => setAdIndex((prev) => (prev + 1) % adConfigs.length)}
                className="p-1 bg-white/80 rounded-full shadow-sm hover:bg-white"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            onClick={() => {
              // In production, this would hide the ad for this session
              console.log('Ad hidden by user');
            }}
            className="p-1 bg-white/80 rounded-full shadow-sm hover:bg-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        
        {/* Ad indicators */}
        {adConfigs.length > 1 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {adConfigs.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === adIndex ? 'bg-blue-600' : 'bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Ad info popup */}
      {showAdInfo && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Ad Information</h4>
            <button
              onClick={() => setShowAdInfo(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Advertiser:</span>
              <span className="font-medium">{currentAd.content.advertiserName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium">{currentAd.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Priority:</span>
              <span className="font-medium">{currentAd.priority}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {currentAd.analytics.impressions.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MousePointer className="w-3 h-3" />
                  {currentAd.analytics.clicks.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {currentAd.analytics.ctr.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t">
            <button className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium">
              Report this ad
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Ad Placement Components for easy usage
export function TopBannerAd(props: Omit<AdManagerProps, 'placement'>) {
  return <AdManager placement="top-banner" {...props} />;
}

export function HeaderBannerAd(props: Omit<AdManagerProps, 'placement'>) {
  return <AdManager placement="header-banner" {...props} />;
}

export function SidebarAd(props: Omit<AdManagerProps, 'placement'>) {
  return <AdManager placement="sidebar" {...props} />;
}

export function ContentAd(props: Omit<AdManagerProps, 'placement'>) {
  return <AdManager placement="content" {...props} />;
}

export function FooterAd(props: Omit<AdManagerProps, 'placement'>) {
  return <AdManager placement="footer" {...props} />;
}

export function NativeAd(props: Omit<AdManagerProps, 'placement'>) {
  return <AdManager placement="native" {...props} />;
}

// Ad Dashboard Component for Admin
export function AdDashboard() {
  const [ads, setAds] = useState<AdConfig[]>([]);
  const [selectedAd, setSelectedAd] = useState<AdConfig | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ad Management</h1>
            <p className="text-gray-600 mt-2">Manage your advertising campaigns</p>
          </div>
          <button className="gcc-btn gcc-btn-primary">
            <DollarSign className="w-4 h-4" />
            Create New Ad
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="gcc-card">
            <div className="gcc-card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">$1,408.00</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="gcc-card">
            <div className="gcc-card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Impressions</p>
                  <p className="text-2xl font-bold text-gray-900">45,887</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="gcc-card">
            <div className="gcc-card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Clicks</p>
                  <p className="text-2xl font-bold text-gray-900">2,816</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MousePointer className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="gcc-card">
            <div className="gcc-card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. CTR</p>
                  <p className="text-2xl font-bold text-gray-900">6.14%</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ads List */}
        <div className="gcc-card">
          <div className="gcc-card-header">
            <h2 className="text-xl font-semibold text-gray-900">Active Campaigns</h2>
          </div>
          <div className="gcc-card-body">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Campaign</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Impressions</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Clicks</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">CTR</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Revenue</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad) => (
                    <tr key={ad.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <h4 className="font-medium text-gray-900">{ad.content.title}</h4>
                          <p className="text-sm text-gray-600">{ad.content.advertiserName}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="gcc-badge gcc-badge-primary">
                          {ad.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`gcc-badge ${
                          ad.isActive ? 'gcc-badge-success' : 'gcc-badge-warning'
                        }`}>
                          {ad.isActive ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {ad.analytics.impressions.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {ad.analytics.clicks.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {ad.analytics.ctr.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        ${ad.analytics.revenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button className="text-blue-600 hover:text-blue-700 text-sm">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-700 text-sm">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
