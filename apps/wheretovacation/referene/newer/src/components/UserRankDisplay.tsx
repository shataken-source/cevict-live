import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserRankDisplayProps {
  userId: string;
  totalPoints: number;
}

export default function UserRankDisplay({ userId, totalPoints }: UserRankDisplayProps) {
  const [rankData, setRankData] = useState<any>(null);

  useEffect(() => {
    loadRankData();
  }, [totalPoints]);

  const loadRankData = async () => {
    const { data } = await supabase.functions.invoke('points-rewards-system', {
      body: { action: 'get_user_rank', userId, metadata: { totalPoints } }
    });
    if (data) setRankData(data);
  };

  if (!rankData) return null;

  return (
    <Card className="bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-500 text-white border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8" />
            <div>
              <p className="text-sm opacity-90">Your Rank</p>
              <p className="text-3xl font-bold">{rankData.rank}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{totalPoints.toLocaleString()}</p>
            <p className="text-sm opacity-90">Total Points</p>
          </div>
        </div>

        {rankData.nextRank && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Next: {rankData.nextRank}
              </span>
              <span className="font-semibold">{rankData.pointsToNext} points to go</span>
            </div>
            <Progress value={rankData.progress} className="h-3 bg-white/30" />
            <p className="text-xs text-center opacity-90">{Math.round(rankData.progress)}% to {rankData.nextRank}</p>
          </div>
        )}

        {!rankData.nextRank && (
          <div className="text-center py-2">
            <Badge className="bg-yellow-400 text-yellow-900 text-lg px-4 py-2">
              🏆 Maximum Rank Achieved!
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
