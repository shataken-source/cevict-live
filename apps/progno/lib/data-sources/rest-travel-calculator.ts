/**
 * Rest & Travel Calculator
 * Calculates rest days, back-to-backs, and travel distance
 */

interface TeamLocation {
  city: string;
  state: string;
  timeZone: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

// Team location database (simplified - would be more comprehensive)
const TEAM_LOCATIONS: Record<string, TeamLocation> = {
  // NFL Teams
  'Kansas City Chiefs': { city: 'Kansas City', state: 'MO', timeZone: 'America/Chicago', coordinates: { lat: 39.0489, lon: -94.4839 } },
  'Buffalo Bills': { city: 'Buffalo', state: 'NY', timeZone: 'America/New_York', coordinates: { lat: 42.7738, lon: -78.7869 } },
  // Add more teams as needed...
  
  // NBA Teams
  'Los Angeles Lakers': { city: 'Los Angeles', state: 'CA', timeZone: 'America/Los_Angeles', coordinates: { lat: 34.0430, lon: -118.2673 } },
  'Boston Celtics': { city: 'Boston', state: 'MA', timeZone: 'America/New_York', coordinates: { lat: 42.3662, lon: -71.0621 } },
  // Add more teams as needed...
};

interface RestData {
  homeDaysRest: number;
  awayDaysRest: number;
  homeBackToBack: boolean;
  awayBackToBack: boolean;
  homeTravelDistance?: number;
  awayTravelDistance?: number;
  homeTimeZoneChange?: number;
  awayTimeZoneChange?: number;
}

interface GameSchedule {
  team: string;
  date: Date;
  isHome: boolean;
  opponent?: string;
}

class RestTravelCalculator {
  /**
   * Calculate rest and travel data for a game
   */
  calculateRest(
    homeTeam: string,
    awayTeam: string,
    gameDate: Date,
    homeTeamSchedule: GameSchedule[],
    awayTeamSchedule: GameSchedule[]
  ): RestData {
    const homeLastGame = this.findLastGame(homeTeamSchedule, gameDate);
    const awayLastGame = this.findLastGame(awayTeamSchedule, gameDate);

    const homeDaysRest = homeLastGame
      ? this.daysBetween(homeLastGame.date, gameDate)
      : 3; // Default if no previous game found
    const awayDaysRest = awayLastGame
      ? this.daysBetween(awayLastGame.date, gameDate)
      : 3;

    const homeBackToBack = homeDaysRest === 0 || homeDaysRest === 1;
    const awayBackToBack = awayDaysRest === 0 || awayDaysRest === 1;

    // Calculate travel
    const homeTravel = this.calculateTravel(homeTeam, homeLastGame, gameDate, true);
    const awayTravel = this.calculateTravel(awayTeam, awayLastGame, gameDate, false);

    return {
      homeDaysRest,
      awayDaysRest,
      homeBackToBack,
      awayBackToBack,
      homeTravelDistance: homeTravel.distance,
      awayTravelDistance: awayTravel.distance,
      homeTimeZoneChange: homeTravel.timeZoneChange,
      awayTimeZoneChange: awayTravel.timeZoneChange
    };
  }

  /**
   * Find last game before given date
   */
  private findLastGame(schedule: GameSchedule[], beforeDate: Date): GameSchedule | null {
    const before = schedule
      .filter(g => g.date < beforeDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return before.length > 0 ? before[0] : null;
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
  }

  /**
   * Calculate travel distance and time zone change
   */
  private calculateTravel(
    team: string,
    lastGame: GameSchedule | null,
    currentGameDate: Date,
    isHome: boolean
  ): { distance?: number; timeZoneChange?: number } {
    if (!lastGame) return {};

    const teamLocation = TEAM_LOCATIONS[team];
    if (!teamLocation) return {};

    // If last game was away, calculate travel from that location
    if (!lastGame.isHome && lastGame.opponent) {
      const opponentLocation = TEAM_LOCATIONS[lastGame.opponent];
      if (opponentLocation && teamLocation.coordinates && opponentLocation.coordinates) {
        const distance = this.haversineDistance(
          teamLocation.coordinates,
          opponentLocation.coordinates
        );
        const timeZoneChange = this.getTimeZoneChange(
          opponentLocation.timeZone,
          teamLocation.timeZone
        );
        return { distance, timeZoneChange };
      }
    }

    // If current game is away, calculate travel to opponent
    if (!isHome) {
      // Would need opponent location - simplified for now
      return {};
    }

    return {};
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private haversineDistance(
    coord1: { lat: number; lon: number },
    coord2: { lat: number; lon: number }
  ): number {
    const R = 3959; // Earth radius in miles
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lon - coord1.lon);
    const lat1 = this.toRad(coord1.lat);
    const lat2 = this.toRad(coord2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) *
              Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get time zone change (simplified - would use proper timezone library)
   */
  private getTimeZoneChange(tz1: string, tz2: string): number {
    // Simplified - would use proper timezone library like date-fns-tz
    const tzOffsets: Record<string, number> = {
      'America/New_York': -5,
      'America/Chicago': -6,
      'America/Denver': -7,
      'America/Los_Angeles': -8,
      'America/Phoenix': -7
    };

    const offset1 = tzOffsets[tz1] || 0;
    const offset2 = tzOffsets[tz2] || 0;
    return offset2 - offset1;
  }
}

export const restTravelCalculator = new RestTravelCalculator();

