/**
 * EXPERT ASSIGNMENT MANAGER
 * Assigns each bot to become expert in ONE category (rotates)
 */

import { createClient } from '@supabase/supabase-js';
import { rejectionTracker } from './rejection-tracker';

interface ExpertAssignment {
  botName: string;
  expertCategory: string;
  assignedAt: Date;
  trainingSessions: number;
  accuracyBefore: number;
  accuracyAfter: number;
  patternsLearned: string[];
  rejectionInsights: {
    missedWinners: number;
    suggestedConfidenceAdjustment: number;
    suggestedEdgeAdjustment: number;
    keyPatterns: string[];
  };
}

const BOT_NAMES = [
  'sports_bot',
  'crypto_bot', 
  'politics_bot',
  'economics_bot',
  'entertainment_bot',
  'weather_bot',
  'technology_bot',
];

const CATEGORIES = [
  'sports',
  'crypto',
  'politics', 
  'economics',
  'entertainment',
  'weather',
  'technology',
];

export class ExpertAssignmentManager {
  private supabase: any;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  /**
   * Get current expert assignments
   */
  async getAssignments(): Promise<ExpertAssignment[]> {
    if (!this.supabase) return [];

    const { data } = await this.supabase
      .from('bot_expert_assignments')
      .select('*')
      .eq('is_active', true);

    return (data || []).map((a: any) => ({
      botName: a.bot_name,
      expertCategory: a.expert_category,
      assignedAt: new Date(a.assigned_at),
      trainingSessions: a.training_sessions || 0,
      accuracyBefore: a.accuracy_before,
      accuracyAfter: a.accuracy_after,
      patternsLearned: a.patterns_learned || [],
      rejectionInsights: a.rejection_insights || {},
    }));
  }

  /**
   * Get the expert category for a specific bot
   */
  async getExpertCategory(botName: string): Promise<string | null> {
    const assignments = await this.getAssignments();
    const assignment = assignments.find(a => a.botName === botName);
    return assignment?.expertCategory || null;
  }

  /**
   * Rotate expert assignments (weekly)
   * Each bot moves to the NEXT category in the list
   */
  async rotateAssignments(reason: string = 'weekly_rotation'): Promise<void> {
    if (!this.supabase) return;

    console.log('\n🔄 ROTATING EXPERT ASSIGNMENTS');
    console.log('═'.repeat(50));

    const currentAssignments = await this.getAssignments();
    const rotations: Record<string, string> = {};

    for (const assignment of currentAssignments) {
      const currentCatIndex = CATEGORIES.indexOf(assignment.expertCategory);
      const nextCatIndex = (currentCatIndex + 1) % CATEGORIES.length;
      const nextCategory = CATEGORIES[nextCatIndex];

      rotations[assignment.botName] = nextCategory;

      // Update assignment
      await this.supabase
        .from('bot_expert_assignments')
        .update({
          expert_category: nextCategory,
          assigned_at: new Date().toISOString(),
          training_sessions: 0,  // Reset for new category
          accuracy_before: null,
          accuracy_after: null,
          patterns_learned: [],
          rejection_insights: {},
        })
        .eq('bot_name', assignment.botName);

      console.log(`   ${assignment.botName}: ${assignment.expertCategory} → ${nextCategory}`);
    }

    // Log rotation
    await this.supabase.from('expert_rotation_schedule').insert({
      rotation_date: new Date().toISOString().split('T')[0],
      rotations,
      reason,
    });

    console.log('\n✅ Rotation complete!');
  }

