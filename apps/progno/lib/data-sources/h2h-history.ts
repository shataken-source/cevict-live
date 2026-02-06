/**
 * Head-to-Head History Fetcher
 * Builds and queries H2H history database
 * Hardened with validation, safe file I/O, logging, and graceful fallbacks
 */

import fs from 'fs';
import path from 'path';
import { H2HMeeting } from '../../app/weekly-analyzer';

interface H2HDatabase {
  [key: string]: H2HMeeting[];
}

export class H2HHistory {
  private dbPath: string;
  private database: H2HDatabase = {};

  constructor() {
    const prognoDir = path.join(process.cwd(), '.progno');
    try {
      if (!fs.existsSync(prognoDir)) {
        fs.mkdirSync(prognoDir, { recursive: true });
      }
      this.dbPath = path.join(prognoDir, 'h2h-history.json');
      this.loadDatabase();
    } catch (error) {
      console.error('[H2HHistory] Failed to initialize directory:', error);
      this.dbPath = '';
    }
  }

  private loadDatabase(): void {
    if (!this.dbPath) return;

    try {
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(data);
        // Convert date strings back to Date objects
        this.database = Object.fromEntries(
          Object.entries(parsed).map(([key, meetings]: [string, any]) => [
            key,
            meetings.map((m: any) => ({
              ...m,
              date: new Date(m.date)
            }))
          ])
        );
      }
    } catch (error) {
      console.error('[H2HHistory] Failed to load database:', error);
      this.database = {};
    }
  }

  private saveDatabase(): void {
    if (!this.dbPath) return;

    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.database, null, 2), 'utf8');
    } catch (error) {
      console.error('[H2HHistory] Failed to save database:', error);
    }
  }

  private getH2HKey(homeTeam: string, awayTeam: string, sport: string): string {
    if (!homeTeam || !awayTeam || !sport) return '';
    const teams = [homeTeam, awayTeam].sort().join('_');
    return `${sport.toUpperCase()}_${teams}`;
  }

  getHistory(homeTeam: string, awayTeam: string, sport: string, limit = 10): H2HMeeting[] {
    if (!homeTeam || !awayTeam || !sport) return [];

    const key = this.getH2HKey(homeTeam, awayTeam, sport);
    const meetings = this.database[key] || [];

    return meetings
      .filter(m => m.date instanceof Date && m.date <= new Date())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }

  addGame(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    date: Date,
    homeScore: number,
    awayScore: number,
    spread?: number,
    total?: number
  ): boolean {
    if (!homeTeam || !awayTeam || !sport || !date) {
      console.warn('[H2HHistory] Invalid game data - missing required fields');
      return false;
    }

    const key = this.getH2HKey(homeTeam, awayTeam, sport);
    if (!this.database[key]) this.database[key] = [];

    const winner = homeScore > awayScore ? homeTeam : awayTeam;
    const homeCovered = spread !== undefined ? (homeScore + spread) > awayScore : false;
    const overHit = total !== undefined ? (homeScore + awayScore) > total : false;

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

    // Avoid duplicates
    const exists = this.database[key].some(m =>
      m.date.getTime() === date.getTime() &&
      m.homeTeam === homeTeam &&
      m.awayTeam === awayTeam
    );

    if (!exists) {
      this.database[key].push(meeting);
      this.saveDatabase();
      return true;
    }
    return false;
  }

  getSummary(homeTeam: string, awayTeam: string, sport: string) {
    const meetings = this.getHistory(homeTeam, awayTeam, sport, 20);
    if (meetings.length === 0) return null;

    const homeWins = meetings.filter(m => m.winner === homeTeam).length;
    const awayWins = meetings.filter(m => m.winner === awayTeam).length;

    const homeCovered = meetings.filter(m => m.homeCovered).length;
    const awayCovered = meetings.filter(m => m.spread !== undefined && !m.homeCovered).length;

    const totals = meetings
      .filter(m => m.total !== undefined)
      .map(m => m.homeScore + m.awayScore);

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

  async buildFromOddsAPI(apiKey: string, sport: string, daysBack = 365): Promise<number> {
    if (!apiKey || !sport) return 0;

    const sportKey = this.mapSportToOddsAPI(sport);
    if (!sportKey) return 0;

    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=${daysBack}&apiKey=${apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error(`[H2HHistory] Odds API failed: ${res.status}`);
        return 0;
      }

      const data = await res.json();
      let added = 0;

      for (const game of data || []) {
        if (!game.completed || !game.scores) continue;

        const homeTeam = game.home_team;
        const awayTeam = game.away_team;

        const homeScoreEntry = game.scores.find((s: any) =>
          this.normalizeName(s.name) === this.normalizeName(homeTeam)
        );
        const awayScoreEntry = game.scores.find((s: any) =>
          this.normalizeName(s.name) === this.normalizeName(awayTeam)
        );

        const homeScore = homeScoreEntry?.score || 0;
        const awayScore = awayScoreEntry?.score || 0;

        if (homeScore === 0 && awayScore === 0) continue;

        const success = this.addGame(
          homeTeam,
          awayTeam,
          sport,
          new Date(game.commence_time),
          Number(homeScore),
          Number(awayScore)
        );

        if (success) added++;
      }

      return added;
    } catch (error: any) {
      console.error('[H2HHistory] Build from Odds API error:', error.message);
      return 0;
    }
  }

  private mapSportToOddsAPI(sport: string): string | null {
    const map: Record<string, string> = {
      NFL: 'americanfootball_nfl',
      NBA: 'basketball_nba',
      MLB: 'baseball_mlb',
      NHL: 'icehockey_nhl',
      NCAAF: 'americanfootball_ncaaf',
      NCAAB: 'basketball_ncaab'
    };
    return map[sport.toUpperCase()] || null;
  }

  private normalizeName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
}

export const h2hHistory = new H2HHistory();