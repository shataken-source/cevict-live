/**
 * Gamification Dashboard
 * 
 * Comprehensive dashboard showing all gamification features:
 * - Daily check-in with streaks
 * - Quest progress
 * - Achievement tracking
 * - Points summary
 * - Leaderboard position
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Trophy, Flame, Target, Gift, TrendingUp,
  Star, Award, Calendar, Zap, MessageSquare, Reply
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type UserStats = {
  totalPoints: number;
  rank: string;
  rankPosition: number;
  currentStreak: number;
  unlockedAchievements: number;
  totalAchievements: number;
  completedQuests: number;
  activeQuests: number;
};

type ExtendedStats = {
  posts: number;
  replies: number;
  helpfulVotes: number;
  nextTier: string;
  nextTierPoints: number;
  pointsToNextTier: number;
  progressToNextTier: number;
  badges: any[];
};

export default function GamificationDashboard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<UserStats>({
    totalPoints: 0,
    rank: 'bronze',
    rankPosition: 0,
    currentStreak: 0,
    unlockedAchievements: 0,
    totalAchievements: 12,
    completedQuests: 0,
    activeQuests: 0,
  });
  const [userStatsData, setUserStatsData] = useState<ExtendedStats>({
    posts: 0,
    replies: 0,
    helpfulVotes: 0,
    nextTier: 'Silver',
    nextTierPoints: 2500,
    pointsToNextTier: 2500,
    progressToNextTier: 0,
    badges: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Load user points and tier from shared_users
      const { data: userData } = await supabase
        .from('shared_users')
        .select('total_points, loyalty_tier')
        .eq('id', userId)
        .single();

      // Load user stats (posts, replies, etc.)
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Load badges
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId);

      // Calculate leaderboard rank
      const { data: allUsers } = await supabase
        .from('shared_users')
        .select('id, total_points')
        .order('total_points', { ascending: false })
        .limit(1000);

      const rankPosition = allUsers ? (allUsers.findIndex(u => u.id === userId) + 1) : 0;

      // Calculate next tier requirements
      const currentPoints = userData?.total_points || 0;
      let nextTier = 'Silver';
      let nextTierPoints = 2500;
      if (currentPoints >= 10000) {
        nextTier = 'Max';
        nextTierPoints = 10000;
      } else if (currentPoints >= 5000) {
        nextTier = 'Platinum';
        nextTierPoints = 10000;
      } else if (currentPoints >= 2500) {
        nextTier = 'Gold';
        nextTierPoints = 5000;
      }

      const pointsToNextTier = Math.max(0, nextTierPoints - currentPoints);
      const progressToNextTier = nextTier === 'Max' 
        ? 100 
        : Math.min(100, (currentPoints / nextTierPoints) * 100);

      setStats({
        totalPoints: userData?.total_points || 0,
        rank: userData?.loyalty_tier || 'bronze',
        rankPosition: rankPosition || 0,
        currentStreak: statsData?.current_streak || 0,
        unlockedAchievements: badgesData?.length || 0,
        totalAchievements: 12, // Total available badges (from badges.ts)
        completedQuests: 0, // Not implemented yet
        activeQuests: 0, // Not implemented yet
      });

      // Store additional data for display
      setUserStatsData({
        posts: statsData?.posts_count || 0,
        replies: statsData?.replies_count || 0,
        helpfulVotes: statsData?.helpful_votes_received || 0,
        nextTier,
        nextTierPoints,
        pointsToNextTier,
        progressToNextTier,
        badges: badgesData || [],
      });

    } catch (error: any) {
      console.error('Error loading gamification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTierColor = (tier: string) => {
    const tierLower = tier.toLowerCase();
    if (tierLower === 'platinum') return 'bg-gradient-to-r from-blue-400 to-purple-400 text-white';
    if (tierLower === 'gold') return 'bg-yellow-400 text-yellow-900';
    if (tierLower === 'silver') return 'bg-gray-400 text-gray-900';
    return 'bg-amber-700 text-white';
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-semibold">Total Points</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
            <Badge className={`mt-2 ${getTierColor(stats.rank)}`}>
              {stats.rank.charAt(0).toUpperCase() + stats.rank.slice(1)}
            </Badge>
            {stats.rankPosition > 0 && (
              <p className="text-xs text-gray-500 mt-1">Rank #{stats.rankPosition}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-semibold">Next Tier</span>
            </div>
            <p className="text-lg font-bold">{userStatsData.nextTier}</p>
            <Progress 
              value={userStatsData.progressToNextTier} 
              className="h-2 mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {userStatsData.pointsToNextTier.toLocaleString()} points to go
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-semibold">Badges</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.unlockedAchievements} / {stats.totalAchievements}
            </p>
            <Progress 
              value={(stats.unlockedAchievements / Math.max(stats.totalAchievements, 1)) * 100} 
              className="h-1 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-green-500" />
              <span className="text-sm font-semibold">Activity</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-semibold">{userStatsData.posts}</span> posts
              </p>
              <p className="text-sm">
                <span className="font-semibold">{userStatsData.replies}</span> replies
              </p>
              {userStatsData.helpfulVotes > 0 && (
                <p className="text-sm">
                  <span className="font-semibold">{userStatsData.helpfulVotes}</span> helpful votes
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Your Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userStatsData.badges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-semibold">No badges yet</p>
              <p className="text-sm">Keep participating to earn badges!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userStatsData.badges.map((badge: any) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <span className="text-4xl mb-2">{badge.badge_icon || '🏅'}</span>
                  <p className="text-sm font-semibold text-center">{badge.badge_name}</p>
                  {badge.earned_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userStatsData.posts > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-semibold">Message Board Posts</p>
                    <p className="text-sm text-gray-600">{userStatsData.posts} posts created</p>
                  </div>
                </div>
                <Badge className="bg-blue-600">{userStatsData.posts * 25} pts</Badge>
              </div>
            )}
            {userStatsData.replies > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Reply className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold">Replies</p>
                    <p className="text-sm text-gray-600">{userStatsData.replies} replies posted</p>
                  </div>
                </div>
                <Badge className="bg-green-600">{userStatsData.replies * 5} pts</Badge>
              </div>
            )}
            {userStatsData.posts === 0 && userStatsData.replies === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No activity yet. Start posting to see your progress!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
