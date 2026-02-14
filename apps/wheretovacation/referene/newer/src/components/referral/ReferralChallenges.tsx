import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Clock, Target, Gift, Zap, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'weekly' | 'monthly' | 'seasonal' | 'flash';
  target: number;
  current: number;
  reward: string;
  multiplier?: number;
  endsAt: string;
  theme?: string;
  icon: string;
}

export default function ReferralChallenges({ userId }: { userId: string }) {
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: '1',
      title: '🔥 Flash Challenge: Weekend Warrior',
      description: 'Refer 5 friends this weekend',
      type: 'flash',
      target: 5,
      current: 2,
      reward: '2x Rewards + $50 Bonus',
      multiplier: 2,
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      icon: 'zap'
    },
    {
      id: '2',
      title: '🏆 Monthly Champion',
      description: 'Top 10 referrers win Premium Membership',
      type: 'monthly',
      target: 10,
      current: 6,
      reward: '1 Year Premium + $500',
      endsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      icon: 'trophy'
    },
    {
      id: '3',
      title: '🎄 Holiday Special',
      description: 'Share on 3 platforms for bonus points',
      type: 'seasonal',
      target: 3,
      current: 1,
      reward: '500 Bonus Points + Badge',
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      theme: 'holiday',
      icon: 'gift'
    }
  ]);

  const getTimeRemaining = (endDate: string) => {
    const total = Date.parse(endDate) - Date.now();
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    return { total, days, hours, minutes };
  };

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'zap': return <Zap className="h-5 w-5" />;
      case 'trophy': return <Trophy className="h-5 w-5" />;
      case 'gift': return <Gift className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Active Challenges</h2>
        <Badge variant="outline" className="text-sm">
          <Calendar className="h-3 w-3 mr-1" />
          {challenges.length} Active
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {challenges.map((challenge) => {
          const timeLeft = getTimeRemaining(challenge.endsAt);
          const progress = (challenge.current / challenge.target) * 100;
          
          return (
            <Card key={challenge.id} className="relative overflow-hidden">
              {challenge.multiplier && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500">
                    {challenge.multiplier}x Rewards
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {getIcon(challenge.icon)}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Progress</span>
                    <span className="text-gray-600">{challenge.current}/{challenge.target}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">
                    {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m left
                  </span>
                </div>

                <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-900">{challenge.reward}</span>
                  </div>
                </div>

                <Button className="w-full" variant={progress >= 100 ? "default" : "outline"}>
                  {progress >= 100 ? 'Claim Reward' : 'View Details'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
