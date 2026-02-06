/**
 * Quest Progress Tracker Utility
 * 
 * Automatically tracks quest progress based on user actions
 */

import { supabase } from '@/lib/supabase';

type QuestAction = {
  questId: string;
  increment: number;
};

const QUEST_ACTION_MAP: Record<string, QuestAction[]> = {
  'daily_login': [
    { questId: 'daily_checkin', increment: 1 }
  ],
  'message_post': [
    { questId: 'daily_community', increment: 1 },
    { questId: 'weekly_social', increment: 1 }
  ],
  'message': [
    { questId: 'daily_community', increment: 1 },
    { questId: 'weekly_social', increment: 1 }
  ],
  'review': [
    { questId: 'weekly_reviews', increment: 1 }
  ],
  'photo_upload': [
    { questId: 'weekly_photos', increment: 1 }
  ],
};

/**
 * Update quest progress when an action occurs
 */
export async function updateQuestProgress(
  userId: string,
  actionType: string
): Promise<void> {
  try {
    const questActions = QUEST_ACTION_MAP[actionType] || [];
    
    if (questActions.length === 0) return;

    // Get current quest progress
    const { data: questProgress } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', userId);

    const progressMap = new Map(
      (questProgress || []).map((qp: any) => [qp.quest_id, qp])
    );

    // Update each relevant quest
    for (const questAction of questActions) {
      const existing = progressMap.get(questAction.questId);
      
      if (existing) {
        const newProgress = Math.min(
          (existing.progress || 0) + questAction.increment,
          existing.target
        );
        const completed = newProgress >= existing.target;

        await supabase
          .from('quest_progress')
          .update({
            progress: newProgress,
            completed,
            completed_at: completed && !existing.completed 
              ? new Date().toISOString() 
              : existing.completed_at,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('quest_id', questAction.questId);
      } else {
        // Create new quest progress entry
        // Need to determine quest type and target from quest definitions
        // For now, we'll let the QuestSystem component handle initial creation
      }
    }
  } catch (error) {
    console.error('Error updating quest progress:', error);
    // Don't throw - quest tracking shouldn't block main actions
  }
}

/**
 * Initialize daily quests for a user
 */
export async function initializeDailyQuests(userId: string): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const dailyQuests = [
      { id: 'daily_checkin', type: 'daily', target: 1, expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString() },
      { id: 'daily_community', type: 'daily', target: 1, expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString() },
      { id: 'daily_browse', type: 'daily', target: 3, expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString() },
    ];

    // Check if quests already exist for today
    const { data: existing } = await supabase
      .from('quest_progress')
      .select('quest_id')
      .eq('user_id', userId)
      .eq('quest_type', 'daily')
      .gte('expires_at', todayStr);

    const existingIds = new Set((existing || []).map((q: any) => q.quest_id));

    // Insert missing daily quests
    for (const quest of dailyQuests) {
      if (!existingIds.has(quest.id)) {
        await supabase
          .from('quest_progress')
          .insert({
            user_id: userId,
            quest_id: quest.id,
            quest_type: quest.type,
            progress: 0,
            target: quest.target,
            completed: false,
            expires_at: quest.expiresAt,
          });
      }
    }
  } catch (error) {
    console.error('Error initializing daily quests:', error);
  }
}

/**
 * Initialize weekly quests for a user
 */
export async function initializeWeeklyQuests(userId: string): Promise<void> {
  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weeklyQuests = [
      { id: 'weekly_reviews', type: 'weekly', target: 3, expiresAt: weekEnd.toISOString() },
      { id: 'weekly_photos', type: 'weekly', target: 5, expiresAt: weekEnd.toISOString() },
      { id: 'weekly_social', type: 'weekly', target: 10, expiresAt: weekEnd.toISOString() },
    ];

    // Check if quests already exist for this week
    const { data: existing } = await supabase
      .from('quest_progress')
      .select('quest_id')
      .eq('user_id', userId)
      .eq('quest_type', 'weekly')
      .gte('expires_at', weekStart.toISOString());

    const existingIds = new Set((existing || []).map((q: any) => q.quest_id));

    // Insert missing weekly quests
    for (const quest of weeklyQuests) {
      if (!existingIds.has(quest.id)) {
        await supabase
          .from('quest_progress')
          .insert({
            user_id: userId,
            quest_id: quest.id,
            quest_type: quest.type,
            progress: 0,
            target: quest.target,
            completed: false,
            expires_at: quest.expiresAt,
          });
      }
    }
  } catch (error) {
    console.error('Error initializing weekly quests:', error);
  }
}
