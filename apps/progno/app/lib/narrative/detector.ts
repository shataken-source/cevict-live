/**
 * Narrative Detector
 * Multi-source detection engine for identifying narratives
 */

import { NARRATIVE_CATALOG, NarrativeType } from './catalog';

export interface DetectedNarrative {
  narrativeId: string;
  narrative: NarrativeType;

  // Detection details
  detectedFrom: ('news' | 'social' | 'press' | 'schedule' | 'stats')[];
  evidence: NarrativeEvidence[];

  // Strength
  mentions: number;         // How many times mentioned
  prominence: number;       // How prominently featured (0-1)
  recency: number;          // Days since first detected

  // Calculated impact
  rawImpact: number;
  adjustedImpact: number;   // After team-specific adjustment
  confidence: number;
}

export interface NarrativeEvidence {
  source: string;
  type: 'headline' | 'quote' | 'article' | 'tweet' | 'matchup' | 'stats';
  text: string;
  timestamp: Date;
  weight: number;
  sourceTier?: 1 | 2 | 3;  // For source tier weighting
}

export interface NewsArticle {
  title: string;
  content?: string;
  source: string;
  sourceTier: 1 | 2 | 3;
  publishDate: Date;
}

export interface ScheduleContext {
  previousOpponent?: { id: string; rank?: number; name: string };
  nextOpponent?: { id: string; rank?: number; name: string };
  currentOpponent: { id: string; rank?: number; name: string };
  weekNumber: number;
  isPrimetime: boolean;
  broadcast?: string;
}

export interface RosterContext {
  players: Array<{
    id: string;
    name: string;
    position: string;
    isStarter: boolean;
    previousTeams?: string[];
    releasedFrom?: string[];
    contractYear?: boolean;
  }>;
  coach?: {
    id: string;
    name: string;
    previousTeams?: string[];
  };
}

export interface StatsContext {
  currentStreak?: { type: 'winning' | 'losing'; count: number };
  lastMeeting?: {
    date: Date;
    homeScore: number;
    awayScore: number;
    margin: number;
  };
  playoffHistory?: {
    eliminatedBy?: string;
    eliminatedDate?: Date;
    round?: string;
  };
  isDefendingChampion?: boolean;
}

/**
 * Narrative Detector Class
 */
export class NarrativeDetector {

  /**
   * Detect all narratives for a matchup
   */
  async detectNarratives(
    teamId: string,
    opponentId: string,
    gameDate: Date,
    context: {
      schedule?: ScheduleContext;
      roster?: RosterContext;
      stats?: StatsContext;
      news?: NewsArticle[];
      social?: Array<{ text: string; author: string; timestamp: Date }>;
    }
  ): Promise<DetectedNarrative[]> {

    const detected: DetectedNarrative[] = [];

    // 1. SCHEDULE-BASED DETECTION (automatic, deterministic)
    if (context.schedule) {
      const scheduleNarratives = this.detectFromSchedule(
        teamId, opponentId, gameDate, context.schedule
      );
      detected.push(...scheduleNarratives);
    }

    // 2. ROSTER-BASED DETECTION (revenge games, contract years)
    if (context.roster) {
      const rosterNarratives = this.detectFromRoster(
        teamId, opponentId, context.roster
      );
      detected.push(...rosterNarratives);
    }

    // 3. STATS-BASED DETECTION (streaks, last meetings)
    if (context.stats) {
      const statsNarratives = this.detectFromStats(
        teamId, opponentId, context.stats
      );
      detected.push(...statsNarratives);
    }

    // 4. NEWS-BASED DETECTION (headlines, articles)
    if (context.news) {
      const newsNarratives = this.detectFromNews(
        teamId, opponentId, context.news
      );
      detected.push(...newsNarratives);
    }

    // 5. SOCIAL-BASED DETECTION (player/coach quotes)
    if (context.social) {
      const socialNarratives = this.detectFromSocial(
        teamId, opponentId, context.social
      );
      detected.push(...socialNarratives);
    }

    // 6. Deduplicate and merge
    const merged = this.mergeNarratives(detected);

    // 7. Calculate final impacts with decay
    const final = this.calculateImpacts(merged, gameDate);

    return final;
  }

