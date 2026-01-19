import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Trophy, Medal, Award } from 'lucide-react';

export default function TopReviewersLeaderboard() {
  const topReviewers = [
    { name: 'Sarah Martinez', reviews: 47, points: 2350, rank: 1 },
    { name: 'Mike Thompson', reviews: 39, points: 1950, rank: 2 },
    { name: 'Jessica Lee', reviews: 35, points: 1750, rank: 3 },
    { name: 'David Chen', reviews: 28, points: 1400, rank: 4 },
    { name: 'Emily Rodriguez', reviews: 24, points: 1200, rank: 5 }
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-600" />;
    return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="w-6 h-6 text-yellow-500" />
        Top Reviewers This Month
      </h3>
      <div className="space-y-3">
        {topReviewers.map((reviewer) => (
          <div key={reviewer.rank} className={`flex items-center gap-4 p-3 rounded-lg ${reviewer.rank <= 3 ? 'bg-gradient-to-r from-blue-50 to-cyan-50' : 'bg-gray-50'}`}>
            <div className="w-8 flex justify-center">{getRankIcon(reviewer.rank)}</div>
            <Avatar className="w-10 h-10">
              <AvatarFallback>{reviewer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm">{reviewer.name}</p>
              <p className="text-xs text-gray-600">{reviewer.reviews} reviews</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-blue-600">{reviewer.points}</p>
              <p className="text-xs text-gray-500">points</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
