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

  const loadLoyaltyData = () => {
    const data = localStorage.getItem(`loyalty_${userId}`);
    if (data) {
      setLoyaltyData(JSON.parse(data));
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

  const redeemReward = (reward: any) => {
    if (loyaltyData.pointsBalance < reward.pointsCost) {
      alert('Insufficient points');
      return;
    }

    const code = `REWARD-${Date.now()}`;
    const newRedemption = {
      id: Date.now().toString(),
      name: reward.name,
      pointsSpent: reward.pointsCost,
      code,
      redeemedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };

    const updated = {
      ...loyaltyData,
      pointsBalance: loyaltyData.pointsBalance - reward.pointsCost,
      redeemedRewards: [...loyaltyData.redeemedRewards, newRedemption],
      transactions: [...loyaltyData.transactions, {
        id: Date.now().toString(),
        points: -reward.pointsCost,
        type: 'redemption',
        description: `Redeemed: ${reward.name}`,
        date: new Date().toISOString()
      }]
    };

    localStorage.setItem(`loyalty_${userId}`, JSON.stringify(updated));
    setLoyaltyData(updated);
    alert(`Reward redeemed! Your code: ${code}`);
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
