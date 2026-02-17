/**
 * Injury Impact Analyzer Service
 * Analyzes injury reports and adjusts prediction confidence accordingly
 * Uses CevictScraper (Playwright) instead of ScrapingBee
 */

import { CevictScraperService } from './cevict-scraper-service';

export interface PlayerInjury {
  player: string;
  position: string;
  status: 'out' | 'doubtful' | 'questionable' | 'probable';
  injuryType: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
}

export interface TeamInjuries {
  team: string;
  sport: string;
  injuries: PlayerInjury[];
  overallImpact: number; // 0-100
}

export interface InjuryAdjustment {
  confidenceAdjustment: number;
  homeTeamAdjustment: number;
  awayTeamAdjustment: number;
  reasoning: string[];
}

// Position impact multipliers by sport
const POSITION_IMPACT: Record<string, Record<string, number>> = {
  nfl: {
    QB: 25,
    RB: 12,
    WR: 10,
    TE: 8,
    OT: 10,
    OG: 8,
    C: 8,
    DE: 10,
    DT: 8,
    LB: 10,
    CB: 10,
    S: 8,
    K: 5,
    P: 3,
  },
  nba: {
    PG: 18,
    SG: 15,
    SF: 15,
    PF: 12,
    C: 12,
  },
  nhl: {
    G: 20,
    D: 12,
    C: 10,
    LW: 10,
    RW: 10,
  },
  mlb: {
    SP: 15,
    RP: 8,
    C: 10,
    '1B': 8,
    '2B': 10,
    '3B': 10,
    SS: 12,
    LF: 8,
    CF: 10,
    RF: 8,
    DH: 8,
  },
};

const STATUS_MULTIPLIERS: Record<string, number> = {
  out: 1.0,
  doubtful: 0.75,
  questionable: 0.4,
  probable: 0.15,
};

export class InjuryImpactAnalyzer {
  private scraper: CevictScraperService;

  constructor(cevictScraperUrl?: string) {
    // Use CevictScraper (localhost:3009) instead of ScrapingBee
    this.scraper = new CevictScraperService(cevictScraperUrl || 'http://localhost:3009');
  }

  /**
   * Fetch and analyze injuries for both teams in a game
   */
  async analyzeGameInjuries(
    sport: string,
    homeTeam: string,
    awayTeam: string
  ): Promise<InjuryAdjustment> {
    const [homeInjuries, awayInjuries] = await Promise.all([
      this.fetchTeamInjuries(sport, homeTeam),
      this.fetchTeamInjuries(sport, awayTeam),
    ]);

    return this.calculateAdjustments(homeInjuries, awayInjuries);
  }

  /**
   * Fetch injury report for a specific team
   */
  private async fetchTeamInjuries(sport: string, team: string): Promise<TeamInjuries> {
    const scrapedInjuries = await this.scraper.scrapeInjuryReports(sport, team);

    if (!scrapedInjuries || scrapedInjuries.length === 0) {
      return {
        team,
        sport,
        injuries: [],
        overallImpact: 0,
      };
    }

    const injuries: PlayerInjury[] = scrapedInjuries.map((inj: any) => ({
      player: inj.player || inj.name || 'Unknown',
      position: inj.position || 'Unknown',
      status: this.parseStatus(inj.status || inj.gameStatus || 'Unknown'),
      injuryType: inj.injury || inj.injuryType || 'Unknown',
      impact: this.assessImpact(inj),
    }));

    const overallImpact = this.calculateTeamImpact(injuries, sport);

    return {
      team,
      sport,
      injuries,
      overallImpact,
    };
  }

  /**
   * Calculate confidence adjustments based on injury comparison
   */
  private calculateAdjustments(
    homeInjuries: TeamInjuries,
    awayInjuries: TeamInjuries
  ): InjuryAdjustment {
    const reasoning: string[] = [];

    // Calculate impact differentials
    const homeImpact = homeInjuries.overallImpact;
    const awayImpact = awayInjuries.overallImpact;
    const impactDifferential = homeImpact - awayImpact;

    // Critical injuries get special attention
    const homeCritical = homeInjuries.injuries.filter(i => i.impact === 'critical' && i.status === 'out');
    const awayCritical = awayInjuries.injuries.filter(i => i.impact === 'critical' && i.status === 'out');

    // Build reasoning
    if (homeCritical.length > 0) {
      reasoning.push(`${homeInjuries.team}: ${homeCritical.length} critical player(s) out (${homeCritical.map(p => p.player).join(', ')})`);
    }
    if (awayCritical.length > 0) {
      reasoning.push(`${awayInjuries.team}: ${awayCritical.length} critical player(s) out (${awayCritical.map(p => p.player).join(', ')})`);
    }

    // Confidence adjustment based on differential
    // If home team has more injuries, reduce confidence in home win
    let confidenceAdjustment = 0;
    if (Math.abs(impactDifferential) > 10) {
      confidenceAdjustment = impactDifferential > 0 ? -5 : 5;
      reasoning.push(`Injury impact differential: ${Math.abs(impactDifferential).toFixed(1)} points favors ${impactDifferential > 0 ? awayInjuries.team : homeInjuries.team}`);
    }

    return {
      confidenceAdjustment,
      homeTeamAdjustment: -homeImpact / 4, // Reduce home win probability
      awayTeamAdjustment: -awayImpact / 4, // Reduce away win probability if they have injuries
      reasoning,
    };
  }

