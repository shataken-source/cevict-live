import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Gift, History, TrendingUp, Award, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LoyaltyData {
  pointsBalance: number;
  totalEarned: number;
  tier: string;
  transactions: Transaction[];
  redeemedRewards: RedeemedReward[];
}

interface Transaction {
  id: string;
  points: number;
  type: string;
  description: string;
  date: string;
}

interface RedeemedReward {
  id: string;
  name: string;
  pointsSpent: number;
  code: string;
  redeemedAt: string;
  expiresAt: string;
}

export default function LoyaltyRewardsDashboard({ userId }: { userId: string }) {
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData>({
    pointsBalance: 0,
    totalEarned: 0,
    tier: 'Bronze',
    transactions: [],
    redeemedRewards: []
  });
  const [rewards, setRewards] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any>({});

  useEffect(() => {
    loadLoyaltyData();
    loadRewardsCatalog();
    loadTiers();
  }, [userId]);

  const loadLoyaltyData = async () => {
    try {
      // Load points balance and tier from database
      const { data: userData } = await supabase
        .from('shared_users')
        .select('total_points, loyalty_tier')
        .eq('id', userId)
        .maybeSingle();

      // Load recent transactions
      const { data: txData } = await supabase
        .from('loyalty_transactions')
        .select('id, points, type, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Load redeemed rewards
      const { data: redeemed } = await supabase
        .from('rewards_redemptions')
        .select('redemption_id, points_spent, redemption_code, status, created_at, rewards_catalog(title)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Calculate total earned
      const totalEarned = (txData || []).filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0);

      setLoyaltyData({
        pointsBalance: userData?.total_points || 0,
        totalEarned,
        tier: userData?.loyalty_tier || 'Bronze',
        transactions: (txData || []).map(t => ({
          id: t.id,
          points: t.points,
          type: t.type,
          description: t.description,
          date: t.created_at
        })),
        redeemedRewards: (redeemed || []).map((r: any) => ({
          id: r.redemption_id,
          name: r.rewards_catalog?.title || 'Reward',
          pointsSpent: r.points_spent,
          code: r.redemption_code || '',
          redeemedAt: r.created_at,
          expiresAt: new Date(new Date(r.created_at).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
        }))
      });
    } catch (error) {
      console.error('Error loading loyalty data:', error);
    }
  };

  const loadRewardsCatalog = async () => {
    const { data } = await supabase.functions.invoke('loyalty-rewards', {
      body: { action: 'getRewardsCatalog' }
    });
    if (data?.catalog) setRewards(data.catalog);
  };

  const loadTiers = async () => {
    const { data } = await supabase.functions.invoke('loyalty-rewards', {
      body: { action: 'getTiers' }
    });
    if (data?.tiers) setTiers(data.tiers);
  };

  const redeemReward = async (reward: any) => {
    if (loyaltyData.pointsBalance < reward.pointsCost) {
      alert('Insufficient points');
      return;
    }

    try {
      const response = await fetch('/api/community/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', rewardId: reward.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to redeem reward');
        return;
      }

      alert(`Reward redeemed! Your code: ${data.redemptionCode}`);
      await loadLoyaltyData();
    } catch (error: any) {
      alert(error.message || 'Failed to redeem reward');
    }
  };

  const getTierColor = (tier: string) => {
    const colors = { Bronze: 'bg-amber-700', Silver: 'bg-gray-400', Gold: 'bg-yellow-500', Platinum: 'bg-purple-600' };
    return colors[tier as keyof typeof colors] || 'bg-gray-500';
  };

  const nextTier = loyaltyData.tier === 'Bronze' ? 'Silver' : loyaltyData.tier === 'Silver' ? 'Gold' : loyaltyData.tier === 'Gold' ? 'Platinum' : null;
  const nextTierPoints = nextTier ? tiers[nextTier]?.min : null;
  const progress = nextTierPoints ? (loyaltyData.totalEarned / nextTierPoints) * 100 : 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Loyalty Rewards Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getTierColor(loyaltyData.tier)} text-white mb-2`}>
                <Award className="h-5 w-5" />
                <span className="font-bold">{loyaltyData.tier}</span>
              </div>
              <p className="text-sm text-gray-600">Current Tier</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{loyaltyData.pointsBalance}</div>
              <p className="text-sm text-gray-600">Available Points</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{loyaltyData.totalEarned}</div>
              <p className="text-sm text-gray-600">Total Earned</p>
            </div>
          </div>
          {nextTier && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to {nextTier}</span>
                <span>{loyaltyData.totalEarned} / {nextTierPoints}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="rewards">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="redeemed">Redeemed</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          {rewards.map(reward => (
            <Card key={reward.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{reward.name}</h3>
                  <p className="text-sm text-gray-600">{reward.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge>{reward.pointsCost} points</Badge>
                    <Badge variant="outline">{reward.tierRequired}+</Badge>
                  </div>
                </div>
                <Button onClick={() => redeemReward(reward)} disabled={loyaltyData.pointsBalance < reward.pointsCost}>
                  Redeem
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
              {loyaltyData.transactions.length === 0 ? (
                <p className="text-center text-gray-500">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {loyaltyData.transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redeemed">
          <Card>
            <CardContent className="p-4">
              {loyaltyData.redeemedRewards.length === 0 ? (
                <p className="text-center text-gray-500">No redeemed rewards yet</p>
              ) : (
                <div className="space-y-3">
                  {loyaltyData.redeemedRewards.map(reward => (
                    <div key={reward.id} className="border p-3 rounded">
                      <h4 className="font-semibold">{reward.name}</h4>
                      <p className="text-sm text-gray-600">Code: <span className="font-mono bg-gray-100 px-2 py-1">{reward.code}</span></p>
                      <p className="text-xs text-gray-500 mt-1">Expires: {new Date(reward.expiresAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
