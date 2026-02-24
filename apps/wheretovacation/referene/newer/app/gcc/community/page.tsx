'use client';

import React, { useState, useEffect } from 'react';
import GCCNavigation from '@/components/GCCNavigation';
import GCCFooter from '@/components/GCCFooter';
import DailyDockLog from '@/components/DailyDockLog';
import AnglerOfMonth from '@/components/angler-of-month';
import CookYourCatchMap from '@/components/CookYourCatchMap';
import DigitalBragBoard from '@/components/DigitalBragBoard';
import SafetyValidation from '@/components/SafetyValidation';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Award, 
  MessageSquare, 
  Heart,
  Share2,
  Bell,
  Zap,
  Target,
  Fish,
  Camera,
  Star,
  Trophy,
  ChevronRight,
  Activity,
  Gift,
  Crown,
  Anchor,
  MapPin,
  Clock,
  ThumbsUp,
  Eye
} from 'lucide-react';

interface CommunityStats {
  totalMembers: number;
  activeToday: number;
  postsThisWeek: number;
  photosShared: number;
  topContributor: string;
  monthlyGrowth: number;
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'dock-log' | 'angler' | 'cook-catch' | 'brag-board' | 'safety'>('overview');
  const [communityStats, setCommunityStats] = useState<CommunityStats>({
    totalMembers: 1247,
    activeToday: 89,
    postsThisWeek: 156,
    photosShared: 423,
    topContributor: 'The Miller Family',
    monthlyGrowth: 12.5
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  useEffect(() => {
    // Simulate real-time stats updates
    const interval = setInterval(() => {
      setCommunityStats(prev => ({
        ...prev,
        activeToday: prev.activeToday + Math.floor(Math.random() * 3),
        postsThisWeek: prev.postsThisWeek + Math.floor(Math.random() * 2),
        photosShared: prev.photosShared + Math.floor(Math.random() * 1)
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const notifications = [
    {
      id: '1',
      type: 'new_catch',
      message: 'The Johnson Group just posted a 15lb Red Snapper!',
      time: '2 minutes ago',
      read: false
    },
    {
      id: '2',
      type: 'leaderboard',
      message: 'You moved up to #3 in the Biggest Snapper leaderboard!',
      time: '15 minutes ago',
      read: false
    },
    {
      id: '3',
      type: 'community',
      message: 'New comment on your cook-your-catch review',
      time: '1 hour ago',
      read: false
    }
  ];

  const TabButton = ({ id, icon: Icon, label, count }: { 
    id: string; 
    icon: any; 
    label: string; 
    count?: number; 
  }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
        activeTab === id
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
      {count && (
        <span className={`px-2 py-1 rounded-full text-xs ${
          activeTab === id ? 'bg-blue-700' : 'bg-gray-200 text-gray-700'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  const StatCard = ({ icon: Icon, label, value, change, color }: {
    icon: any;
    label: string;
    value: string;
    change?: string;
    color: string;
  }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change && (
          <span className="text-green-600 text-sm font-medium flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <GCCNavigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Gulf Coast Community</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Join our vibrant community of fishing enthusiasts, families, and adventurers. 
              Share your catches, celebrate successes, and connect with fellow anglers who love the Gulf Coast.
            </p>
          </div>

          {/* Community Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Community Members"
              value={communityStats.totalMembers.toLocaleString()}
              change={`+${communityStats.monthlyGrowth}%`}
              color="bg-blue-500"
            />
            <StatCard
              icon={Activity}
              label="Active Today"
              value={communityStats.activeToday}
              color="bg-green-500"
            />
            <StatCard
              icon={MessageSquare}
              label="Posts This Week"
              value={communityStats.postsThisWeek}
              color="bg-purple-500"
            />
            <StatCard
              icon={Camera}
              label="Photos Shared"
              value={communityStats.photosShared}
              color="bg-orange-500"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4">
            <button className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              <Camera className="w-5 h-5" />
              Share Your Catch
            </button>
            <button className="flex items-center gap-2 bg-yellow-500 text-blue-900 px-6 py-3 rounded-lg font-medium hover:bg-yellow-400 transition-colors">
              <Trophy className="w-5 h-5" />
              View Leaderboard
            </button>
            <button className="flex items-center gap-2 bg-white/20 backdrop-blur text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-colors">
              <Gift className="w-5 h-5" />
              Monthly Prizes
            </button>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 py-4 overflow-x-auto">
              <TabButton id="overview" icon={Users} label="Overview" />
              <TabButton id="dock-log" icon={Fish} label="Daily Dock Log" count={communityStats.postsThisWeek} />
              <TabButton id="angler" icon={Award} label="Angler of the Month" />
              <TabButton id="cook-catch" icon={MapPin} label="Cook Your Catch" count={12} />
              <TabButton id="brag-board" icon={Trophy} label="Brag Board" count={communityStats.photosShared} />
              <TabButton id="safety" icon={Anchor} label="Safety & Gear" />
            </div>
            
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={`p-4 border-b hover:bg-gray-50 ${!notif.read ? 'bg-blue-50' : ''}`}>
                        <p className="text-sm text-gray-900 mb-1">{notif.message}</p>
                        <p className="text-xs text-gray-500">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Featured Content */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Trending Now
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <img src="/api/placeholder/80/80" alt="Catch" className="w-20 h-20 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">12.5 lb Red Snapper!</h4>
                        <p className="text-sm text-gray-600 mb-2">The Miller Family with Captain Mike</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            45
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            12
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            234
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <img src="/api/placeholder/80/80" alt="Catch" className="w-20 h-20 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">First Catch Celebration!</h4>
                        <p className="text-sm text-gray-600 mb-2">Emma's first fish - 3.2 lb Speckled Trout</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            67
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            23
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            456
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Current Leader
                  </h3>
                  <div className="text-center">
                    <img src="/api/placeholder/120/120" alt="Leader" className="w-24 h-24 rounded-full mx-auto mb-3" />
                    <h4 className="font-bold text-gray-900">The Miller Family</h4>
                    <p className="text-sm text-gray-600 mb-2">Biggest Snapper: 12.5 lbs</p>
                    <div className="flex items-center justify-center gap-1 text-yellow-500">
                      <Star className="w-5 h-5 fill-yellow-500" />
                      <Star className="w-5 h-5 fill-yellow-500" />
                      <Star className="w-5 h-5 fill-yellow-500" />
                      <Star className="w-5 h-5 fill-yellow-500" />
                      <Star className="w-5 h-5 fill-yellow-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Access Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Fish className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Daily Dock Log</h4>
                <p className="text-sm text-gray-600 mb-4">Real-time catch reports and fishing conditions</p>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  View Live Feed
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Brag Board</h4>
                <p className="text-sm text-gray-600 mb-4">Compete for the biggest catch and seasonal prizes</p>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  View Leaderboard
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Cook Your Catch</h4>
                <p className="text-sm text-gray-600 mb-4">Find restaurants that will prepare your fresh catch</p>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  View Map
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-red-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Angler of the Month</h4>
                <p className="text-sm text-gray-600 mb-4">Featured anglers and their amazing stories</p>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  Meet Winners
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Community Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                Recent Community Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Camera className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">Sarah Johnson</span> shared a photo of her catch
                    </p>
                    <p className="text-xs text-gray-500">5 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Star className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">Mike Thompson</span> rated Tacky Jacks 5 stars
                    </p>
                    <p className="text-xs text-gray-500">15 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">The Wilson Family</span> moved up in the leaderboard
                    </p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Individual Tab Contents */}
        {activeTab === 'dock-log' && <DailyDockLog />}
        {activeTab === 'angler' && <AnglerOfMonth />}
        {activeTab === 'cook-catch' && <CookYourCatchMap />}
        {activeTab === 'brag-board' && <DigitalBragBoard />}
        {activeTab === 'safety' && <SafetyValidation />}
      </section>

      {/* Community CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Join Our Thriving Community</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Connect with fellow anglers, share your adventures, and be part of the most exciting 
            fishing community on the Gulf Coast.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              Sign Up Now
            </button>
            <button className="bg-white/20 backdrop-blur text-white px-8 py-3 rounded-lg font-medium hover:bg-white/30 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </section>

      <GCCFooter />
    </div>
  );
}
