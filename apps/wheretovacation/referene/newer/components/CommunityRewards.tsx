'use client';

import React, { useState } from 'react';
import { 
  Trophy, 
  Gift, 
  Star, 
  Target, 
  Zap, 
  Crown,
  Award,
  Medal,
  Gem,
  Lock,
  Unlock,
  CheckCircle,
  Calendar,
  TrendingUp,
  Users,
  Fish,
  Camera,
  Heart,
  MessageSquare,
  Share2,
  ChevronRight,
  Clock,
  Flame,
  Shield,
  Anchor,
  Compass,
  MapPin,
  ThumbsUp,
  BarChart3,
  Sparkles,
  Rocket
} from 'lucide-react';

interface Reward {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'achievement' | 'milestone' | 'special' | 'seasonal';
  points: number;
  unlocked: boolean;
  progress?: number;
  total?: number;
  reward?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'community' | 'team';
  startDate: string;
  endDate: string;
  participants: number;
  goal: number;
  current: number;
  reward: string;
  joined: boolean;
}

interface LeaderboardPosition {
  rank: number;
  name: string;
  points: number;
  badges: number;
  streak: number;
}

export default function CommunityRewards() {
  const [activeTab, setActiveTab] = useState<'rewards' | 'challenges' | 'leaderboard' | 'shop'>('rewards');
  const [userPoints, setUserPoints] = useState(2450);

  const rewards: Reward[] = [
    {
      id: '1',
      name: 'First Catch',
      description: 'Share your first successful catch with the community',
      icon: Fish,
      category: 'achievement',
      points: 50,
      unlocked: true,
      reward: 'First Catch Badge',
      rarity: 'common'
    },
    {
      id: '2',
      name: 'Social Butterfly',
      description: 'Get 50 likes on your community posts',
      icon: Heart,
      category: 'achievement',
      points: 100,
      unlocked: true,
      progress: 50,
      total: 50,
      reward: 'Social Badge',
      rarity: 'common'
    },
    {
      id: '3',
      name: 'Storyteller',
      description: 'Write 10 detailed catch reports',
      icon: MessageSquare,
      category: 'achievement',
      points: 150,
      unlocked: false,
      progress: 7,
      total: 10,
      reward: 'Storyteller Badge',
      rarity: 'rare'
    },
    {
      id: '4',
      name: 'Big Snapper Hunter',
      description: 'Catch a Red Snapper over 10 pounds',
      icon: Trophy,
      category: 'milestone',
      points: 200,
      unlocked: false,
      progress: 8.5,
      total: 10,
      reward: 'Big Hunter Badge',
      rarity: 'rare'
    },
    {
      id: '5',
      name: 'Community Leader',
      description: 'Reach the top of the seasonal leaderboard',
      icon: Crown,
      category: 'special',
      points: 500,
      unlocked: false,
      reward: '10% Off Next Charter',
      rarity: 'epic'
    },
    {
      id: '6',
      name: 'Photographer',
      description: 'Share 25 high-quality photos',
      icon: Camera,
      category: 'achievement',
      points: 125,
      unlocked: true,
      progress: 25,
      total: 25,
      reward: 'Photographer Badge',
      rarity: 'common'
    },
    {
      id: '7',
      name: 'Conservation Hero',
      description: 'Practice catch and release 20 times',
      icon: Shield,
      category: 'special',
      points: 300,
      unlocked: false,
      progress: 12,
      total: 20,
      reward: 'Conservation Badge',
      rarity: 'epic'
    },
    {
      id: '8',
      name: 'Season Champion',
      description: 'Win the seasonal fishing challenge',
      icon: Award,
      category: 'seasonal',
      points: 1000,
      unlocked: false,
      reward: 'Free Charter + Merchandise',
      rarity: 'legendary'
    }
  ];

  const challenges: Challenge[] = [
    {
      id: '1',
      title: 'November Big Catch Challenge',
      description: 'Catch the biggest fish this month and win a free half-day charter!',
      type: 'individual',
      startDate: '2024-11-01',
      endDate: '2024-11-30',
      participants: 67,
      goal: 100,
      current: 89,
      reward: 'Free Half-Day Charter',
      joined: true
    },
    {
      id: '2',
      title: 'Community Photo Contest',
      description: 'Share your best fishing photos. The community votes for the winner!',
      type: 'community',
      startDate: '2024-11-15',
      endDate: '2024-11-30',
      participants: 45,
      goal: 200,
      current: 156,
      reward: 'GoPro Camera + Gear Package',
      joined: false
    },
    {
      id: '3',
      title: 'Team Fishing Tournament',
      description: 'Form a team of 4 and compete for the most combined catches',
      type: 'team',
      startDate: '2024-12-01',
      endDate: '2024-12-15',
      participants: 32,
      goal: 50,
      current: 32,
      reward: 'Team Dinner + Prizes',
      joined: false
    }
  ];

  const leaderboard: LeaderboardPosition[] = [
    { rank: 1, name: 'The Miller Family', points: 3250, badges: 12, streak: 15 },
    { rank: 2, name: 'Sarah Johnson', points: 2890, badges: 10, streak: 8 },
    { rank: 3, name: 'Mike Thompson', points: 2450, badges: 9, streak: 12 },
    { rank: 4, name: 'The Wilson Group', points: 2100, badges: 7, streak: 5 },
    { rank: 5, name: 'Emma Davis', points: 1850, badges: 6, streak: 3 }
  ];

  const shopItems = [
    { id: '1', name: 'GCC T-Shirt', points: 500, description: 'Premium quality community t-shirt' },
    { id: '2', name: '10% Off Charter', points: 1000, description: 'Discount on your next fishing trip' },
    { id: '3', name: 'Free Half-Day Charter', points: 2000, description: 'Complimentary 4-hour fishing trip' },
    { id: '4', name: 'GoPro Hero Camera', points: 5000, description: 'Capture your adventures in 4K' },
    { id: '5', name: 'Premium Fishing Rod', points: 3000, description: 'Professional grade fishing equipment' }
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-200 text-gray-800';
      case 'rare': return 'bg-blue-200 text-blue-800';
      case 'epic': return 'bg-purple-200 text-purple-800';
      case 'legendary': return 'bg-yellow-200 text-yellow-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const TabButton = ({ id, label, count }: { 
    id: string; 
    label: string; 
    count?: number; 
  }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        activeTab === id
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
      {count && <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{count}</span>}
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Community Rewards</h2>
              <p className="text-purple-100">Earn points, unlock achievements, and win prizes!</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{userPoints.toLocaleString()}</div>
            <div className="text-sm text-purple-100">Your Points</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">8</div>
            <div className="text-xs text-purple-100">Achievements</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">3</div>
            <div className="text-xs text-purple-100">Active Challenges</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">#3</div>
            <div className="text-xs text-purple-100">Leaderboard Rank</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">12</div>
            <div className="text-xs text-purple-100">Day Streak</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="p-6 border-b">
        <div className="flex gap-2">
          <TabButton id="rewards" label="Achievements" count={rewards.length} />
          <TabButton id="challenges" label="Challenges" count={challenges.length} />
          <TabButton id="leaderboard" label="Leaderboard" />
          <TabButton id="shop" label="Rewards Shop" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Achievements Tab */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward) => {
                const Icon = reward.icon;
                return (
                  <div
                    key={reward.id}
                    className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                      getRarityColor(reward.rarity)
                    } ${!reward.unlocked ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        reward.unlocked ? 'bg-blue-100' : 'bg-gray-200'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          reward.unlocked ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityBadge(reward.rarity)}`}>
                          {reward.rarity}
                        </span>
                        {reward.unlocked ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-1">{reward.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                    
                    {reward.progress !== undefined && reward.total !== undefined && (
                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{reward.progress}/{reward.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(reward.progress / reward.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-gray-900">{reward.points} pts</span>
                      </div>
                      {reward.reward && (
                        <span className="text-xs text-green-600 font-medium">{reward.reward}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{challenge.title}</h3>
                    <p className="text-gray-600 mb-3">{challenge.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{challenge.participants} participants</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        <span>{challenge.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{challenge.reward}</div>
                    <div className="text-sm text-gray-600">Prize</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Community Progress</span>
                    <span>{challenge.current}/{challenge.goal}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all"
                      style={{ width: `${(challenge.current / challenge.goal) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-gray-600">
                      {Math.round((challenge.current / challenge.goal) * 100)}% Complete
                    </span>
                  </div>
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      challenge.joined
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {challenge.joined ? 'Joined ✓' : 'Join Challenge'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
                <Trophy className="w-5 h-5" />
                <span className="font-medium">Season Ends in 14 Days</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Points</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Badges</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((position) => (
                    <tr key={position.rank} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {position.rank === 1 && <Crown className="w-5 h-5 text-yellow-500" />}
                          {position.rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                          {position.rank === 3 && <Medal className="w-5 h-5 text-orange-600" />}
                          <span className="font-bold">#{position.rank}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{position.name}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-blue-600">{position.points.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-purple-500" />
                          <span>{position.badges}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span>{position.streak} days</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Available Points</h3>
                  <p className="text-2xl font-bold text-blue-600">{userPoints.toLocaleString()} pts</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-800 mb-1">Points refresh monthly</p>
                  <p className="text-xs text-blue-600">Earn more by participating!</p>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shopItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="w-full h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    <Gift className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold text-blue-600">{item.points} pts</span>
                    </div>
                    <button
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        userPoints >= item.points
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={userPoints < item.points}
                    >
                      {userPoints >= item.points ? 'Redeem' : 'Insufficient'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
