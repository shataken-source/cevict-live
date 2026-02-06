/**
 * Daily Check-In Component
 * 
 * Encourages daily return visits with streak tracking and rewards
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Calendar, Flame, Gift, Star, Zap, 
  Trophy, CheckCircle, Clock, Sparkles 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { awardDailyLogin } from '@/utils/avatarPointsSystem';

type CheckInData = {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string | null;
  totalCheckIns: number;
  todayCheckedIn: boolean;
  streakBonus: number;
  nextMilestone: number;
  daysUntilMilestone: number;
};

type Milestone = {
  days: number;
  reward: string;
  points: number;
  icon: any;
};

const milestones: Milestone[] = [
  { days: 3, reward: '3-Day Streak', points: 25, icon: Star },
  { days: 7, reward: 'Week Warrior', points: 75, icon: Flame },
  { days: 14, reward: 'Two Week Champion', points: 150, icon: Trophy },
  { days: 30, reward: 'Monthly Master', points: 500, icon: Zap },
  { days: 60, reward: 'Double Month Legend', points: 1000, icon: Sparkles },
  { days: 100, reward: 'Century Club', points: 2500, icon: Trophy },
];

export default function DailyCheckIn({ userId }: { userId: string }) {
  const [checkInData, setCheckInData] = useState<CheckInData>({
    currentStreak: 0,
    longestStreak: 0,
    lastCheckIn: null,
    totalCheckIns: 0,
    todayCheckedIn: false,
    streakBonus: 0,
    nextMilestone: 3,
    daysUntilMilestone: 3,
  });
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (userId) {
      loadCheckInData();
    }
  }, [userId]);

  const loadCheckInData = async () => {
    try {
      setLoading(true);

      // Load check-in data from database
      const { data: checkInRecord, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading check-in data:', error);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const lastCheckIn = checkInRecord?.last_check_in 
        ? new Date(checkInRecord.last_check_in)
        : null;
      const lastCheckInStr = lastCheckIn 
        ? lastCheckIn.toISOString().split('T')[0]
        : null;

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Calculate streak
      let currentStreak = checkInRecord?.current_streak || 0;
      const todayCheckedIn = lastCheckInStr === todayStr;

      // If last check-in was yesterday, maintain streak; if earlier, reset
      if (!todayCheckedIn && lastCheckInStr === yesterdayStr) {
        // Streak maintained, just need to check in today
      } else if (lastCheckInStr && lastCheckInStr < yesterdayStr) {
        // Streak broken
        currentStreak = 0;
      }

      // Calculate streak bonus (increases with streak length)
      const streakBonus = Math.min(currentStreak * 2, 50); // Max 50 bonus points

      // Find next milestone
      const nextMilestone = milestones.find(m => m.days > currentStreak) || milestones[milestones.length - 1];
      const daysUntilMilestone = nextMilestone.days - currentStreak;

      setCheckInData({
        currentStreak,
        longestStreak: checkInRecord?.longest_streak || currentStreak,
        lastCheckIn: lastCheckInStr,
        totalCheckIns: checkInRecord?.total_check_ins || 0,
        todayCheckedIn,
        streakBonus,
        nextMilestone: nextMilestone.days,
        daysUntilMilestone,
      });

    } catch (error: any) {
      console.error('Error loading check-in data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (checkInData.todayCheckedIn) {
      toast.info('You\'ve already checked in today! Come back tomorrow.');
      return;
    }

    try {
      setCheckingIn(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Calculate new streak
      let newStreak = 1;
      if (checkInData.lastCheckIn === yesterdayStr) {
        newStreak = checkInData.currentStreak + 1;
      }

      // Award points
      const basePoints = 5; // Daily login base
      const streakPoints = checkInData.streakBonus > 0 ? checkInData.streakBonus : 0;
      const totalPoints = basePoints + streakPoints;

      // Award daily login points
      const result = await awardDailyLogin(userId);
      
      // Award streak bonus if applicable
      if (streakPoints > 0) {
        await supabase.functions.invoke('points-rewards-system', {
          body: {
            action: 'award_points',
            userId,
            actionType: 'streak_bonus',
          },
        });
      }

      // Update check-in record
      const { error: upsertError } = await supabase
        .from('daily_check_ins')
        .upsert({
          user_id: userId,
          last_check_in: todayStr,
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, checkInData.longestStreak),
          total_check_ins: checkInData.totalCheckIns + 1,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError && upsertError.code !== 'PGRST116') {
        console.error('Error updating check-in:', upsertError);
      }

      // Check for milestone achievement
      const achievedMilestone = milestones.find(m => m.days === newStreak);
      if (achievedMilestone) {
        toast.success(
          `🎉 Milestone Achieved! ${achievedMilestone.reward} - ${achievedMilestone.points} bonus points!`,
          { duration: 5000 }
        );
        
        // Award milestone bonus
        await supabase.functions.invoke('points-rewards-system', {
          body: {
            action: 'award_points',
            userId,
            actionType: 'achievement_unlock',
          },
        });
      } else {
        toast.success(
          `✅ Checked in! +${basePoints} points${streakPoints > 0 ? ` +${streakPoints} streak bonus` : ''}`,
          { duration: 3000 }
        );
      }

      // Reload data
      await loadCheckInData();

    } catch (error: any) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  const nextMilestone = milestones.find(m => m.days > checkInData.currentStreak);
  const progressToMilestone = nextMilestone 
    ? (checkInData.currentStreak / nextMilestone.days) * 100 
    : 100;

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
    <Card className="bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 border-2 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-orange-600" />
          Daily Check-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streak Display */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className={`w-8 h-8 ${checkInData.currentStreak > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
            <span className="text-4xl font-bold text-orange-600">
              {checkInData.currentStreak}
            </span>
            <span className="text-lg text-gray-600">day streak</span>
          </div>
          {checkInData.currentStreak > 0 && (
            <p className="text-sm text-gray-600">
              Keep it going! 🔥
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{checkInData.totalCheckIns}</p>
            <p className="text-xs text-gray-600">Total Check-ins</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">{checkInData.longestStreak}</p>
            <p className="text-xs text-gray-600">Best Streak</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">+{checkInData.streakBonus || 5}</p>
            <p className="text-xs text-gray-600">Today's Points</p>
          </div>
        </div>

        {/* Next Milestone */}
        {nextMilestone && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Next Milestone:</span>
              <span className="font-semibold">{nextMilestone.reward}</span>
            </div>
            <Progress value={progressToMilestone} className="h-2" />
            <p className="text-xs text-gray-500 text-center">
              {checkInData.daysUntilMilestone} more day{checkInData.daysUntilMilestone !== 1 ? 's' : ''} to unlock
            </p>
          </div>
        )}

        {/* Check-In Button */}
        <Button
          onClick={handleCheckIn}
          disabled={checkInData.todayCheckedIn || checkingIn}
          className="w-full"
          size="lg"
          variant={checkInData.todayCheckedIn ? 'secondary' : 'default'}
        >
          {checkingIn ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Checking in...
            </>
          ) : checkInData.todayCheckedIn ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Already Checked In Today
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              Check In Now
            </>
          )}
        </Button>

        {/* Rewards Info */}
        <div className="pt-4 border-t border-orange-200">
          <p className="text-xs text-gray-600 text-center">
            Daily check-in: <strong>+5 points</strong>
            {checkInData.currentStreak > 0 && (
              <> • Streak bonus: <strong>+{checkInData.streakBonus} points</strong></>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
