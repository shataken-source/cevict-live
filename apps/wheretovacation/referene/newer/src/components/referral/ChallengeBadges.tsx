import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Crown, Star, Award, Target, Flame, Gift } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChallengeBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned: boolean;
  earnedDate?: string;
  progress?: { current: number; total: number };
}

export default function ChallengeBadges({ userId }: { userId: string }) {
  const badges: ChallengeBadge[] = [
    {
      id: '1',
      name: 'Weekend Warrior',
      description: 'Complete 3 weekend challenges',
      icon: 'zap',
      rarity: 'rare',
      earned: true,
      earnedDate: '2024-01-15'
    },
    {
      id: '2',
      name: 'Champion',
      description: 'Win a monthly challenge',
      icon: 'trophy',
      rarity: 'epic',
      earned: true,
      earnedDate: '2024-01-10'
    },
    {
      id: '3',
      name: 'Social Butterfly',
      description: 'Share on all platforms',
      icon: 'star',
      rarity: 'common',
      earned: true,
      earnedDate: '2024-01-20'
    },
    {
      id: '4',
      name: 'Legendary Referrer',
      description: 'Refer 100 friends',
      icon: 'crown',
      rarity: 'legendary',
      earned: false,
      progress: { current: 67, total: 100 }
    },
    {
      id: '5',
      name: 'Hot Streak',
      description: 'Complete 5 challenges in a row',
      icon: 'flame',
      rarity: 'epic',
      earned: false,
      progress: { current: 3, total: 5 }
    },
    {
      id: '6',
      name: 'Holiday Hero',
      description: 'Complete all seasonal challenges',
      icon: 'gift',
      rarity: 'rare',
      earned: false,
      progress: { current: 2, total: 4 }
    }
  ];

  const getIcon = (iconName: string) => {
    const iconClass = "h-8 w-8";
    switch(iconName) {
      case 'zap': return <Zap className={iconClass} />;
      case 'trophy': return <Trophy className={iconClass} />;
      case 'crown': return <Crown className={iconClass} />;
      case 'star': return <Star className={iconClass} />;
      case 'flame': return <Flame className={iconClass} />;
      case 'gift': return <Gift className={iconClass} />;
      default: return <Award className={iconClass} />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch(rarity) {
      case 'legendary': return 'from-yellow-400 via-orange-500 to-red-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Challenge Badges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <TooltipProvider key={badge.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      badge.earned
                        ? 'bg-gradient-to-br ' + getRarityColor(badge.rarity) + ' border-transparent shadow-lg'
                        : 'bg-gray-100 border-gray-300 opacity-60'
                    }`}
                  >
                    <div className={`flex flex-col items-center gap-2 ${badge.earned ? 'text-white' : 'text-gray-500'}`}>
                      {getIcon(badge.icon)}
                      <span className="text-xs font-bold text-center">{badge.name}</span>
                      {badge.progress && !badge.earned && (
                        <Badge variant="secondary" className="text-xs">
                          {badge.progress.current}/{badge.progress.total}
                        </Badge>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-semibold">{badge.name}</p>
                    <p className="text-sm text-gray-600">{badge.description}</p>
                    <Badge variant="outline" className="text-xs capitalize">{badge.rarity}</Badge>
                    {badge.earnedDate && (
                      <p className="text-xs text-gray-500">Earned: {new Date(badge.earnedDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
