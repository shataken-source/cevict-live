import { Trophy, Star, Ship, MessageSquare, Camera, Award } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: any;
  unlocked: boolean;
  progress?: number;
  total?: number;
}

export default function AchievementBadges({ userId }: { userId: string }) {
  const achievements: Achievement[] = [
    { id: 'first-booking', name: 'First Voyage', description: 'Complete your first booking', icon: Ship, unlocked: true },
    { id: 'five-star', name: 'Five Star Reviewer', description: 'Leave 5 reviews with 5 stars', icon: Star, unlocked: false, progress: 2, total: 5 },
    { id: 'photographer', name: 'Photographer', description: 'Upload 10 trip photos', icon: Camera, unlocked: false, progress: 4, total: 10 },
    { id: 'social-butterfly', name: 'Social Butterfly', description: 'Share 3 trips on social media', icon: MessageSquare, unlocked: false, progress: 1, total: 3 },
    { id: 'loyal-customer', name: 'Loyal Customer', description: 'Book 10 charters', icon: Trophy, unlocked: false, progress: 3, total: 10 },
    { id: 'ambassador', name: 'Brand Ambassador', description: 'Refer 5 friends', icon: Award, unlocked: false, progress: 0, total: 5 }
  ];

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Achievements</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <div key={achievement.id} className={`p-4 rounded-lg border-2 text-center ${achievement.unlocked ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
            <achievement.icon className={`w-8 h-8 mx-auto mb-2 ${achievement.unlocked ? 'text-yellow-600' : 'text-gray-400'}`} />
            <h4 className="font-semibold text-sm mb-1">{achievement.name}</h4>
            <p className="text-xs text-gray-600 mb-2">{achievement.description}</p>
            {!achievement.unlocked && achievement.progress !== undefined && (
              <Badge variant="outline" className="text-xs">{achievement.progress}/{achievement.total}</Badge>
            )}
            {achievement.unlocked && <Badge className="bg-yellow-500">Unlocked!</Badge>}
          </div>
        ))}
      </div>
    </Card>
  );
}