  /**
   * Train a bot on its expert category using rejection data
   */
  async trainBotOnExpertCategory(botName: string): Promise<{
    success: boolean;
    insights: any;
  }> {
    if (!this.supabase) return { success: false, insights: null };

    const expertCategory = await this.getExpertCategory(botName);
    if (!expertCategory) {
      console.log(`   ⚠️ No expert category assigned to ${botName}`);
      return { success: false, insights: null };
    }

    console.log(`\n🎓 Training ${botName} as expert in: ${expertCategory.toUpperCase()}`);
    console.log('─'.repeat(50));

    // Get rejection stats for this category
    const stats = await rejectionTracker.getRejectionStats(expertCategory);
    const categoryStats = stats.find(s => s.category === expertCategory);
    
    if (!categoryStats || categoryStats.totalRejections < 10) {
      console.log(`   ⚠️ Not enough rejection data (${categoryStats?.totalRejections || 0} rejections)`);
      return { success: false, insights: null };
    }

    console.log(`   📊 Analyzing ${categoryStats.totalRejections} rejections...`);
    console.log(`   📊 ${categoryStats.wouldHaveWon} would have won (${categoryStats.winRate.toFixed(1)}%)`);
    console.log(`   💰 Missed profit: $${categoryStats.missedProfit.toFixed(2)}`);

    // Calculate suggested adjustments
    const insights = {
      missedWinners: categoryStats.wouldHaveWon,
      missedProfit: categoryStats.missedProfit,
      avgRejectedConfidence: categoryStats.avgRejectedConfidence,
      avgRejectedEdge: categoryStats.avgRejectedEdge,
      
      // If rejections are winning > 55%, we should lower thresholds
      suggestedConfidenceAdjustment: categoryStats.winRate > 55 
        ? -Math.min(5, (categoryStats.winRate - 50) / 2)  // Lower by up to 5%
        : 0,
      
      suggestedEdgeAdjustment: categoryStats.winRate > 55
        ? -Math.min(0.5, categoryStats.avgRejectedEdge * 0.2)  // Lower by up to 0.5%
        : 0,
      
      topRejectionReasons: categoryStats.topRejectionReasons,
      
      keyPatterns: [
        `Rejections in ${expertCategory} win ${categoryStats.winRate.toFixed(1)}% of the time`,
        `Average rejected confidence: ${categoryStats.avgRejectedConfidence.toFixed(1)}%`,
        `Average rejected edge: ${categoryStats.avgRejectedEdge.toFixed(2)}%`,
        categoryStats.winRate > 55 
          ? `RECOMMENDATION: Lower thresholds - missing profitable trades!`
          : `Current thresholds seem appropriate`,
      ],
    };

    // Update bot assignment with insights
    const { data: current } = await this.supabase
      .from('bot_expert_assignments')
      .select('training_sessions')
      .eq('bot_name', botName)
      .single();

    await this.supabase
      .from('bot_expert_assignments')
      .update({
        training_sessions: (current?.training_sessions || 0) + 1,
        rejection_insights: insights,
        patterns_learned: insights.keyPatterns,
      })
      .eq('bot_name', botName);

    console.log(`\n   💡 INSIGHTS FOR ${expertCategory.toUpperCase()}:`);
    console.log(`   ─────────────────────────────────────`);
    for (const pattern of insights.keyPatterns) {
      console.log(`   • ${pattern}`);
    }

    if (insights.suggestedConfidenceAdjustment !== 0) {
      console.log(`\n   🎯 SUGGESTED ADJUSTMENTS:`);
      console.log(`   • Confidence: ${insights.suggestedConfidenceAdjustment > 0 ? '+' : ''}${insights.suggestedConfidenceAdjustment.toFixed(1)}%`);
      console.log(`   • Edge: ${insights.suggestedEdgeAdjustment > 0 ? '+' : ''}${insights.suggestedEdgeAdjustment.toFixed(2)}%`);
    }

    return { success: true, insights };
  }

  /**
   * Train ALL bots on their expert categories
   */
  async trainAllExperts(): Promise<void> {
    console.log('\n');
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║         🎓 EXPERT TRAINING SESSION                        ║');
    console.log('║         Learning from Rejections by Category              ║');
    console.log('╚' + '═'.repeat(58) + '╝');

    const assignments = await this.getAssignments();
    
    for (const assignment of assignments) {
      await this.trainBotOnExpertCategory(assignment.botName);
    }

    console.log('\n✅ All expert training complete!');
  }

  /**
   * Get comprehensive status report
   */
  async getStatusReport(): Promise<string> {
    const assignments = await this.getAssignments();
    const allStats = await rejectionTracker.getRejectionStats();

    let report = `
╔════════════════════════════════════════════════════════════════╗
║           🎓 EXPERT ASSIGNMENT STATUS                          ║
╚════════════════════════════════════════════════════════════════╝

CURRENT ASSIGNMENTS:
${'─'.repeat(60)}
`;

    for (const a of assignments) {
      const stats = allStats.find(s => s.category === a.expertCategory);
      report += `
${a.botName.padEnd(20)} → Expert in: ${a.expertCategory.toUpperCase()}
   Training sessions: ${a.trainingSessions}
   Rejections analyzed: ${stats?.totalRejections || 0}
   Would have won: ${stats?.wouldHaveWon || 0} (${stats?.winRate.toFixed(1) || 0}%)
   Missed profit: $${stats?.missedProfit.toFixed(2) || '0.00'}
`;
    }

    report += `
${'─'.repeat(60)}
TOTAL MISSED OPPORTUNITIES:
   Rejections that would have won: ${allStats.reduce((sum, s) => sum + s.wouldHaveWon, 0)}
   Total missed profit: $${allStats.reduce((sum, s) => sum + s.missedProfit, 0).toFixed(2)}
`;

    return report;
  }
}

export const expertAssignmentManager = new ExpertAssignmentManager();