  /**
   * SCHEDULE-BASED DETECTION
   * Deterministic rules based on schedule context
   */
  private detectFromSchedule(
    teamId: string,
    opponentId: string,
    gameDate: Date,
    schedule: ScheduleContext
  ): DetectedNarrative[] {

    const narratives: DetectedNarrative[] = [];

    // TRAP GAME DETECTION (Enhanced with look-ahead factor)
    if (schedule.previousOpponent && schedule.nextOpponent) {
      const prevRank = schedule.previousOpponent.rank || 50;
      const nextRank = schedule.nextOpponent.rank || 50;
      const currRank = schedule.currentOpponent.rank || 50;

      // Enhanced trap game logic:
      // Trap = (Next opponent is strong AND current opponent is weak) OR
      //       (Previous opponent was strong AND current opponent is weak)
      const nextOpponentStrength = nextRank <= 10 ? 1.0 : nextRank <= 20 ? 0.5 : 0;
      const currentOpponentWeakness = currRank > 30 ? 1.0 : currRank > 20 ? 0.5 : 0;
      const prevOpponentStrength = prevRank <= 10 ? 0.5 : 0;

      const trapScore = (nextOpponentStrength * 0.5) + (currentOpponentWeakness * 0.5) + (prevOpponentStrength * 0.2);

      if (trapScore >= 0.6) {
        narratives.push(this.createNarrative('complacency_trap', [{
          source: 'schedule',
          type: 'matchup',
          text: `Sandwiched between ${schedule.previousOpponent.name} (rank ${prevRank}) and ${schedule.nextOpponent.name} (rank ${nextRank})`,
          timestamp: new Date(),
          weight: trapScore,
          sourceTier: 1, // Schedule is always tier 1 (deterministic)
        }]));
      }
    }

    // RIVALRY DETECTION (simplified - would check rivalry database)
    // For now, detect division games
    const isDivisionGame = this.checkDivisionRivalry(teamId, opponentId);
    if (isDivisionGame) {
      narratives.push(this.createNarrative('rivalry_division', [{
        source: 'schedule',
        type: 'matchup',
        text: `Division rivalry game`,
        timestamp: new Date(),
        weight: 1.0,
        sourceTier: 1,
      }]));
    }

    // MUST-WIN DETECTION (late season + playoff implications)
    if (schedule.weekNumber >= 12) {
      // Would check playoff odds from stats context
      narratives.push(this.createNarrative('pressure_must_win', [{
        source: 'schedule',
        type: 'matchup',
        text: `Week ${schedule.weekNumber} - playoff implications`,
        timestamp: new Date(),
        weight: 0.8,
        sourceTier: 1,
      }]));
    }

    // PRIMETIME DETECTION
    if (schedule.isPrimetime) {
      narratives.push(this.createNarrative('pressure_primetime', [{
        source: 'schedule',
        type: 'matchup',
        text: schedule.broadcast || 'Primetime game',
        timestamp: new Date(),
        weight: 1.0,
        sourceTier: 1,
      }]));
    }

    // HEAVY FAVORITE (detected by line, not schedule - placeholder)
    // Would be passed in from odds context

    return narratives;
  }

  /**
   * ROSTER-BASED DETECTION
   * Revenge games, contract years, etc.
   */
  private detectFromRoster(
    teamId: string,
    opponentId: string,
    roster: RosterContext
  ): DetectedNarrative[] {

    const narratives: DetectedNarrative[] = [];

    // Check each player
    for (const player of roster.players) {
      // TRADED PLAYER REVENGE
      if (player.previousTeams?.includes(opponentId)) {
        narratives.push(this.createNarrative('revenge_traded', [{
          source: 'roster',
          type: 'matchup',
          text: `${player.name} (${player.position}) traded from ${opponentId}`,
          timestamp: new Date(),
          weight: player.isStarter ? 1.0 : 0.5,
          sourceTier: 1, // Roster data is tier 1
        }]));
      }

      // CUT/RELEASED PLAYER REVENGE
      if (player.releasedFrom?.includes(opponentId)) {
        narratives.push(this.createNarrative('revenge_cut', [{
          source: 'roster',
          type: 'matchup',
          text: `${player.name} released by ${opponentId}`,
          timestamp: new Date(),
          weight: player.isStarter ? 1.0 : 0.4,
          sourceTier: 1,
        }]));
      }

      // CONTRACT YEAR (only for starters)
      if (player.contractYear && player.isStarter) {
        narratives.push(this.createNarrative('redemption_contract_year', [{
          source: 'roster',
          type: 'matchup',
          text: `${player.name} (${player.position}) in contract year`,
          timestamp: new Date(),
          weight: player.position === 'QB' ? 1.0 : 0.6,
          sourceTier: 1,
        }]));
      }
    }

    // COACH REVENGE
    if (roster.coach?.previousTeams?.includes(opponentId)) {
      narratives.push(this.createNarrative('revenge_coach', [{
        source: 'roster',
        type: 'matchup',
        text: `${roster.coach.name} facing former team ${opponentId}`,
        timestamp: new Date(),
        weight: 1.0,
        sourceTier: 1,
      }]));
    }

    return narratives;
  }

