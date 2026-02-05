/**
 * Head-to-Head History Fetcher
 * Builds and queries H2H history database
 */

import { H2HMeeting } from '../../app/weekly-analyzer';
import fs from 'fs';
import path from 'path';

interface H2HDatabase {
  [key: string]: H2HMeeting[];
}

class H2HHistory {
  private dbPath: string;
  private database: H2HDatabase = {};

  constructor() {
    const prognoDir = path.join(process.cwd(), '.progno');
    if (!fs.existsSync(prognoDir)) {
      fs.mkdirSync(prognoDir, { recursive: true });
    }
    this.dbPath = path.join(prognoDir, 'h2h-history.json');
    this.loadDatabase();
  }

  /**
   * Load H2H database from disk
   */
  private loadDatabase(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        this.database = JSON.parse(data);
      }
    } catch (error) {
      console.error('[H2H] Failed to load database:', error);
      this.database = {};
    }
  }

  /**
   * Save H2H database to disk
   */
  private saveDatabase(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.database, null, 2), 'utf8');
    } catch (error) {
      console.error('[H2H] Failed to save database:', error);
    }
  }

  /**
   * Get H2H key for two teams
   */
  private getH2HKey(homeTeam: string, awayTeam: string, sport: string): string {
    const teams = [homeTeam, awayTeam].sort().join('_');
    return `${sport}_${teams}`;
  }

  /**
   * Get H2H history between two teams
   */
  getHistory(homeTeam: string, awayTeam: string, sport: string, limit: number = 10): H2HMeeting[] {
    const key = this.getH2HKey(homeTeam, awayTeam, sport);
    const meetings = this.database[key] || [];
    
    // Filter to recent meetings and sort by date
    return meetings
      .filter(m => {
        const meetingDate = new Date(m.date);
        const now = new Date();
        return meetingDate <= now; // Only past games
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  /**
   * Add a completed game to H2H database
   */
  addGame(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    date: Date,
    homeScore: number,
    awayScore: number,
    spread?: number,
    total?: number
  ): void {
    const key = this.getH2HKey(homeTeam, awayTeam, sport);
    
    if (!this.database[key]) {
      this.database[key] = [];
    }

    const winner = homeScore > awayScore ? homeTeam : awayTeam;
    const homeCovered = spread !== undefined 
      ? (homeScore + spread) > awayScore 
      : false;
    const overHit = total !== undefined 
      ? (homeScore + awayScore) > total 
      : false;

    const meeting: H2HMeeting = {
      date,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      winner,
      spread,
      total,
      homeCovered,
      overHit
    };

    // Check if game already exists
    const exists = this.database[key].some(m => 
      m.date.getTime() === date.getTime() &&
      m.homeTeam === homeTeam &&
      m.awayTeam === awayTeam
    );

    if (!exists) {
      this.database[key].push(meeting);
      this.saveDatabase();
    }
  }

  /**
   * Get H2H summary statistics
   */
  getSummary(homeTeam: string, awayTeam: string, sport: string) {
    const meetings = this.getHistory(homeTeam, awayTeam, sport, 20);
    
    if (meetings.length === 0) {
      return null;
    }

    const homeWins = meetings.filter(m => m.winner === homeTeam).length;
    const awayWins = meetings.filter(m => m.winner === awayTeam).length;
    
    const homeCovered = meetings.filter(m => m.homeCovered).length;
    const awayCovered = meetings.filter(m => !m.homeCovered && m.spread !== undefined).length;
    
    const totals = meetings.filter(m => m.total !== undefined).map(m => m.homeScore + m.awayScore);
    const averageTotal = totals.length > 0
      ? totals.reduce((sum, t) => sum + t, 0) / totals.length
      : 0;

    return {
      recentMeetings: meetings.slice(0, 10),
      homeTeamWins: homeWins,
      awayTeamWins: awayWins,
      homeTeamATS: homeCovered,
      awayTeamATS: awayCovered,
      averageTotal: Math.round(averageTotal * 10) / 10
    };
  }

  /**
   * Build H2H database from The Odds API historical scores
   */
  async buildFromOddsAPI(apiKey: string, sport: string, daysBack: number = 365): Promise<number> {
    const sportKey = this.mapSportToOddsAPI(sport);
    if (!sportKey) return 0;

    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=${daysBack}&apiKey=${apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error(`[H2H] Odds API failed: ${res.status}`);
        return 0;
      }

      const data = await res.json();
      let added = 0;

      for (const game of data || []) {
        if (!game.completed || !game.scores) continue;

        const homeTeam = game.home_team;
        const awayTeam = game.away_team;
        const homeScore = game.scores.find((s: any) => 
          this.normalizeName(s.name) === this.normalizeName(homeTeam)
        )?.score || 0;
        const awayScore = game.scores.find((s: any) => 
          this.normalizeName(s.name) === this.normalizeName(awayTeam)
        )?.score || 0;

        if (homeScore === 0 && awayScore === 0) continue;

        this.addGame(
          homeTeam,
          awayTeam,
          sport,
          new Date(game.commence_time),
          Number(homeScore),
          Number(awayScore)
        );
        added++;
      }

      return added;
    } catch (error) {
      console.error('[H2H] Build from Odds API error:', error);
      return 0;
    }
  }

  /**
   * Map sport to The Odds API key
   */
  private mapSportToOddsAPI(sport: string): string | null {
    const map: Record<string, string> = {
      'NFL': 'americanfootball_nfl',
      'NBA': 'basketball_nba',
      'MLB': 'baseball_mlb',
      'NHL': 'icehockey_nhl',
      'NCAAF': 'americanfootball_ncaaf',
      'NCAAB': 'basketball_ncaab'
    };
    return map[sport] || null;
  }

  /**
   * Normalize team name
   */
  private normalizeName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  }
}

export const h2hHistory = new H2HHistory();

