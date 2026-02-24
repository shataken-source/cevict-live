'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  Calendar, 
  Award, 
  Target,
  Zap,
  Crown,
  Shield,
  Flame,
  CheckCircle,
  BarChart3,
  Users,
  Heart,
  MessageSquare,
  Camera,
  Clock
} from 'lucide-react';

// Import from your points system
import { usePoints, POINT_ACTIONS, TRUST_LEVELS } from './community-points-system';

interface PointsDisplayProps {
  userId: string;
  showDetails?: boolean;
  compact?: boolean;
}

interface UserStats {
  total_points: number;
  trust_level: number;
  trust_level_name: string;
  posts_count: number;
  comments_count: number;
  current_streak: number;
  longest_streak: number;
  photos_count: number;
  videos_count: number;
}

interface Badge {
  id: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  badge_points: number;
  earned_at: string;
}

export default function PointsDisplay({ userId, showDetails = false, compact = false }: PointsDisplayProps) {
  const { stats, loading } = usePoints(userId);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [nextLevel, setNextLevel] = useState<any>(null);
  const [pointsToNext, setPointsToNext] = useState(0);

  useEffect(() => {
    if (stats) {
      // Calculate next trust level
      const currentLevel = Object.values(TRUST_LEVELS).find(
        level => level.level === stats.trust_level
      );
      
      const allLevels = Object.values(TRUST_LEVELS).sort((a, b) => a.level - b.level);
      const currentIndex = allLevels.findIndex(level => level.level === stats.trust_level);
      const nextLevelData = allLevels[currentIndex + 1];
      
      if (nextLevelData) {
        setNextLevel(nextLevelData);
        setPointsToNext(nextLevelData.minPoints - stats.total_points);
      }

      // Fetch user badges
      fetchUserBadges();
    }
  }, [stats]);

  const fetchUserBadges = async () => {
    try {
      const response = await fetch('/api/community/getUserBadges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      setBadges(data.slice(0, compact ? 3 : 6)); // Show fewer badges in compact mode
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  const getTrustLevelIcon = (level: number) => {
    switch (level) {
      case 4: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 3: return <Shield className="w-5 h-5 text-purple-500" />;
      case 2: return <Star className="w-5 h-5 text-blue-500" />;
      case 1: return <Award className="w-5 h-5 text-green-500" />;
      default: return <Target className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTrustLevelColor = (level: number) => {
    switch (level) {
      case 4: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 3: return 'bg-purple-100 text-purple-800 border-purple-200';
      case 2: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 1: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.total_points.toLocaleString()}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTrustLevelColor(stats.trust_level)}`}>
              {getTrustLevelIcon(stats.trust_level)}
              <span>{stats.trust_level_name}</span>
            </div>
          </div>
          {stats.current_streak > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-medium">{stats.current_streak}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Community Points</h2>
              <p className="text-yellow-100">Your engagement achievements</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.total_points.toLocaleString()}</div>
            <div className="text-sm text-yellow-100">Total Points</div>
          </div>
        </div>

        {/* Trust Level */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium border ${getTrustLevelColor(stats.trust_level)}`}>
            {getTrustLevelIcon(stats.trust_level)}
            <span>{stats.trust_level_name}</span>
          </div>
          {nextLevel && (
            <div className="text-sm text-yellow-100">
              {pointsToNext.toLocaleString()} points to {nextLevel.name}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-900 mb-1">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              {stats.posts_count}
            </div>
            <div className="text-sm text-gray-600">Posts</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-900 mb-1">
              <Heart className="w-5 h-5 text-red-500" />
              {stats.comments_count}
            </div>
            <div className="text-sm text-gray-600">Comments</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-900 mb-1">
              <Camera className="w-5 h-5 text-purple-500" />
              {stats.photos_count}
            </div>
            <div className="text-sm text-gray-600">Photos</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-900 mb-1">
              <Flame className="w-5 h-5 text-orange-500" />
              {stats.current_streak}
            </div>
            <div className="text-sm text-gray-600">Day Streak</div>
          </div>
        </div>

        {/* Progress to Next Level */}
        {nextLevel && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress to {nextLevel.name}</span>
              <span>{Math.round((stats.total_points / nextLevel.minPoints) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((stats.total_points / nextLevel.minPoints) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Recent Badges */}
        {badges.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Recent Badges
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {badges.map((badge) => (
                <div key={badge.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="text-2xl">{badge.badge_icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{badge.badge_name}</h4>
                    <p className="text-xs text-gray-500">+{badge.badge_points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {showDetails && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Daily Check-in</span>
              </button>
              <button className="flex items-center justify-center gap-2 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">View Leaderboard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for displaying points in a compact card format
export function PointsCard({ userId, action }: { userId: string; action: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAwardPoints = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/community/handleCommunityAPI', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'awardPoints',
          userId,
          pointsAction: action
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionInfo = (actionType: string) => {
    const actionInfo: any = {
      [POINT_ACTIONS.CREATE_FISHING_REPORT]: { label: 'Post Report', points: 25, color: 'blue' },
      [POINT_ACTIONS.CREATE_FISHING_REPORT_WITH_PHOTO]: { label: 'Photo Report', points: 35, color: 'purple' },
      [POINT_ACTIONS.DAILY_CHECK_IN]: { label: 'Check In', points: 3, color: 'green' },
      [POINT_ACTIONS.COMMENT_ON_POST]: { label: 'Comment', points: 5, color: 'orange' },
    };
    return actionInfo[actionType] || { label: 'Action', points: 0, color: 'gray' };
  };

  const actionInfo = getActionInfo(action);

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 bg-${actionInfo.color}-100 rounded-full flex items-center justify-center`}>
            <Zap className={`w-4 h-4 text-${actionInfo.color}-600`} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{actionInfo.label}</h4>
            <p className="text-sm text-gray-600">+{actionInfo.points} points</p>
          </div>
        </div>
        <button
          onClick={handleAwardPoints}
          disabled={loading}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            success 
              ? 'bg-green-100 text-green-700' 
              : `bg-${actionInfo.color}-600 text-white hover:bg-${actionInfo.color}-700`
          }`}
        >
          {success ? (
            <CheckCircle className="w-4 h-4" />
          ) : loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Claim'
          )}
        </button>
      </div>
    </div>
  );
}

// Leaderboard component
export function CommunityLeaderboard({ period = 'week', limit = 10 }: { period?: string; limit?: number }) {
  const { leaderboard, loading } = useLeaderboard(period);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Award className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-orange-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Community Leaderboard
          </h3>
          <select
            value={period}
            onChange={(e) => window.location.href = `/community?period=${e.target.value}`}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="divide-y">
        {leaderboard.slice(0, limit).map((user: any, index: number) => (
          <div key={user.user_id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {getRankIcon(user.rank)}
              </div>
              <img 
                src={user.avatar_url || '/api/placeholder/40/40'} 
                alt={user.username}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">{user.username}</h4>
                  {user.is_captain && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">Captain</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{user.trust_level_name}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{user.points.toLocaleString()}</div>
                <div className="text-sm text-gray-600">points</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <div className="p-12 text-center">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leaderboard data yet</h3>
          <p className="text-gray-600">Start participating to see your name here!</p>
        </div>
      )}
    </div>
  );
}
