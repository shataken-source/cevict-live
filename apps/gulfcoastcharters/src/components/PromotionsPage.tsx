import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Fish, DollarSign, Star, TrendingUp, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PromotionsPage() {
  const [leaderboards, setLeaderboards] = useState<any>({
    biggestFish: [],
    topAffiliates: [],
    mostBookings: [],
    topRated: []
  });

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    // Mock data for now
    setLeaderboards({
      biggestFish: [
        { rank: 1, name: 'Captain Mike Johnson', value: 287, species: 'Blue Marlin', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100' },
        { rank: 2, name: 'Captain Sarah Williams', value: 245, species: 'Sailfish', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
        { rank: 3, name: 'Captain Tom Anderson', value: 198, species: 'Tuna', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100' }
      ],
      topAffiliates: [
        { rank: 1, name: 'Captain Mike Johnson', value: 4250, email: 'mike@example.com' },
        { rank: 2, name: 'Captain Sarah Williams', value: 3890, email: 'sarah@example.com' },
        { rank: 3, name: 'Captain Tom Anderson', value: 2975, email: 'tom@example.com' }
      ],
      mostBookings: [
        { rank: 1, name: 'Captain Mike Johnson', value: 156, email: 'mike@example.com' },
        { rank: 2, name: 'Captain Sarah Williams', value: 142, email: 'sarah@example.com' },
        { rank: 3, name: 'Captain Tom Anderson', value: 128, email: 'tom@example.com' }
      ],
      topRated: [
        { rank: 1, name: 'Captain Mike Johnson', value: 4.9, reviews: 89, email: 'mike@example.com' },
        { rank: 2, name: 'Captain Sarah Williams', value: 4.8, reviews: 76, email: 'sarah@example.com' },
        { rank: 3, name: 'Captain Tom Anderson', value: 4.7, reviews: 64, email: 'tom@example.com' }
      ]
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Captain Leaderboards</h1>
        <p className="text-gray-600">Celebrating our top performing captains this month</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fish className="w-5 h-5 text-blue-600" />
              Biggest Fish of the Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboards.biggestFish.map((entry: any) => (
              <div key={entry.rank} className="flex items-center gap-4 p-3 border-b">
                <div className="text-2xl font-bold text-gray-400">#{entry.rank}</div>
                <img src={entry.image} alt={entry.name} className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <div className="font-semibold">{entry.name}</div>
                  <div className="text-sm text-gray-600">{entry.species} - {entry.value} lbs</div>
                </div>
                {entry.rank === 1 && <Trophy className="w-6 h-6 text-yellow-500" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Top Affiliate Earners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboards.topAffiliates.map((entry: any) => (
              <div key={entry.rank} className="flex items-center gap-4 p-3 border-b">
                <div className="text-2xl font-bold text-gray-400">#{entry.rank}</div>
                <div className="flex-1">
                  <div className="font-semibold">{entry.name}</div>
                  <div className="text-sm text-gray-600">${entry.value.toLocaleString()} earned</div>
                </div>
                {entry.rank === 1 && <Award className="w-6 h-6 text-green-500" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Most Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboards.mostBookings.map((entry: any) => (
              <div key={entry.rank} className="flex items-center gap-4 p-3 border-b">
                <div className="text-2xl font-bold text-gray-400">#{entry.rank}</div>
                <div className="flex-1">
                  <div className="font-semibold">{entry.name}</div>
                  <div className="text-sm text-gray-600">{entry.value} trips completed</div>
                </div>
                {entry.rank === 1 && <Trophy className="w-6 h-6 text-purple-500" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              Top Rated Captains
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboards.topRated.map((entry: any) => (
              <div key={entry.rank} className="flex items-center gap-4 p-3 border-b">
                <div className="text-2xl font-bold text-gray-400">#{entry.rank}</div>
                <div className="flex-1">
                  <div className="font-semibold">{entry.name}</div>
                  <div className="text-sm text-gray-600">{entry.value} stars ({entry.reviews} reviews)</div>
                </div>
                {entry.rank === 1 && <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
