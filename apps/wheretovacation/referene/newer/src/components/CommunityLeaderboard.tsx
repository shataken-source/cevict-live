import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CommunityLeaderboard() {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('points-rewards-system', {
      body: { action: 'get_leaderboard', period }
    });
    if (data?.leaderboard) setLeaders(data.leaderboard);
    setLoading(false);
  };

  const getRankColor = (rank: string) => {
    const colors = {
      'Bronze': 'bg-amber-700 text-white',
      'Silver': 'bg-gray-400 text-gray-900',
      'Gold': 'bg-yellow-400 text-yellow-900',
      'Platinum': 'bg-gradient-to-r from-blue-400 to-purple-400 text-white'
    };
    return colors[rank as keyof typeof colors] || 'bg-gray-200';
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
        <div className="space-y-3">
          {leaders.map((leader, idx) => (
            <div key={leader.userId} className={`flex items-center gap-4 p-4 rounded-lg ${idx < 3 ? 'bg-white shadow-md border-2 border-cyan-300' : 'bg-white/60'}`}>
              <div className="w-12 flex justify-center">{getPositionIcon(idx)}</div>
              <Avatar className="w-12 h-12">
                <AvatarImage src={leader.avatar} />
                <AvatarFallback>{leader.username[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-blue-900">{leader.username}</p>
                <Badge className={getRankColor(leader.rank)}>{leader.rank}</Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-cyan-600">{leader.points.toLocaleString()}</p>
                <p className="text-xs text-gray-600">points</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