  /**
   * Parse injury status from various formats
   */
  private parseStatus(status: string): PlayerInjury['status'] {
    const s = status.toLowerCase();
    if (s.includes('out')) return 'out';
    if (s.includes('doubt')) return 'doubtful';
    if (s.includes('question')) return 'questionable';
    if (s.includes('probable') || s.includes('likely')) return 'probable';
    return 'questionable';
  }

  /**
   * Assess impact level of an injury
   */
  private assessImpact(injury: any): PlayerInjury['impact'] {
    const position = injury.position || '';
    const status = this.parseStatus(injury.status || '');

    // Critical positions: QB in NFL, Starting pitcher in MLB, Goalie in NHL
    const criticalPositions = ['QB', 'SP', 'G', 'C', 'PG'];

    if (criticalPositions.includes(position) && status === 'out') {
      return 'critical';
    }
    if (criticalPositions.includes(position) && status === 'doubtful') {
      return 'high';
    }
    if (status === 'out') {
      return 'high';
    }
    if (status === 'doubtful') {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate total team impact score (0-100)
   */
  private calculateTeamImpact(injuries: PlayerInjury[], sport: string): number {
    const positionWeights = POSITION_IMPACT[sport.toLowerCase()] || {};

    return injuries.reduce((total, injury) => {
      const baseWeight = positionWeights[injury.position] || 5;
      const statusMultiplier = STATUS_MULTIPLIERS[injury.status] || 0;
      return total + baseWeight * statusMultiplier;
    }, 0);
  }

  /**
   * Get high-risk games due to injuries
   */
  async getHighRiskInjuryGames(games: Array<{
    sport: string;
    homeTeam: string;
    awayTeam: string;
  }>): Promise<Array<{
    game: any;
    riskLevel: 'high' | 'medium' | 'low';
    homeImpact: number;
    awayImpact: number;
    criticalPlayers: string[];
  }>> {
    const highRiskGames = [];

    for (const game of games) {
      const adjustment = await this.analyzeGameInjuries(
        game.sport,
        game.homeTeam,
        game.awayTeam
      );

      // Determine risk level based on impact differential
      const totalImpact = Math.abs(adjustment.homeTeamAdjustment) + Math.abs(adjustment.awayTeamAdjustment);
      let riskLevel: 'high' | 'medium' | 'low' = 'low';

      if (totalImpact > 15) {
        riskLevel = 'high';
      } else if (totalImpact > 8) {
        riskLevel = 'medium';
      }

      if (riskLevel !== 'low') {
        // Extract critical players from reasoning
        const criticalPlayers = adjustment.reasoning
          .filter(r => r.includes('critical'))
          .flatMap(r => {
            const match = r.match(/\(([^)]+)\)/);
            return match ? match[1].split(', ') : [];
          });

        highRiskGames.push({
          game,
          riskLevel,
          homeImpact: Math.abs(adjustment.homeTeamAdjustment),
          awayImpact: Math.abs(adjustment.awayTeamAdjustment),
          criticalPlayers,
        });
      }
    }

    return highRiskGames;
  }

  /**
   * Quick assessment: Should we avoid this game due to injuries?
   */
  shouldAvoidGame(adjustment: InjuryAdjustment, minConfidence: number = 60): boolean {
    // If critical players are out and our confidence would drop below threshold
    const hasCriticalInjuries = adjustment.reasoning.some(r => r.includes('critical'));
    const highImpactDifferential = Math.abs(adjustment.confidenceAdjustment) >= 5;

    return hasCriticalInjuries && highImpactDifferential && minConfidence < 65;
  }
}

export default InjuryImpactAnalyzer;
