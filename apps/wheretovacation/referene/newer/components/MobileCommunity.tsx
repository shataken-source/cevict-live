'use client';

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Fish, 
  Trophy, 
  MapPin, 
  Users, 
  Plus, 
  Bell, 
  Search,
  Heart,
  MessageSquare,
  Share2,
  Camera,
  TrendingUp,
  Clock,
  Star,
  ChevronRight,
  Menu,
  X,
  Filter,
  RefreshCw,
  User,
  Settings,
  LogOut,
  Zap,
  Target,
  Award,
  Calendar
} from 'lucide-react';

interface MobilePost {
  id: string;
  type: 'catch' | 'review' | 'achievement';
  author: string;
  avatar: string;
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: number;
  liked: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  color: string;
  action: () => void;
}

export default function MobileCommunity() {
  const [activeTab, setActiveTab] = useState<'home' | 'dock' | 'brag' | 'map' | 'profile'>('home');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<MobilePost[]>([
    {
      id: '1',
      type: 'catch',
      author: 'The Miller Family',
      avatar: '/api/placeholder/40/40',
      content: 'Just caught this beautiful 12.5 lb Red Snapper with Captain Mike! The kids had an amazing time!',
      image: '/api/placeholder/400/300',
      timestamp: '2 minutes ago',
      likes: 45,
      comments: 12,
      liked: false
    },
    {
      id: '2',
      type: 'review',
      author: 'Sarah Johnson',
      avatar: '/api/placeholder/40/40',
      content: 'Tacky Jacks cooked our catch perfectly! 5/5 stars for the blackened snapper preparation.',
      timestamp: '15 minutes ago',
      likes: 23,
      comments: 8,
      liked: true
    },
    {
      id: '3',
      type: 'achievement',
      author: 'Emma Davis',
      avatar: '/api/placeholder/40/40',
      content: 'Just earned my First Catch badge! 🎣 Thanks Captain Sarah for the amazing guidance!',
      timestamp: '1 hour ago',
      likes: 67,
      comments: 15,
      liked: false
    }
  ]);

  const quickActions: QuickAction[] = [
    {
      id: '1',
      label: 'Share Catch',
      icon: Camera,
      color: 'bg-blue-600',
      action: () => console.log('Open camera')
    },
    {
      id: '2',
      label: 'Leaderboard',
      icon: Trophy,
      color: 'bg-yellow-500',
      action: () => setActiveTab('brag')
    },
    {
      id: '3',
      label: 'Restaurants',
      icon: MapPin,
      color: 'bg-green-600',
      action: () => setActiveTab('map')
    },
    {
      id: '4',
      label: 'Live Feed',
      icon: Fish,
      color: 'bg-purple-600',
      action: () => setActiveTab('dock')
    }
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  const TabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="flex-1 overflow-y-auto pb-20">
            {/* Quick Actions */}
            <div className="p-4 bg-white border-b">
              <div className="grid grid-cols-4 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={action.action}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs text-gray-700 font-medium">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Posts Feed */}
            <div className="divide-y">
              {posts.map((post) => (
                <div key={post.id} className="p-4 bg-white">
                  <div className="flex items-start gap-3 mb-3">
                    <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900">{post.author}</h4>
                        <span className="text-xs text-gray-500">{post.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{post.content}</p>
                      {post.image && (
                        <img src={post.image} alt="Post" className="w-full rounded-lg mb-3" />
                      )}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1 text-sm transition-colors ${
                            post.liked ? 'text-red-600' : 'text-gray-600'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${post.liked ? 'fill-red-600' : ''}`} />
                          {post.likes}
                        </button>
                        <button className="flex items-center gap-1 text-sm text-gray-600">
                          <MessageSquare className="w-4 h-4" />
                          {post.comments}
                        </button>
                        <button className="flex items-center gap-1 text-sm text-gray-600">
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'dock':
        return (
          <div className="flex-1 overflow-y-auto pb-20">
            <div className="p-4 bg-white">
              <h3 className="font-bold text-gray-900 mb-4">Daily Dock Log</h3>
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">Captain Mike</span>
                    <span className="text-xs text-gray-500">2 min ago</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">Red Snapper - 12.5 lbs</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Perdido Pass</span>
                    <span>•</span>
                    <span>Sunny, light winds</span>
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">Captain Sarah</span>
                    <span className="text-xs text-gray-500">15 min ago</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">King Mackerel - 18.2 lbs</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Gulf Shores</span>
                    <span>•</span>
                    <span>Partly cloudy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'brag':
        return (
          <div className="flex-1 overflow-y-auto pb-20">
            <div className="p-4 bg-white">
              <h3 className="font-bold text-gray-900 mb-4">Leaderboard</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">The Miller Family</p>
                    <p className="text-sm text-gray-600">12.5 lb Red Snapper</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-600">1,250 pts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Sarah Johnson</p>
                    <p className="text-sm text-gray-600">11.8 lb Red Snapper</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-600">980 pts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Mike Thompson</p>
                    <p className="text-sm text-gray-600">11.2 lb Red Snapper</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">850 pts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'map':
        return (
          <div className="flex-1 overflow-y-auto pb-20">
            <div className="p-4 bg-white">
              <h3 className="font-bold text-gray-900 mb-4">Cook Your Catch</h3>
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Tacky Jacks</h4>
                    <span className="text-sm text-yellow-600">4.5 ⭐</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">2.3 miles • 15-20 min prep</p>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">
                    Get Directions
                  </button>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Fisher's at Orange Beach Marina</h4>
                    <span className="text-sm text-yellow-600">4.7 ⭐</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">0.1 miles • 10-15 min prep</p>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">
                    Get Directions
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="flex-1 overflow-y-auto pb-20">
            <div className="p-4 bg-white">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">John Angler</h3>
                <p className="text-sm text-gray-600">Member since Nov 2024</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">2450</p>
                  <p className="text-xs text-gray-600">Points</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">8</p>
                  <p className="text-xs text-gray-600">Badges</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">12</p>
                  <p className="text-xs text-gray-600">Streak</p>
                </div>
              </div>

              <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">My Achievements</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">My Catches</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Settings</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg text-red-600">
                  <span className="text-sm font-medium">Sign Out</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-lg font-bold">GCC Community</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="p-2 hover:bg-blue-700 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowMobileMenu(false)}>
          <div className="bg-white w-64 h-full p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-900">Menu</h2>
              <button onClick={() => setShowMobileMenu(false)}>
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <nav className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                <Search className="w-5 h-5" />
                <span>Search</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                <Filter className="w-5 h-5" />
                <span>Filter</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                <Trophy className="w-5 h-5" />
                <span>Challenges</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                <Award className="w-5 h-5" />
                <span>Rewards</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                <Calendar className="w-5 h-5" />
                <span>Events</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {TabContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t flex items-center justify-around py-2">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === 'home' ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Home</span>
        </button>
        <button
          onClick={() => setActiveTab('dock')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === 'dock' ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Fish className="w-5 h-5" />
          <span className="text-xs">Dock Log</span>
        </button>
        <button
          onClick={() => setActiveTab('brag')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === 'brag' ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-xs">Leaderboard</span>
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === 'map' ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-xs">Map</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === 'profile' ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs">Profile</span>
        </button>
      </nav>

      {/* Floating Action Button */}
      <button className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
