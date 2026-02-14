// lib/data-sources/team-stats-fetcher.ts
/**
 * MOCK ONLY — Do not use for production picks (Gemini audit).
 * Live picks use estimateTeamStatsFromOdds (odds-derived). This fetcher is for dev/game-enricher;
 * replace with real API (e.g. API-Sports) or fail when real data is required.
 */

const teamStatsFetcher = {
  async getTeamStats(teamName: string, sport: string = 'nfl') {
    console.log(`[TeamStats] Mock stats for ${teamName} (${sport})`);

    const lowerSport = sport.toLowerCase();

    if (lowerSport === 'nba' || lowerSport === 'ncaab' || lowerSport === 'cbb') {
      // Realistic basketball stats with variation by team strength
      const isElite = ['Duke Blue Devils', 'Kansas Jayhawks', 'UConn Huskies', 'Gonzaga Bulldogs', 'North Carolina Tar Heels', 'Kentucky Wildcats'].includes(teamName);
      const isGood = !isElite && Math.random() > 0.3;

      const basePPG = isElite ? 85 : isGood ? 80 : 75;
      const oppPPG = isElite ? 68 : isGood ? 73 : 78;

      return {
        wins: isElite ? 21 : isGood ? 17 : 13,
        losses: isElite ? 1 : isGood ? 5 : 9,
        pointsPerGame: basePPG + Math.random() * 6,
        pointsAllowedPerGame: oppPPG + Math.random() * 5,
        fieldGoalPct: 47.5 + Math.random() * 4,
        threePointPct: 36.5 + Math.random() * 5,
        freeThrowPct: 76 + Math.random() * 8,
        reboundsPerGame: 41 + Math.random() * 6,
        assistsPerGame: 16 + Math.random() * 5,
        turnoversPerGame: 11 + Math.random() * 3,
        last5Games: isElite ? [1, 1, 1, 1, 0] : [1, 0, 1, 1, 0],
        homeRecord: isElite ? '12-0' : '9-2',
        awayRecord: isElite ? '9-1' : '8-3',
        strengthOfSchedule: isElite ? 0.62 : 0.55,
        injuryImpact: Math.random() * 0.1,
      };
    }

    // NFL fallback
    return {
      wins: 10,
      losses: 7,
      pointsFor: 380,
      pointsAgainst: 360,
      yardsPerGame: 355,
      passingYards: 240,
      rushingYards: 115,
      last5Games: [1, 0, 1, 1, 0],
      homeRecord: '6-2',
      awayRecord: '4-5',
      strengthOfSchedule: 0.52,
      injuryImpact: 0.07,
    };
  },

  async getTeamStatsBatch(teamNames: string[], sport: string = 'nfl') {
    return Promise.all(teamNames.map(name => this.getTeamStats(name, sport)));
  }
};

export default teamStatsFetcher;