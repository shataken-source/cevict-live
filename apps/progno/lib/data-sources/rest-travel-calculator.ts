/**
 * Rest & Travel Calculator
 * Calculates rest days, back-to-backs, travel distance, and time zone changes
 * Hardened with validation, defaults, logging, and robust error handling
 */

interface TeamLocation {
  city: string;
  state: string;
  timeZone: string;
  coordinates?: { lat: number; lon: number };
}

// Expanded team location database
const TEAM_LOCATIONS: Record<string, TeamLocation> = {
  // NFL
  'Kansas City Chiefs': { city: 'Kansas City', state: 'MO', timeZone: 'America/Chicago', coordinates: { lat: 39.0489, lon: -94.4839 } },
  'Buffalo Bills': { city: 'Buffalo', state: 'NY', timeZone: 'America/New_York', coordinates: { lat: 42.7738, lon: -78.7869 } },
  'Dallas Cowboys': { city: 'Arlington', state: 'TX', timeZone: 'America/Chicago', coordinates: { lat: 32.7473, lon: -97.0945 } },
  'New York Giants': { city: 'East Rutherford', state: 'NJ', timeZone: 'America/New_York', coordinates: { lat: 40.8135, lon: -74.0745 } },
  'Green Bay Packers': { city: 'Green Bay', state: 'WI', timeZone: 'America/Chicago', coordinates: { lat: 44.5013, lon: -88.0622 } },
  // NBA
  'Los Angeles Lakers': { city: 'Los Angeles', state: 'CA', timeZone: 'America/Los_Angeles', coordinates: { lat: 34.0430, lon: -118.2673 } },
  'Boston Celtics': { city: 'Boston', state: 'MA', timeZone: 'America/New_York', coordinates: { lat: 42.3662, lon: -71.0621 } },
  'Golden State Warriors': { city: 'San Francisco', state: 'CA', timeZone: 'America/Los_Angeles', coordinates: { lat: 37.7680, lon: -122.3877 } },
  // Add more teams as needed
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

export class RestTravelCalculator {
  calculateRest(
    homeTeam: string,
    awayTeam: string,
    gameDate: Date,
    homeTeamSchedule: GameSchedule[] = [],
    awayTeamSchedule: GameSchedule[] = []
  ): RestData {
    if (!homeTeam || !awayTeam || !gameDate) {
      console.warn('[RestTravel] Invalid input - missing required fields');
      return this.getDefaultRestData();
    }

    const homeLastGame = this.findLastGame(homeTeamSchedule, gameDate);
    const awayLastGame = this.findLastGame(awayTeamSchedule, gameDate);

    const homeDaysRest = homeLastGame ? this.daysBetween(homeLastGame.date, gameDate) : 3;
    const awayDaysRest = awayLastGame ? this.daysBetween(awayLastGame.date, gameDate) : 3;

    const homeBackToBack = homeDaysRest <= 1;
    const awayBackToBack = awayDaysRest <= 1;

    const homeTravel = this.calculateTravel(homeTeam, homeLastGame, gameDate, true);
    const awayTravel = this.calculateTravel(awayTeam, awayLastGame, gameDate, false);

    return {
      homeDaysRest: Math.max(0, homeDaysRest),
      awayDaysRest: Math.max(0, awayDaysRest),
      homeBackToBack,
      awayBackToBack,
      homeTravelDistance: homeTravel.distance,
      awayTravelDistance: awayTravel.distance,
      homeTimeZoneChange: homeTravel.timeZoneChange,
      awayTimeZoneChange: awayTravel.timeZoneChange,
    };
  }

  private findLastGame(schedule: GameSchedule[], beforeDate: Date): GameSchedule | null {
    if (!schedule || schedule.length === 0) return null;

    return schedule
      .filter(g => g.date < beforeDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0] || null;
  }

  private daysBetween(date1: Date, date2: Date): number {
    if (!date1 || !date2) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
  }

  private calculateTravel(
    team: string,
    lastGame: GameSchedule | null,
    currentGameDate: Date,
    isHome: boolean
  ): { distance?: number; timeZoneChange?: number } {
    const teamLocation = TEAM_LOCATIONS[team];
    if (!teamLocation) {
      console.warn(`[RestTravel] Unknown location for ${team}`);
      return {};
    }

    if (lastGame && !lastGame.isHome && lastGame.opponent) {
      const opponentLocation = TEAM_LOCATIONS[lastGame.opponent];
      if (opponentLocation?.coordinates && teamLocation.coordinates) {
        const distance = this.haversineDistance(teamLocation.coordinates, opponentLocation.coordinates);
        const timeZoneChange = this.getTimeZoneChange(opponentLocation.timeZone, teamLocation.timeZone);
        return { distance, timeZoneChange };
      }
    }

    return {};
  }

  private haversineDistance(coord1: { lat: number; lon: number }, coord2: { lat: number; lon: number }): number {
    const R = 3959; // miles
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

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getTimeZoneChange(tz1: string, tz2: string): number {
    const offsets: Record<string, number> = {
      'America/New_York': -5,
      'America/Chicago': -6,
      'America/Denver': -7,
      'America/Los_Angeles': -8,
      'America/Phoenix': -7,
      'America/Anchorage': -9,
      'Pacific/Honolulu': -10,
    };
    const offset1 = offsets[tz1] ?? 0;
    const offset2 = offsets[tz2] ?? 0;
    return offset2 - offset1;
  }

  private getDefaultRestData(): RestData {
    return {
      homeDaysRest: 3,
      awayDaysRest: 3,
      homeBackToBack: false,
      awayBackToBack: false,
    };
  }
}

export const restTravelCalculator = new RestTravelCalculator();