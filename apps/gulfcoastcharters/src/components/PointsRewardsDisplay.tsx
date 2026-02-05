import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Gift, Anchor } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function PointsRewardsDisplay({ userId }: { userId: string }) {
  const [points, setPoints] = useState(2450); // Mock points matching Community page
  const [rewards, setRewards] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadRewards();
  }, []);


  const loadRewards = async () => {
    const { data } = await supabase.functions.invoke('points-rewards-system', {
      body: { action: 'get_rewards' }
    });
    if (data?.rewards) setRewards(data.rewards);
  };

  const redeemReward = async (reward: any) => {
    if (points < reward.points) {
      toast({ title: 'Not enough points', variant: 'destructive' });
      return;
    }
    
    const { data } = await supabase.functions.invoke('points-rewards-system', {
      body: { action: 'redeem_reward', userId, rewardType: reward.type }
    });
    
    if (data?.success) {
      setPoints(points - reward.points);
      toast({ title: '🎉 Reward redeemed!' });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-500 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Anchor className="w-6 h-6" />
            Your Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold">{points}</div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {rewards.map((reward, idx) => (
          <Card key={idx} className="border-2 border-cyan-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="font-semibold text-blue-900">{reward.reward}</p>
                  <Badge className="bg-amber-100 text-amber-700">{reward.points} points</Badge>
                </div>
              </div>
              <Button 
                onClick={() => redeemReward(reward)}
                disabled={points < reward.points}
                className="bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                Redeem
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
