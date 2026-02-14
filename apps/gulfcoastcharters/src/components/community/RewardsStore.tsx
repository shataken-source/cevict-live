/**
 * Rewards Store - uses /api/community/rewards and redeem
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';

type Reward = {
  reward_id: string;
  title: string;
  description: string | null;
  reward_type: string;
  points_cost: number;
  value: number | null;
  image_url: string | null;
};

export default function RewardsStore() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/community/rewards');
      const data = await res.json();
      setRewards(data.rewards || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const redeem = async (rewardId: string) => {
    setRedeeming(rewardId);
    setLastCode(null);
    try {
      const res = await fetch('/api/community/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      });
      const data = await res.json();
      if (data.redemptionCode) setLastCode(data.redemptionCode);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Gift className="w-5 h-5" /> Rewards Store
      </h3>
      {lastCode && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <p className="font-medium text-green-800">Redemption code: <code className="bg-white px-2 py-1 rounded">{lastCode}</code></p>
          </CardContent>
        </Card>
      )}
      {loading ? (
        <p className="text-gray-500">Loading rewards...</p>
      ) : rewards.length === 0 ? (
        <p className="text-gray-500">No rewards in the catalog yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r) => (
            <Card key={r.reward_id}>
              <CardContent className="pt-4">
                <h4 className="font-semibold">{r.title}</h4>
                {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                <p className="text-blue-600 font-medium mt-2">{r.points_cost} points</p>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => redeem(r.reward_id)}
                  disabled={!!redeeming}
                >
                  {redeeming === r.reward_id ? 'Redeeming...' : 'Redeem'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
