/**
 * Stadium and Altitude Impact Service
 * Analyzes stadium effects including altitude, field conditions, and home field advantage
 */

export interface StadiumInfo {
  name: string;
  city: string;
  state: string;
  altitude: number; // feet above sea level
  capacity: number;
  surface: 'grass' | 'turf' | 'hybrid';
  dome: boolean;
  climate: 'hot' | 'cold' | 'mild' | 'dry' | 'humid';
}

export interface AltitudeImpact {
  homeAdvantageBoost: number; // Additional points to home team advantage
  oxygenImpact: 'severe' | 'moderate' | 'minimal' | 'none';
  visitingTeamDisadvantage: number; // 0-10 scale
  adjustmentReasons: string[];
}

export class StadiumImpactService {
  private stadiumDatabase: Map<string, StadiumInfo> = new Map([
    // NFL
    ['Broncos', { name: 'Empower Field', city: 'Denver', state: 'CO', altitude: 5280, capacity: 76125, surface: 'grass', dome: false, climate: 'dry' }],
    ['Cardinals', { name: 'State Farm Stadium', city: 'Glendale', state: 'AZ', altitude: 1080, capacity: 63400, surface: 'grass', dome: true, climate: 'hot' }],
    ['Falcons', { name: 'Mercedes-Benz Stadium', city: 'Atlanta', state: 'GA', altitude: 1050, capacity: 71000, surface: 'turf', dome: true, climate: 'mild' }],
    ['Ravens', { name: 'M&T Bank Stadium', city: 'Baltimore', state: 'MD', altitude: 20, capacity: 71008, surface: 'grass', dome: false, climate: 'mild' }],
    ['Bills', { name: 'Highmark Stadium', city: 'Orchard Park', state: 'NY', altitude: 800, capacity: 71608, surface: 'turf', dome: false, climate: 'cold' }],
    ['Panthers', { name: 'Bank of America Stadium', city: 'Charlotte', state: 'NC', altitude: 750, capacity: 74867, surface: 'turf', dome: false, climate: 'mild' }],
    ['Bears', { name: 'Soldier Field', city: 'Chicago', state: 'IL', altitude: 590, capacity: 61500, surface: 'grass', dome: false, climate: 'cold' }],
    ['Bengals', { name: 'Paycor Stadium', city: 'Cincinnati', state: 'OH', altitude: 480, capacity: 65515, surface: 'turf', dome: false, climate: 'mild' }],
    ['Browns', { name: 'Cleveland Browns Stadium', city: 'Cleveland', state: 'OH', altitude: 580, capacity: 67431, surface: 'grass', dome: false, climate: 'cold' }],
    ['Cowboys', { name: 'AT&T Stadium', city: 'Arlington', state: 'TX', altitude: 570, capacity: 80000, surface: 'turf', dome: true, climate: 'hot' }],
    ['Lions', { name: 'Ford Field', city: 'Detroit', state: 'MI', altitude: 600, capacity: 65000, surface: 'turf', dome: true, climate: 'cold' }],
    ['Packers', { name: 'Lambeau Field', city: 'Green Bay', state: 'WI', altitude: 640, capacity: 81441, surface: 'hybrid', dome: false, climate: 'cold' }],
    ['Texans', { name: 'NRG Stadium', city: 'Houston', state: 'TX', altitude: 50, capacity: 72220, surface: 'turf', dome: true, climate: 'hot' }],
    ['Colts', { name: 'Lucas Oil Stadium', city: 'Indianapolis', state: 'IN', altitude: 710, capacity: 67000, surface: 'turf', dome: true, climate: 'mild' }],
    ['Jaguars', { name: 'TIAA Bank Field', city: 'Jacksonville', state: 'FL', altitude: 20, capacity: 67814, surface: 'grass', dome: false, climate: 'hot' }],
    ['Chiefs', { name: 'Arrowhead Stadium', city: 'Kansas City', state: 'MO', altitude: 750, capacity: 76416, surface: 'grass', dome: false, climate: 'mild' }],
    ['Raiders', { name: 'Allegiant Stadium', city: 'Las Vegas', state: 'NV', altitude: 2000, capacity: 65000, surface: 'grass', dome: true, climate: 'dry' }],
    ['Chargers', { name: 'SoFi Stadium', city: 'Inglewood', state: 'CA', altitude: 100, capacity: 70000, surface: 'turf', dome: true, climate: 'mild' }],
    ['Rams', { name: 'SoFi Stadium', city: 'Inglewood', state: 'CA', altitude: 100, capacity: 70000, surface: 'turf', dome: true, climate: 'mild' }],
    ['Dolphins', { name: 'Hard Rock Stadium', city: 'Miami', state: 'FL', altitude: 10, capacity: 65326, surface: 'grass', dome: false, climate: 'hot' }],
    ['Vikings', { name: 'U.S. Bank Stadium', city: 'Minneapolis', state: 'MN', altitude: 800, capacity: 66455, surface: 'turf', dome: true, climate: 'cold' }],
    ['Patriots', { name: 'Gillette Stadium', city: 'Foxborough', state: 'MA', altitude: 300, capacity: 65878, surface: 'turf', dome: false, climate: 'cold' }],
    ['Saints', { name: 'Caesars Superdome', city: 'New Orleans', state: 'LA', altitude: 5, capacity: 73128, surface: 'turf', dome: true, climate: 'hot' }],
    ['Giants', { name: 'MetLife Stadium', city: 'East Rutherford', state: 'NJ', altitude: 10, capacity: 82500, surface: 'turf', dome: false, climate: 'mild' }],
    ['Jets', { name: 'MetLife Stadium', city: 'East Rutherford', state: 'NJ', altitude: 10, capacity: 82500, surface: 'turf', dome: false, climate: 'mild' }],
    ['Eagles', { name: 'Lincoln Financial Field', city: 'Philadelphia', state: 'PA', altitude: 40, capacity: 69796, surface: 'grass', dome: false, climate: 'mild' }],
    ['Steelers', { name: 'Acrisure Stadium', city: 'Pittsburgh', state: 'PA', altitude: 750, capacity: 68400, surface: 'grass', dome: false, climate: 'mild' }],
    ['49ers', { name: 'Levi\'s Stadium', city: 'Santa Clara', state: 'CA', altitude: 16, capacity: 68500, surface: 'grass', dome: false, climate: 'mild' }],
    ['Seahawks', { name: 'Lumen Field', city: 'Seattle', state: 'WA', altitude: 16, capacity: 72000, surface: 'turf', dome: false, climate: 'mild' }],
    ['Buccaneers', { name: 'Raymond James Stadium', city: 'Tampa', state: 'FL', altitude: 32, capacity: 65890, surface: 'grass', dome: false, climate: 'hot' }],
    ['Titans', { name: 'Nissan Stadium', city: 'Nashville', state: 'TN', altitude: 400, capacity: 69143, surface: 'grass', dome: false, climate: 'mild' }],
    ['Commanders', { name: 'FedEx Field', city: 'Landover', state: 'MD', altitude: 50, capacity: 67617, surface: 'grass', dome: false, climate: 'mild' }],
    ['Bengals', { name: 'Paycor Stadium', city: 'Cincinnati', state: 'OH', altitude: 480, capacity: 65515, surface: 'turf', dome: false, climate: 'mild' }],
  ]);

