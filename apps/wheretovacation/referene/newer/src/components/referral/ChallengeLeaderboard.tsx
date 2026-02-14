import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp, Crown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  referrals: number;
  points: number;
  badges: string[];
  trend: 'up' | 'down' | 'same';
}

export default function ChallengeLeaderboard({ challengeId }: { challengeId?: string }) {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  
  const leaderboard: LeaderboardEntry[] = [
    { rank: 1, userId: '1', name: 'Sarah Johnson', referrals: 47, points: 9400, badges: ['🏆', '🔥', '⭐'], trend: 'up' },
    { rank: 2, userId: '2', name: 'Mike Chen', referrals: 42, points: 8400, badges: ['🥈', '🔥'], trend: 'same' },
    { rank: 3, userId: '3', name: 'Emma Davis', referrals: 38, points: 7600, badges: ['🥉', '⭐'], trend: 'up' },
    { rank: 4, userId: '4', name: 'James Wilson', referrals: 35, points: 7000, badges: ['🔥'], trend: 'down' },
    { rank: 5, userId: '5', name: 'Lisa Anderson', referrals: 32, points: 6400, badges: ['⭐'], trend: 'up' },
    { rank: 6, userId: '6', name: 'David Martinez', referrals: 28, points: 5600, badges: [], trend: 'same' },
    { rank: 7, userId: '7', name: 'Sophie Taylor', referrals: 25, points: 5000, badges: [], trend: 'up' },
    { rank: 8, userId: '8', name: 'Ryan Brown', referrals: 22, points: 4400, badges: [], trend: 'down' },
    { rank: 9, userId: '9', name: 'Olivia White', referrals: 20, points: 4000, badges: [], trend: 'same' },
    { rank: 10, userId: '10', name: 'Alex Garcia', referrals: 18, points: 3600, badges: [], trend: 'up' }
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-orange-600" />;
    return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Challenge Leaderboard
          </CardTitle>
          <Badge variant="outline">Live Updates</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
            <TabsTrigger value="alltime">All Time</TabsTrigger>
          </TabsList>

          <TabsContent value={timeframe} className="space-y-3 mt-4">
            {leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                  entry.rank <= 3 ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-purple-200' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-center w-10">
                  {getRankIcon(entry.rank)}
                </div>

                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.avatar} />
                  <AvatarFallback>{entry.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{entry.name}</span>
                    {entry.badges.map((badge, i) => (
                      <span key={i} className="text-sm">{badge}</span>
                    ))}
                    {getTrendIcon(entry.trend)}
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>{entry.referrals} referrals</span>
                    <span>•</span>
                    <span>{entry.points.toLocaleString()} pts</span>
                  </div>
                </div>

                {entry.rank <= 3 && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-blue-500">
                    Winner
                  </Badge>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
