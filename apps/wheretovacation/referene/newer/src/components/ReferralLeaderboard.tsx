import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Crown, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ReferralLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data } = await supabase.functions.invoke('referral-rewards', {
        body: { action: 'get_leaderboard' }
      });

      if (data?.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-gray-500 font-bold">#{index + 1}</span>;
  };

  const getRankBadge = (count: number) => {
    if (count >= 50) return { label: 'Platinum Elite', icon: Crown, color: 'bg-purple-600' };
    if (count >= 25) return { label: 'Gold Legend', icon: Trophy, color: 'bg-yellow-500' };
    if (count >= 10) return { label: 'Silver Captain', icon: Medal, color: 'bg-gray-400' };
    if (count >= 3) return { label: 'Bronze Ambassador', icon: Star, color: 'bg-amber-700' };
    return null;
  };

  return (
    <Card className="border-2 border-yellow-200">
      <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Top Referrers Leaderboard
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">Compete for the top spot and earn exclusive badges!</p>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <p className="text-center py-8 text-gray-500">Loading leaderboard...</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No referrals yet. Be the first to make the leaderboard!</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((user, index) => {
              const badge = getRankBadge(user.referralCount);
              const BadgeIcon = badge?.icon;
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    index < 3
                      ? 'bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-300 shadow-lg'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex justify-center items-center">{getRankIcon(index)}</div>
                    <div>
                      <p className="font-semibold text-lg">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-600">{user.referralCount} successful referrals</p>
                        {badge && BadgeIcon && (
                          <Badge className={`${badge.color} text-white text-xs`}>
                            <BadgeIcon className="h-3 w-3 mr-1" />
                            {badge.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-lg font-bold">
                      ${user.totalEarned}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">earned</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