  /**
   * STATS-BASED DETECTION
   * Streaks, last meetings, milestones
   */
  private detectFromStats(
    teamId: string,
    opponentId: string,
    stats: StatsContext
  ): DetectedNarrative[] {

    const narratives: DetectedNarrative[] = [];

    // LOSING STREAK
    if (stats.currentStreak?.type === 'losing' && stats.currentStreak.count >= 3) {
      narratives.push(this.createNarrative('adversity_losing_streak', [{
        source: 'stats',
        type: 'stats',
        text: `${stats.currentStreak.count}-game losing streak`,
        timestamp: new Date(),
        weight: Math.min(stats.currentStreak.count / 5, 1.0),
        sourceTier: 1,
      }]));
    }

    // BLOWOUT LOSS REVENGE (last meeting)
    if (stats.lastMeeting && stats.lastMeeting.margin <= -17) {
      narratives.push(this.createNarrative('revenge_blowout', [{
        source: 'stats',
        type: 'stats',
        text: `Lost ${Math.abs(stats.lastMeeting.margin)} points last meeting`,
        timestamp: stats.lastMeeting.date,
        weight: Math.min(Math.abs(stats.lastMeeting.margin) / 30, 1.0),
        sourceTier: 1,
      }]));
    }

    // PLAYOFF LOSS REVENGE
    if (stats.playoffHistory?.eliminatedBy === opponentId) {
      const daysSince = this.daysSince(stats.playoffHistory.eliminatedDate || new Date());
      if (daysSince < 365) {
        narratives.push(this.createNarrative('revenge_playoff_loss', [{
          source: 'stats',
          type: 'stats',
          text: `Eliminated by ${opponentId} in ${stats.playoffHistory.round}`,
          timestamp: stats.playoffHistory.eliminatedDate || new Date(),
          weight: 1.0,
          sourceTier: 1,
        }]));
      }
    }

    // CHAMPIONSHIP HANGOVER
    if (stats.isDefendingChampion) {
      const weekNumber = this.getWeekNumber(new Date());
      if (weekNumber <= 8) {
        narratives.push(this.createNarrative('complacency_championship_hangover', [{
          source: 'stats',
          type: 'stats',
          text: 'Defending champions - early season',
          timestamp: new Date(),
          weight: Math.max(1 - (weekNumber / 10), 0.3),
          sourceTier: 1,
        }]));
      }
    }

    return narratives;
  }

  /**
   * NEWS-BASED DETECTION
   * Keyword and pattern matching in headlines/articles
   */
  private detectFromNews(
    teamId: string,
    opponentId: string,
    news: NewsArticle[]
  ): DetectedNarrative[] {

    const narratives: DetectedNarrative[] = [];

    for (const article of news) {
      const text = `${article.title} ${article.content || ''}`.toLowerCase();

      // Check each narrative type
      for (const narrativeType of NARRATIVE_CATALOG) {
        // Skip if this narrative requires tier 1 source and article isn't tier 1
        // (for sensitive narratives like legal, contract disputes)
        if (this.requiresTier1Source(narrativeType.id) && article.sourceTier !== 1) {
          continue;
        }

        let matched = false;

        // Check keywords
        for (const keyword of narrativeType.keywords) {
          if (text.includes(keyword.toLowerCase())) {
            matched = true;
            break;
          }
        }

        // Check patterns
        if (!matched) {
          for (const pattern of narrativeType.patterns) {
            if (pattern.test(article.title) ||
                (article.content && pattern.test(article.content))) {
              matched = true;
              break;
            }
          }
        }

        if (matched) {
          const existing = narratives.find(n => n.narrativeId === narrativeType.id);

          if (existing) {
            existing.evidence.push({
              source: article.source,
              type: 'headline',
              text: article.title,
              timestamp: article.publishDate,
              weight: article.sourceTier === 1 ? 1.0 : article.sourceTier === 2 ? 0.7 : 0.5,
              sourceTier: article.sourceTier,
            });
            existing.mentions++;
            existing.detectedFrom.push('news');
          } else {
            narratives.push(this.createNarrative(narrativeType.id, [{
              source: article.source,
              type: 'headline',
              text: article.title,
              timestamp: article.publishDate,
              weight: article.sourceTier === 1 ? 1.0 : article.sourceTier === 2 ? 0.7 : 0.5,
              sourceTier: article.sourceTier,
            }]));
          }
        }
      }
    }

    return narratives;
  }

