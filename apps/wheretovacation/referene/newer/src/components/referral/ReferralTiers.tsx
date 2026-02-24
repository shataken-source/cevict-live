import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gift, Trophy, Crown, Star } from 'lucide-react';

interface ReferralTiersProps {
  currentReferrals: number;
}

export default function ReferralTiers({ currentReferrals }: ReferralTiersProps) {
  const tiers = [
    { count: 3, reward: '$75 Bonus', badge: 'Bronze Ambassador', icon: Star, color: 'text-amber-700' },
    { count: 10, reward: '$300 Bonus', badge: 'Silver Captain', icon: Trophy, color: 'text-gray-400' },
    { count: 25, reward: '$1000 Bonus', badge: 'Gold Legend', icon: Crown, color: 'text-yellow-500' },
    { count: 50, reward: 'Lifetime VIP', badge: 'Platinum Elite', icon: Gift, color: 'text-purple-600' }
  ];

  const getCurrentTier = () => {
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (currentReferrals >= tiers[i].count) return i;
    }
    return -1;
  };

  const getNextTier = () => {
    const current = getCurrentTier();
    return current < tiers.length - 1 ? tiers[current + 1] : null;
  };

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Referral Tiers & Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextTier && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Next Tier: {nextTier.badge}</span>
              <Badge variant="secondary">{currentReferrals}/{nextTier.count}</Badge>
            </div>
            <Progress value={(currentReferrals / nextTier.count) * 100} className="h-2 mb-2" />
            <p className="text-sm text-gray-600">
              {nextTier.count - currentReferrals} more referrals to unlock {nextTier.reward}!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tiers.map((tier, index) => {
            const Icon = tier.icon;
            const isUnlocked = currentReferrals >= tier.count;
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${isUnlocked ? tier.color : 'text-gray-400'}`} />
                  <span className="font-semibold">{tier.badge}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{tier.count} Referrals</p>
                <p className="text-sm font-bold text-blue-600">{tier.reward}</p>
                {isUnlocked && <Badge className="mt-2 bg-green-600">Unlocked!</Badge>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
