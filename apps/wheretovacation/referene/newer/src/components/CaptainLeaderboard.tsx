import { Trophy, Star, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const topCaptains = [
  { rank: 1, name: 'Captain Mike Johnson', bookings: 127, rating: 4.9, catchRate: 94, avatar: 'https://i.pravatar.cc/150?img=12' },
  { rank: 2, name: 'Captain Sarah Williams', bookings: 118, rating: 4.9, catchRate: 92, avatar: 'https://i.pravatar.cc/150?img=45' },
  { rank: 3, name: 'Captain Tom Rodriguez', bookings: 112, rating: 4.8, catchRate: 91, avatar: 'https://i.pravatar.cc/150?img=33' },
  { rank: 4, name: 'Captain Lisa Chen', bookings: 98, rating: 4.8, catchRate: 89, avatar: 'https://i.pravatar.cc/150?img=47' },
  { rank: 5, name: 'Captain James Miller', bookings: 95, rating: 4.7, catchRate: 88, avatar: 'https://i.pravatar.cc/150?img=52' }
];

export default function CaptainLeaderboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Captains This Month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topCaptains.map((captain) => (
          <div key={captain.rank} className={`flex items-center gap-4 p-3 rounded-lg ${
            captain.rank === 1 ? 'bg-yellow-50 border-2 border-yellow-300' :
            captain.rank === 2 ? 'bg-gray-100 border border-gray-300' :
            captain.rank === 3 ? 'bg-orange-50 border border-orange-300' :
            'bg-gray-50'
          }`}>
            <div className="text-2xl font-bold text-gray-400 w-8">{captain.rank}</div>
            <Avatar>
              <AvatarImage src={captain.avatar} />
              <AvatarFallback>{captain.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{captain.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <Calendar className="w-3 h-3" />
                  {captain.bookings} trips
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <Star className="w-3 h-3 text-yellow-500" />
                  {captain.rating}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  {captain.catchRate}%
                </span>
              </div>
            </div>
            {captain.rank === 1 && <Badge className="bg-yellow-500">Captain of the Month</Badge>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