  /**
   * SOCIAL-BASED DETECTION
   * Player/coach quotes from social media
   */
  private detectFromSocial(
    teamId: string,
    opponentId: string,
    social: Array<{ text: string; author: string; timestamp: Date }>
  ): DetectedNarrative[] {

    const narratives: DetectedNarrative[] = [];

    for (const post of social) {
      const text = post.text.toLowerCase();

      for (const narrativeType of NARRATIVE_CATALOG) {
        // Social media is less reliable - require tier 1 for sensitive narratives
        if (this.requiresTier1Source(narrativeType.id)) {
          continue; // Skip sensitive narratives from social
        }

        let matched = false;

        for (const keyword of narrativeType.keywords) {
          if (text.includes(keyword.toLowerCase())) {
            matched = true;
            break;
          }
        }

        if (matched) {
          const existing = narratives.find(n => n.narrativeId === narrativeType.id);

          if (existing) {
            existing.evidence.push({
              source: 'social',
              type: 'tweet',
              text: post.text,
              timestamp: post.timestamp,
              weight: 0.6, // Social is less reliable
              sourceTier: 3,
            });
            existing.mentions++;
            if (!existing.detectedFrom.includes('social')) {
              existing.detectedFrom.push('social');
            }
          } else {
            narratives.push(this.createNarrative(narrativeType.id, [{
              source: 'social',
              type: 'tweet',
              text: post.text,
              timestamp: post.timestamp,
              weight: 0.6,
              sourceTier: 3,
            }]));
          }
        }
      }
    }

    return narratives;
  }

  /**
   * Check if narrative requires tier 1 source (sensitive narratives)
   */
  private requiresTier1Source(narrativeId: string): boolean {
    const sensitiveNarratives = [
      'external_legal',
      'external_contract_dispute',
      'external_personal',
    ];
    return sensitiveNarratives.includes(narrativeId);
  }

  /**
   * Create a detected narrative
   */
  private createNarrative(
    narrativeId: string,
    evidence: NarrativeEvidence[]
  ): DetectedNarrative {
    const narrative = NARRATIVE_CATALOG.find(n => n.id === narrativeId);

    if (!narrative) {
      throw new Error(`Narrative ${narrativeId} not found in catalog`);
    }

    return {
      narrativeId,
      narrative,
      detectedFrom: [evidence[0].source === 'schedule' || evidence[0].source === 'roster' || evidence[0].source === 'stats'
        ? 'schedule'
        : evidence[0].source === 'social'
        ? 'social'
        : 'news'],
      evidence,
      mentions: 1,
      prominence: evidence[0].weight,
      recency: this.daysSince(evidence[0].timestamp),
      rawImpact: narrative.baseImpact,
      adjustedImpact: narrative.baseImpact,
      confidence: narrative.confidence,
    };
  }

  /**
   * Merge duplicate narratives
   */
  private mergeNarratives(narratives: DetectedNarrative[]): DetectedNarrative[] {
    const merged: Map<string, DetectedNarrative> = new Map();

    for (const narrative of narratives) {
      const existing = merged.get(narrative.narrativeId);

      if (existing) {
        existing.evidence.push(...narrative.evidence);
        existing.mentions += narrative.mentions;
        existing.detectedFrom = [...new Set([
          ...existing.detectedFrom,
          ...narrative.detectedFrom,
        ])];
        existing.prominence = Math.min(
          existing.prominence + (narrative.prominence * 0.3),
          1.0
        );
      } else {
        merged.set(narrative.narrativeId, narrative);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Calculate final impacts with decay
   */
  private calculateImpacts(
    narratives: DetectedNarrative[],
    gameDate: Date
  ): DetectedNarrative[] {

    return narratives.map(narrative => {
      // Base impact
      let impact = narrative.narrative.baseImpact;

      // Adjust for prominence (more mentions = stronger)
      impact *= (0.7 + (0.3 * narrative.prominence));

      // Apply decay based on recency
      const decayFactor = Math.exp(-narrative.recency / narrative.narrative.decayRate);
      impact *= decayFactor;

      // Adjust confidence based on evidence quality
      let confidence = narrative.confidence;
      if (narrative.detectedFrom.length >= 3) {
        confidence = Math.min(confidence + 0.1, 0.98);
      }
      if (narrative.mentions >= 5) {
        confidence = Math.min(confidence + 0.05, 0.98);
      }

      // Boost confidence if detected from multiple source types
      const sourceTypes = new Set(narrative.detectedFrom);
      if (sourceTypes.size >= 2) {
        confidence = Math.min(confidence + 0.05, 0.98);
      }

      return {
        ...narrative,
        adjustedImpact: Math.max(-0.30, Math.min(0.30, impact)),
        confidence,
      };
    });
  }

  /**
   * Helper: Days since date
   */
  private daysSince(date: Date): number {
    return Math.floor(
      (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  /**
   * Helper: Get week number
   */
  private getWeekNumber(date: Date): number {
    // Simplified - would calculate based on season start
    const seasonStart = new Date(date.getFullYear(), 8, 1); // September 1
    const weeksSince = Math.floor((date.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
    return Math.max(1, Math.min(18, weeksSince + 1));
  }

  /**
   * Helper: Check division rivalry
   */
  private checkDivisionRivalry(teamId: string, opponentId: string): boolean {
    // Simplified - would check division database
    // For now, return false (would be implemented with actual division data)
    return false;
  }
}

