import { useState, useEffect } from 'react';
import { Trophy, Star, Ship, MessageSquare, Camera, Award, Users, Anchor, Gift, Target, CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { supabase } from '@/lib/supabase';
import { SocialShareButton } from './SocialShareButton';


interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: any;
  unlocked: boolean;
  progress: number;
  total: number;
  points: number;
}

export default function AchievementBadgesEnhanced({ userId }: { userId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: 'first-booking', name: 'First Voyage', desc: 'Complete your first booking', icon: Ship, unlocked: false, progress: 0, total: 1, points: 100 },
    { id: 'ten-reviews', name: 'Critic', desc: 'Leave 10 reviews', icon: Star, unlocked: false, progress: 0, total: 10, points: 500 },
    { id: 'points-1000', name: 'Rising Star', desc: 'Earn 1000 points', icon: Trophy, unlocked: false, progress: 0, total: 1000, points: 150 },
    { id: 'points-5000', name: 'Legend', desc: 'Earn 5000 points', icon: Award, unlocked: false, progress: 0, total: 5000, points: 500 },
    { id: 'referral-5', name: 'Ambassador', desc: 'Refer 5 friends', icon: Users, unlocked: false, progress: 0, total: 5, points: 250 },
    { id: 'photo-25', name: 'Photographer', desc: 'Upload 25 photos', icon: Camera, unlocked: false, progress: 0, total: 25, points: 200 },
    { id: 'message-50', name: 'Social Butterfly', desc: 'Post 50 messages', icon: MessageSquare, unlocked: false, progress: 0, total: 50, points: 150 },
    { id: 'booking-10', name: 'Seasoned Sailor', desc: 'Complete 10 bookings', icon: Anchor, unlocked: false, progress: 0, total: 10, points: 300 },
    { id: 'redeem-reward', name: 'Reward Hunter', desc: 'Redeem your first reward', icon: Gift, unlocked: false, progress: 0, total: 1, points: 100 },
  ]);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      // Get achievement definitions
      const { data: achievementsData } = await supabase.functions.invoke('points-rewards-system', {
        body: { action: 'get_achievements' },
      });

      if (!achievementsData?.achievements) return;

      // Load user's achievement progress
      const { data: progressData } = await supabase
        .from('achievement_progress')
        .select('*')
        .eq('user_id', userId);

      const progressMap = new Map(
        (progressData || []).map((ap: any) => [
          ap.achievement_id,
          { progress: ap.progress, unlocked: ap.unlocked }
        ])
      );

      // Map achievements with real progress
      const mappedAchievements = (achievementsData.achievements as any[]).map((ach: any) => {
        const progress = progressMap.get(ach.id) || { progress: 0, unlocked: false };
        const target = ach.requirement?.count || 1000;
        
        return {
          id: ach.id,
          name: ach.name,
          desc: ach.requirement 
            ? `${ach.requirement.type}: ${target}`
            : ach.description || '',
          icon: Ship, // Default, will be mapped below
          unlocked: progress.unlocked || false,
          progress: progress.progress || 0,
          total: target,
          points: ach.rewardPoints || 150,
        };
      });

      // Map icons
      const iconMap: Record<string, any> = {
        first_voyage: Ship,
        critic: Star,
        rising_star: Trophy,
        legend: Award,
        ambassador: Users,
        photographer: Camera,
        social_butterfly: MessageSquare,
        seasoned_sailor: Anchor,
        reward_hunter: Gift,
      };

      const finalAchievements = mappedAchievements.map(a => ({
        ...a,
        icon: iconMap[a.id] || Target,
      }));

      setAchievements(finalAchievements);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50">
      <h3 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2">
        <Target className="w-6 h-6" />
        Achievements
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <div key={achievement.id} className={`p-4 rounded-lg border-2 ${achievement.unlocked ? 'bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-500 shadow-lg' : 'bg-white border-gray-300'}`}>
            <div className="flex items-start justify-between mb-2">
              <achievement.icon className={`w-10 h-10 ${achievement.unlocked ? 'text-yellow-600' : 'text-gray-400'}`} />
              {achievement.unlocked && (
                <div className="flex gap-1">
                  <SocialShareButton
                    type="achievement"
                    data={{
                      id: achievement.id,
                      achievementName: achievement.name,
                      username: 'User',
                      shareText: `I just unlocked "${achievement.name}" on Gulf Coast Charters! ${achievement.desc}`
                    }}
                    userId={userId}
                  />
                  <Badge className="bg-yellow-500">Unlocked!</Badge>
                </div>
              )}
            </div>
            <h4 className="font-bold text-blue-900 mb-1">{achievement.name}</h4>
            <p className="text-sm text-gray-700 mb-2">{achievement.desc}</p>
            <Badge variant="outline" className="mb-2">+{achievement.points} points</Badge>
            {!achievement.unlocked && (
              <div className="space-y-1">
                <Progress value={(achievement.progress / achievement.total) * 100} className="h-2" />
                <p className="text-xs text-gray-600 text-center">{achievement.progress}/{achievement.total}</p>
              </div>
            )}
          </div>

        ))}
      </div>
    </Card>
  );
}
