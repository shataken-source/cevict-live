import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Crown, Zap, Target, Award } from 'lucide-react';

interface ReferralBadgesProps {
  referralCount: number;
  totalEarned: number;
}

export default function ReferralBadges({ referralCount, totalEarned }: ReferralBadgesProps) {
  const badges = [
    { id: 'first', name: 'First Referral', desc: 'Made your first referral', icon: Star, unlocked: referralCount >= 1 },
    { id: 'bronze', name: 'Bronze Ambassador', desc: '3 successful referrals', icon: Award, unlocked: referralCount >= 3 },
    { id: 'silver', name: 'Silver Captain', desc: '10 successful referrals', icon: Trophy, unlocked: referralCount >= 10 },
    { id: 'gold', name: 'Gold Legend', desc: '25 successful referrals', icon: Crown, unlocked: referralCount >= 25 },
    { id: 'platinum', name: 'Platinum Elite', desc: '50 successful referrals', icon: Zap, unlocked: referralCount >= 50 },
    { id: 'earner', name: 'Big Earner', desc: 'Earned $500+ in rewards', icon: Target, unlocked: totalEarned >= 500 }
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Achievement Badges
          </span>
          <Badge variant="secondary">{unlockedCount}/{badges.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  badge.unlocked
                    ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-300 shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-50 grayscale'
                }`}
              >
                <Icon className={`h-8 w-8 mx-auto mb-2 ${badge.unlocked ? 'text-purple-600' : 'text-gray-400'}`} />
                <p className="font-semibold text-sm mb-1">{badge.name}</p>
                <p className="text-xs text-gray-600">{badge.desc}</p>
                {badge.unlocked && (
                  <Badge className="mt-2 bg-green-600 text-xs">Unlocked</Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
