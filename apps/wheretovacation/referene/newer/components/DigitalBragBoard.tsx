'use client';

import React, { useState } from 'react';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Upload, 
  Camera, 
  Fish, 
  Users, 
  Calendar,
  TrendingUp,
  Award,
  Target,
  Star,
  ThumbsUp,
  MessageSquare,
  Share2,
  Filter,
  Search,
  ChevronDown,
  Gift,
  Zap
} from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  group: string;
  category: string;
  value: string;
  photo: string;
  date: string;
  captain: string;
  verified: boolean;
}

interface UserSubmission {
  id: string;
  userName: string;
  group: string;
  email: string;
  photo: File | null;
  fishType: string;
  size: string;
  weight: string;
  count: string;
  date: string;
  captain: string;
  story: string;
}

export default function DigitalBragBoard() {
  const [activeTab, setActiveTab] = useState<'biggest' | 'most' | 'recent'>('biggest');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const [biggestSnapper] = useState<LeaderboardEntry[]>([
    {
      id: '1',
      rank: 1,
      name: 'The Miller Family',
      group: 'Family of Four',
      category: 'Biggest Snapper',
      value: '12.5 lbs',
      photo: '/api/placeholder/300/400',
      date: '2024-11-15',
      captain: 'Captain Mike Thompson',
      verified: true
    },
    {
      id: '2',
      rank: 2,
      name: 'Robert Davis',
      group: 'Solo Angler',
      category: 'Biggest Snapper',
      value: '11.8 lbs',
      photo: '/api/placeholder/300/400',
      date: '2024-11-10',
      captain: 'Captain Sarah Jenkins',
      verified: true
    },
    {
      id: '3',
      rank: 3,
      name: 'The Johnson Group',
      group: 'Corporate Team',
      category: 'Biggest Snapper',
      value: '11.2 lbs',
      photo: '/api/placeholder/300/400',
      date: '2024-11-08',
      captain: 'Captain David Rodriguez',
      verified: true
    }
  ]);

  const [mostFish] = useState<LeaderboardEntry[]>([
    {
      id: '4',
      rank: 1,
      name: 'The Johnson Group',
      group: 'Corporate Team',
      category: 'Most Fish',
      value: '24 fish',
      photo: '/api/placeholder/300/400',
      date: '2024-11-14',
      captain: 'Captain Mike Thompson',
      verified: true
    },
    {
      id: '5',
      rank: 2,
      name: 'The Wilson Family',
      group: 'Family of Five',
      category: 'Most Fish',
      value: '18 fish',
      photo: '/api/placeholder/300/400',
      date: '2024-11-12',
      captain: 'Captain Sarah Jenkins',
      verified: true
    },
    {
      id: '6',
      rank: 3,
      name: 'The Martinez Crew',
      group: 'Friends Group',
      category: 'Most Fish',
      value: '15 fish',
      photo: '/api/placeholder/300/400',
      date: '2024-11-09',
      captain: 'Captain David Rodriguez',
      verified: true
    }
  ]);

  const [recentCatches] = useState<LeaderboardEntry[]>([
    {
      id: '7',
      rank: 0,
      name: 'Emma Thompson',
      group: 'Junior Angler',
      category: 'First Catch',
      value: '3.2 lbs',
      photo: '/api/placeholder/300/400',
      date: '2024-11-16',
      captain: 'Captain Mike Thompson',
      verified: true
    },
    {
      id: '8',
      rank: 0,
      name: 'The Garcia Family',
      group: 'Family of Three',
      category: 'Daily Catch',
      value: '6 fish',
      photo: '/api/placeholder/300/400',
      date: '2024-11-16',
      captain: 'Captain Sarah Jenkins',
      verified: true
    }
  ]);

  const getCurrentLeaderboard = () => {
    switch (activeTab) {
      case 'biggest':
        return biggestSnapper;
      case 'most':
        return mostFish;
      case 'recent':
        return recentCatches;
      default:
        return biggestSnapper;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Trophy className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-600" />;
      default:
        return <div className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-600">#{rank}</div>;
    }
  };

  const handleSubmitCatch = () => {
    setShowUploadForm(true);
  };

  const filteredEntries = getCurrentLeaderboard().filter(entry => {
    const matchesSearch = entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.captain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Digital Brag Board</h2>
              <p className="text-purple-100">Show off your amazing catches!</p>
            </div>
          </div>
          <button
            onClick={handleSubmitCatch}
            className="flex items-center gap-2 bg-yellow-500 text-purple-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Submit Your Catch
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-2 rounded-lg">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Season Leader Gets 10% Off Next Trip!</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-2 rounded-lg">
            <Gift className="w-4 h-4" />
            <span className="text-sm">Monthly Prizes for Top Anglers</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('biggest')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'biggest'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Target className="w-5 h-5" />
              Biggest Snapper
            </div>
          </button>
          <button
            onClick={() => setActiveTab('most')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'most'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Fish className="w-5 h-5" />
              Most Fish
            </div>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'recent'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Catches
            </div>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search anglers, groups, or captains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Categories</option>
              <option value="Biggest Snapper">Biggest Snapper</option>
              <option value="Most Fish">Most Fish</option>
              <option value="First Catch">First Catch</option>
              <option value="Daily Catch">Daily Catch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Photo */}
              <div className="aspect-[3/4] bg-gray-200 relative">
                <img 
                  src={entry.photo} 
                  alt={`${entry.name}'s catch`}
                  className="w-full h-full object-cover"
                />
                {entry.verified && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Verified
                  </div>
                )}
                {entry.rank > 0 && (
                  <div className="absolute top-2 left-2 bg-black/50 text-white p-2 rounded-full">
                    {getRankIcon(entry.rank)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{entry.name}</h3>
                    <p className="text-sm text-gray-600">{entry.group}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{entry.value}</p>
                    <p className="text-xs text-gray-500">{entry.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Fish className="w-4 h-4" />
                    <span>{entry.captain}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(entry.date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-200 transition-colors text-sm">
                    <ThumbsUp className="w-3 h-3" />
                    Like
                  </button>
                  <button className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                    <MessageSquare className="w-3 h-3" />
                    Comment
                  </button>
                  <button className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 transition-colors text-sm">
                    <Share2 className="w-3 h-3" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Season Stats */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            Season Stats
          </h4>
          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View Full Stats
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">247</div>
            <div className="text-sm text-gray-600">Total Submissions</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">89</div>
            <div className="text-sm text-gray-600">Unique Anglers</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">15.2 lbs</div>
            <div className="text-sm text-gray-600">Season Record</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">32</div>
            <div className="text-sm text-gray-600">Fish in One Trip</div>
          </div>
        </div>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-600" />
                Submit Your Catch
              </h3>
              <button
                onClick={() => setShowUploadForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>
            
            <form className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="John Smith"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="The Miller Family"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="john@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo Upload *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    required
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fish Type *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Red Snapper"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size/Length
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="24 inches"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="12.5 lbs"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Captain *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="">Select Captain</option>
                  <option value="Captain Mike Thompson">Captain Mike Thompson</option>
                  <option value="Captain Sarah Jenkins">Captain Sarah Jenkins</option>
                  <option value="Captain David Rodriguez">Captain David Rodriguez</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Story
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={3}
                  placeholder="Tell us about your catch and the experience..."
                />
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  <strong>Leaderboard Rules:</strong> All catches will be verified by captain. 
                  Season leader gets 10% off their next charter! Monthly prizes for top performers.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Submit Your Catch
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