  /**
   * Get stadium info by team name
   */
  getStadiumInfo(teamName: string): StadiumInfo | null {
    // Try exact match
    if (this.stadiumDatabase.has(teamName)) {
      return this.stadiumDatabase.get(teamName)!;
    }

    // Try partial match
    for (const [key, value] of this.stadiumDatabase.entries()) {
      if (teamName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(teamName.toLowerCase())) {
        return value;
      }
    }

    return null;
  }

  /**
   * Calculate altitude impact for a game
   */
  calculateAltitudeImpact(homeTeam: string, awayTeam: string): AltitudeImpact {
    const homeStadium = this.getStadiumInfo(homeTeam);

    if (!homeStadium) {
      return {
        homeAdvantageBoost: 0,
        oxygenImpact: 'none',
        visitingTeamDisadvantage: 0,
        adjustmentReasons: [],
      };
    }

    const altitude = homeStadium.altitude;
    const reasons: string[] = [];
    let homeBoost = 0;
    let oxygenImpact: AltitudeImpact['oxygenImpact'] = 'none';
    let visitorDisadvantage = 0;

    // Mile High and similar elevations
    if (altitude >= 5000) {
      homeBoost = 3;
      oxygenImpact = 'severe';
      visitorDisadvantage = 8;
      reasons.push(`${homeStadium.name} at ${altitude}ft - severe altitude impact`);

      // Check if away team is from sea level (e.g., Florida teams)
      const awayStadium = this.getStadiumInfo(awayTeam);
      if (awayStadium && awayStadium.altitude < 1000) {
        homeBoost += 1;
        visitorDisadvantage += 2;
        reasons.push(`${awayTeam} from sea level at high altitude`);
      }
    } else if (altitude >= 3500) {
      homeBoost = 2;
      oxygenImpact = 'moderate';
      visitorDisadvantage = 5;
      reasons.push(`${homeStadium.name} at ${altitude}ft - moderate altitude impact`);
    } else if (altitude >= 2000) {
      homeBoost = 0.5;
      oxygenImpact = 'minimal';
      visitorDisadvantage = 2;
    }

    return {
      homeAdvantageBoost: Math.round(homeBoost * 10) / 10,
      oxygenImpact,
      visitingTeamDisadvantage: Math.round(visitorDisadvantage * 10) / 10,
      adjustmentReasons: reasons,
    };
  }

  /**
   * Get all stadiums at high altitude
   */
  getHighAltitudeStadiums(): Array<{ team: string; info: StadiumInfo }> {
    const highAltitude: Array<{ team: string; info: StadiumInfo }> = [];

    for (const [team, info] of this.stadiumDatabase.entries()) {
      if (info.altitude >= 2000) {
        highAltitude.push({ team, info });
      }
    }

    return highAltitude.sort((a, b) => b.info.altitude - a.info.altitude);
  }
}

export default StadiumImpactService;
