import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MessageBoardAvatar from './MessageBoardAvatar';

interface LeaderboardEntry {
  userId: string;
  username: string;
  email: string;
  points: number;
  tier: string;
  avatar?: string;
}

export default function CommunityLeaderboard() {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Get current user for highlighting
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calculate date filter based on period
      let dateFilter = '';
      if (period === 'week') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (period === 'month') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      let query = supabase
        .from('shared_users')
        .select('id, email, first_name, last_name, total_points, loyalty_tier, avatar_url')
        .order('total_points', { ascending: false })
        .limit(50);

      // If filtering by period, we need to calculate points from transactions
      if (period !== 'all') {
        // Get all users with transactions in the period
        const { data: transactions } = await supabase
          .from('loyalty_transactions')
          .select('user_id, points, is_reversed, expires_at')
          .gte('created_at', dateFilter)
          .eq('is_reversed', false)
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

        // Calculate points per user for the period
        const userPointsMap = new Map<string, number>();
        if (transactions) {
          transactions.forEach(tx => {
            const current = userPointsMap.get(tx.user_id) || 0;
            userPointsMap.set(tx.user_id, current + (tx.points || 0));
          });
        }

        // Get user details and merge with calculated points
        const userIds = Array.from(userPointsMap.keys());
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('shared_users')
            .select('id, email, first_name, last_name, loyalty_tier, avatar_url')
            .in('id', userIds);

          if (users) {
            const leaderboardData = users
              .map(u => ({
                userId: u.id,
                username: u.first_name && u.last_name 
                  ? `${u.first_name} ${u.last_name}` 
                  : u.email?.split('@')[0] || 'Anonymous',
                email: u.email || '',
                points: userPointsMap.get(u.id) || 0,
                tier: u.loyalty_tier || 'bronze',
                avatar: u.avatar_url || undefined,
              }))
              .sort((a, b) => b.points - a.points)
              .slice(0, 50);

            setLeaders(leaderboardData);
            
            // Find current user's rank
            if (user) {
              const rank = leaderboardData.findIndex(l => l.userId === user.id);
              setCurrentUserRank(rank >= 0 ? rank + 1 : null);
            }
            setLoading(false);
            return;
          }
        } else {
          setLeaders([]);
          setLoading(false);
          return;
        }
      }

      // For 'all' period, use total_points from shared_users
      const { data: users, error } = await query;

      if (error) {
        console.error('Error loading leaderboard:', error);
        setLeaders([]);
      } else if (users) {
        const leaderboardData: LeaderboardEntry[] = users.map(u => ({
          userId: u.id,
          username: u.first_name && u.last_name 
            ? `${u.first_name} ${u.last_name}` 
            : u.email?.split('@')[0] || 'Anonymous',
          email: u.email || '',
          points: u.total_points || 0,
          tier: u.loyalty_tier || 'bronze',
          avatar: u.avatar_url || undefined,
        }));

        setLeaders(leaderboardData);
        
        // Find current user's rank
        if (user) {
          const rank = leaderboardData.findIndex(l => l.userId === user.id);
          setCurrentUserRank(rank >= 0 ? rank + 1 : null);
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (tier: string) => {
    const tierLower = tier.toLowerCase();
    const colors: Record<string, string> = {
      'bronze': 'bg-amber-700 text-white',
      'silver': 'bg-gray-400 text-gray-900',
      'gold': 'bg-yellow-400 text-yellow-900',
      'platinum': 'bg-gradient-to-r from-blue-400 to-purple-400 text-white'
    };
    return colors[tierLower] || 'bg-gray-200 text-gray-800';
  };

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-700" />;
    return <span className="text-lg font-bold text-gray-500">#{index + 1}</span>;
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <TrendingUp className="w-6 h-6" />
            Community Leaderboard
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={period === 'week' ? 'default' : 'outline'} onClick={() => setPeriod('week')}>Week</Button>
            <Button size="sm" variant={period === 'month' ? 'default' : 'outline'} onClick={() => setPeriod('month')}>Month</Button>
            <Button size="sm" variant={period === 'all' ? 'default' : 'outline'} onClick={() => setPeriod('all')}>All Time</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white/60 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-semibold">No leaders yet</p>
            <p className="text-sm">Be the first to earn points and make the leaderboard!</p>
          </div>
        ) : (
          <>
            {currentUserRank && currentUserRank > 10 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Your rank:</span> #{currentUserRank}
                </p>
              </div>
            )}
            <div className="space-y-3">
              {leaders.map((leader, idx) => (
                <div 
                  key={leader.userId} 
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                    idx < 3 
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 shadow-md border-2 border-yellow-300' 
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="w-12 flex justify-center">{getPositionIcon(idx)}</div>
                  <div className="w-12 h-12">
                    <MessageBoardAvatar userId={leader.userId} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">{leader.username}</p>
                    <Badge className={getRankColor(leader.tier)}>
                      {leader.tier.charAt(0).toUpperCase() + leader.tier.slice(1)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-cyan-600">{leader.points.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">points</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
