import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';

interface Affiliate {
  rank: number;
  name: string;
  referrals: number;
  earnings: number;
  tier: string;
}

export default function AffiliateLeaderboard() {
  const topAffiliates: Affiliate[] = [
    { rank: 1, name: 'Captain Mike', referrals: 47, earnings: 3245.50, tier: 'Platinum' },
    { rank: 2, name: 'Sarah Fisher', referrals: 38, earnings: 2678.25, tier: 'Platinum' },
    { rank: 3, name: 'John Angler', referrals: 32, earnings: 2156.00, tier: 'Platinum' },
    { rank: 4, name: 'Lisa Waters', referrals: 28, earnings: 1890.75, tier: 'Gold' },
    { rank: 5, name: 'Tom Navigator', referrals: 24, earnings: 1654.50, tier: 'Gold' },
    { rank: 6, name: 'Emma Sailor', referrals: 19, earnings: 1342.25, tier: 'Gold' },
    { rank: 7, name: 'David Ocean', referrals: 16, earnings: 1128.00, tier: 'Gold' },
    { rank: 8, name: 'Rachel Bay', referrals: 12, earnings: 845.50, tier: 'Silver' },
    { rank: 9, name: 'Chris Wave', referrals: 9, earnings: 634.75, tier: 'Silver' },
    { rank: 10, name: 'Amy Tide', referrals: 7, earnings: 492.00, tier: 'Silver' }
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-600" />;
    return <Award className="w-5 h-5 text-gray-400" />;
  };

  const getTierColor = (tier: string) => {
    switch(tier) {
      case 'Platinum': return 'bg-purple-600';
      case 'Gold': return 'bg-yellow-500';
      case 'Silver': return 'bg-gray-400';
      default: return 'bg-orange-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Affiliates Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topAffiliates.map(affiliate => (
            <div key={affiliate.rank} className={`flex items-center justify-between p-4 rounded-lg border-2 ${affiliate.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10">
                  {getRankIcon(affiliate.rank)}
                </div>
                <div>
                  <p className="font-bold text-lg">{affiliate.name}</p>
                  <p className="text-sm text-gray-600">{affiliate.referrals} referrals</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <Badge className={`${getTierColor(affiliate.tier)} text-white`}>
                  {affiliate.tier}
                </Badge>
                <div>
                  <p className="text-xl font-bold text-green-600">${affiliate.earnings.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">total earned</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
