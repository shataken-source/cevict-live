/**
 * Achievement Progress Tracker
 * 
 * Tracks and displays user achievement progress with real-time updates
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Trophy, Star, Ship, MessageSquare, Camera, 
  Award, Users, Anchor, Gift, Target, CheckCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: any;
  progress: number;
  target: number;
  rewardPoints: number;
  unlocked: boolean;
  unlockedAt?: string;
};

export default function AchievementProgressTracker({ userId }: { userId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadAchievements();
    }
  }, [userId]);

  const loadAchievements = async () => {
    try {
      setLoading(true);

      // Get achievement definitions
      const { data: achievementsData } = await supabase.functions.invoke('points-rewards-system', {
        body: { action: 'get_achievements' },
      });

      if (!achievementsData?.achievements) {
        setAchievements([]);
        return;
      }

      // Load user's achievement progress
      const { data: progressData, error } = await supabase
        .from('achievement_progress')
        .select('*')
        .eq('user_id', userId);

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading achievement progress:', error);
      }

      const progressMap = new Map(
        (progressData || []).map((ap: any) => [
          ap.achievement_id,
          { 
            progress: ap.progress || 0, 
            unlocked: ap.unlocked || false, 
            unlockedAt: ap.unlocked_at || undefined 
          }
        ])
      );

      // Map achievement definitions with progress
      const mappedAchievements = (achievementsData.achievements as any[]).map((ach: any) => {
        const progress = progressMap.get(ach.id) || { progress: 0, unlocked: false, unlockedAt: undefined };
        
        // Map icon names to components
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

        return {
          id: ach.id,
          name: ach.name,
          description: ach.requirement 
            ? `${ach.requirement.type}: ${ach.requirement.count}`
            : ach.description || '',
          icon: iconMap[ach.id] || Target,
          progress: progress.progress || 0,
          target: ach.requirement?.count || ach.target || 1,
          rewardPoints: ach.rewardPoints || 0,
          unlocked: progress.unlocked || false,
          unlockedAt: progress.unlockedAt,
        };
      });

      setAchievements(mappedAchievements);

    } catch (error: any) {
      console.error('Error loading achievements:', error);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const updateAchievementProgress = async (achievementId: string, increment: number = 1) => {
    try {
      const achievement = achievements.find(a => a.id === achievementId);
      if (!achievement) return;

      const newProgress = Math.min(achievement.progress + increment, achievement.target);
      const newlyUnlocked = !achievement.unlocked && newProgress >= achievement.target;

      // Update progress in database
      const { error: upsertError } = await supabase
        .from('achievement_progress')
        .upsert({
          user_id: userId,
          achievement_id: achievementId,
          progress: newProgress,
          target: achievement.target,
          unlocked: newlyUnlocked || achievement.unlocked,
          unlocked_at: newlyUnlocked ? new Date().toISOString() : achievement.unlockedAt,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,achievement_id',
        });

      if (upsertError && upsertError.code !== 'PGRST116') {
        console.error('Error updating achievement progress:', upsertError);
      }

      // If newly unlocked, award points and show notification
      if (newlyUnlocked) {
        await supabase.functions.invoke('points-rewards-system', {
          body: {
            action: 'award_points',
            userId,
            actionType: 'achievement_unlock',
          },
        });

        toast.success(
          `🎉 Achievement Unlocked: ${achievement.name}! +${achievement.rewardPoints} points`,
          { duration: 5000 }
        );
      }

      // Reload achievements
      await loadAchievements();

    } catch (error: any) {
      console.error('Error updating achievement progress:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Achievements
          </CardTitle>
          <Badge variant="outline">
            {unlockedCount} / {totalCount}
          </Badge>
        </div>
        <div className="mt-2">
          <Progress value={completionPercent} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {completionPercent.toFixed(0)}% complete
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement) => {
            const Icon = achievement.icon;
            const progressPercent = (achievement.progress / achievement.target) * 100;

            return (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400 shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${
                    achievement.unlocked ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      achievement.unlocked ? 'text-yellow-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`font-semibold text-sm ${
                        achievement.unlocked ? 'text-yellow-900' : 'text-gray-900'
                      }`}>
                        {achievement.name}
                      </h4>
                      {achievement.unlocked && (
                        <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
                  </div>
                </div>

                {!achievement.unlocked && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold">
                        {achievement.progress} / {achievement.target}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-1.5" />
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <Badge variant={achievement.unlocked ? 'default' : 'outline'} className="text-xs">
                    +{achievement.rewardPoints} pts
                  </Badge>
                  {achievement.unlocked && achievement.unlockedAt && (
                    <span className="text-xs text-gray-500">
                      {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Export function for updating achievements
export { AchievementProgressTracker };
