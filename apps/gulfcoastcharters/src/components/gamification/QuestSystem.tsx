/**
 * Quest System Component
 * 
 * Daily and weekly quests to encourage engagement
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Target, CheckCircle, Clock, Gift, 
  Star, MessageSquare, Camera, Anchor, 
  Users, TrendingUp, Zap 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Quest = {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
  expiresAt?: string;
  icon: any;
};

const dailyQuests: Omit<Quest, 'progress' | 'completed'>[] = [
  {
    id: 'daily_checkin',
    title: 'Daily Check-In',
    description: 'Check in to earn your daily reward',
    type: 'daily',
    target: 1,
    reward: 5,
    icon: Calendar,
  },
  {
    id: 'daily_community',
    title: 'Community Engagement',
    description: 'Post a message or reply in the community',
    type: 'daily',
    target: 1,
    reward: 10,
    icon: MessageSquare,
  },
  {
    id: 'daily_browse',
    title: 'Explore Vessels',
    description: 'View 3 different vessel profiles',
    type: 'daily',
    target: 3,
    reward: 15,
    icon: Anchor,
  },
];

const weeklyQuests: Omit<Quest, 'progress' | 'completed'>[] = [
  {
    id: 'weekly_reviews',
    title: 'Review Master',
    description: 'Write 3 reviews this week',
    type: 'weekly',
    target: 3,
    reward: 100,
    icon: Star,
  },
  {
    id: 'weekly_photos',
    title: 'Photo Collector',
    description: 'Upload 5 photos this week',
    type: 'weekly',
    target: 5,
    reward: 75,
    icon: Camera,
  },
  {
    id: 'weekly_social',
    title: 'Social Butterfly',
    description: 'Post 10 messages this week',
    type: 'weekly',
    target: 10,
    reward: 150,
    icon: Users,
  },
];

export default function QuestSystem({ userId }: { userId: string }) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    if (userId) {
      loadQuests();
    }
  }, [userId, activeTab]);

  const loadQuests = async () => {
    try {
      setLoading(true);

      // Load quest progress from database
      const { data: questProgress, error } = await supabase
        .from('quest_progress')
        .select('*')
        .eq('user_id', userId);

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading quest progress:', error);
      }

      const progressMap = new Map(
        (questProgress || []).map((qp: any) => [qp.quest_id, qp.progress])
      );

      // Combine quest definitions with progress
      const questList = (activeTab === 'daily' ? dailyQuests : weeklyQuests).map(quest => {
        const progress = progressMap.get(quest.id) || 0;
        const completed = progress >= quest.target;
        
        return {
          ...quest,
          progress,
          completed,
        };
      });

      setQuests(questList);

    } catch (error: any) {
      console.error('Error loading quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (quest: Quest) => {
    if (!quest.completed) {
      toast.error('Quest not completed yet!');
      return;
    }

    try {
      // Check if already claimed
      const { data: claimed } = await supabase
        .from('quest_rewards')
        .select('id')
        .eq('user_id', userId)
        .eq('quest_id', quest.id)
        .single();

      if (claimed) {
        toast.info('Reward already claimed!');
        return;
      }

      // Award points
      await supabase.functions.invoke('points-rewards-system', {
        body: {
          action: 'award_points',
          userId,
          actionType: 'quest_complete',
        },
      });

      // Mark as claimed
      await supabase
        .from('quest_rewards')
        .insert({
          user_id: userId,
          quest_id: quest.id,
          points_awarded: quest.reward,
          claimed_at: new Date().toISOString(),
        });

      toast.success(`🎉 Quest completed! +${quest.reward} points awarded!`);
      await loadQuests();

    } catch (error: any) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward. Please try again.');
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-6 h-6" />
            Quests & Challenges
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeTab === 'daily' ? 'default' : 'outline'}
              onClick={() => setActiveTab('daily')}
            >
              Daily
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'weekly' ? 'default' : 'outline'}
              onClick={() => setActiveTab('weekly')}
            >
              Weekly
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {quests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No quests available</p>
          </div>
        ) : (
          quests.map((quest) => {
            const Icon = quest.icon;
            const progressPercent = (quest.progress / quest.target) * 100;

            return (
              <div
                key={quest.id}
                className={`p-4 rounded-lg border-2 ${
                  quest.completed
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    quest.completed ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      quest.completed ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{quest.title}</h4>
                        <p className="text-sm text-gray-600">{quest.description}</p>
                      </div>
                      <Badge variant={quest.completed ? 'default' : 'outline'}>
                        +{quest.reward} pts
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-semibold">
                          {quest.progress} / {quest.target}
                        </span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                    {quest.completed && (
                      <Button
                        onClick={() => claimReward(quest)}
                        className="w-full mt-3"
                        size="sm"
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Claim Reward
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// Add Calendar import
import { Calendar } from 'lucide-react';
