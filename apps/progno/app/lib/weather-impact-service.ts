/**
 * Weather Impact Analysis Service
 * Analyzes weather conditions and their impact on game outcomes
 */

export interface WeatherConditions {
  temperature: number; // Fahrenheit
  condition: 'clear' | 'cloudy' | 'rain' | 'snow' | 'windy' | 'fog' | 'extreme';
  windSpeed: number; // mph
  windDirection?: string;
  humidity: number; // percentage
  precipitation: number; // inches expected
  visibility?: number; // miles
}

export interface WeatherImpact {
  totalPointsImpact: number; // Positive = higher scoring expected
  homeTeamAdvantage: number; // Positive = home team benefits
  passGameImpact: number; // Negative = worse for passing
  rushGameImpact: number; // Positive = better for running
  confidenceAdjustment: number; // Percentage adjustment to model confidence
  reasoning: string[];
}

export class WeatherImpactAnalysisService {
  /**
   * Analyze weather impact on an NFL game
   */
  analyzeNFL(weather: WeatherConditions, homeTeam: string, awayTeam: string): WeatherImpact {
    let totalPointsImpact = 0;
    let homeAdvantage = 0;
    let passImpact = 0;
    let rushImpact = 0;
    const reasoning: string[] = [];

    // Temperature effects
    if (weather.temperature < 20) {
      totalPointsImpact -= 3;
      passImpact -= 2;
      reasoning.push(`Extreme cold (${weather.temperature}°F) reduces offensive efficiency`);
    } else if (weather.temperature > 90) {
      totalPointsImpact -= 2;
      reasoning.push(`Extreme heat (${weather.temperature}°F) causes fatigue`);
    }

    // Wind effects (major factor for kicking and passing)
    if (weather.windSpeed > 20) {
      totalPointsImpact -= 4;
      passImpact -= 5;
      reasoning.push(`High winds (${weather.windSpeed} mph) severely impact passing and kicking`);
    } else if (weather.windSpeed > 15) {
      totalPointsImpact -= 2;
      passImpact -= 3;
      reasoning.push(`Moderate winds (${weather.windSpeed} mph) affect deep passes`);
    } else if (weather.windSpeed > 10) {
      totalPointsImpact -= 1;
      passImpact -= 1;
    }

    // Precipitation
    if (weather.precipitation > 0.2) {
      totalPointsImpact -= 3;
      passImpact -= 4;
      rushImpact += 2;
      reasoning.push(`Heavy rain/snow (${weather.precipitation}") favors ground game`);
    } else if (weather.precipitation > 0) {
      totalPointsImpact -= 1;
      passImpact -= 1;
      rushImpact += 1;
    }

    // Snow specifically
    if (weather.condition === 'snow') {
      totalPointsImpact -= 3;
      passImpact -= 3;
      rushImpact += 1;
      homeAdvantage += 1; // Cold weather teams advantage
      reasoning.push('Snow conditions favor running game and cold-weather teams');
    }

    // Check for dome teams playing outside
    const domeTeams = ['Falcons', 'Saints', 'Cowboys', 'Texans', 'Lions', 'Vikings', 'Colts', 'Cardinals'];
    const coldCities = ['Packers', 'Bears', 'Bills', 'Browns', 'Steelers', 'Chiefs', 'Broncos'];
    
    if (domeTeams.some(t => awayTeam.includes(t)) && weather.temperature < 40) {
      homeAdvantage += 2;
      reasoning.push(`${awayTeam} (dome team) playing in cold weather`);
    }

    if (coldCities.some(t => homeTeam.includes(t)) && weather.temperature < 30) {
      homeAdvantage += 1.5;
      reasoning.push(`${homeTeam} cold weather advantage`);
    }

    // Calculate confidence adjustment
    const confidenceAdjustment = this.calculateConfidenceAdjustment(weather);

    return {
      totalPointsImpact: Math.round(totalPointsImpact * 10) / 10,
      homeTeamAdvantage: Math.round(homeAdvantage * 10) / 10,
      passGameImpact: Math.round(passImpact * 10) / 10,
      rushGameImpact: Math.round(rushImpact * 10) / 10,
      confidenceAdjustment: Math.round(confidenceAdjustment * 10) / 10,
      reasoning,
    };
  }

  /**
   * Analyze weather impact on an NBA game
   */
  analyzeNBA(weather: WeatherConditions, homeTeam: string, awayTeam: string): WeatherImpact {
    // NBA is played indoors, so minimal weather impact
    // Only extreme conditions affecting travel/focus
    
    let homeAdvantage = 0;
    const reasoning: string[] = [];

    // Severe weather could affect travel
    if (weather.condition === 'snow' || weather.windSpeed > 30) {
      homeAdvantage += 1;
      reasoning.push('Severe weather may impact away team travel');
    }

    return {
      totalPointsImpact: 0,
      homeTeamAdvantage: Math.round(homeAdvantage * 10) / 10,
      passGameImpact: 0,
      rushGameImpact: 0,
      confidenceAdjustment: 0,
      reasoning,
    };
  }

  /**
   * Analyze weather impact on an MLB game
   */
  analyzeMLB(weather: WeatherConditions, homeTeam: string, awayTeam: string): WeatherImpact {
    let totalPointsImpact = 0;
    let homeAdvantage = 0;
    const reasoning: string[] = [];

    // Wind at Wrigley, Fenway, etc. is major factor
    if (weather.windSpeed > 15) {
      if (weather.windDirection?.includes('Out')) {
        totalPointsImpact += 3; // Wind blowing out = more home runs
        reasoning.push(`Wind blowing out (${weather.windSpeed} mph) - more home runs expected`);
      } else if (weather.windDirection?.includes('In')) {
        totalPointsImpact -= 2;
        reasoning.push(`Wind blowing in (${weather.windSpeed} mph) - suppresses offense`);
      }
    }

    // Temperature affects ball flight
    if (weather.temperature > 85) {
      totalPointsImpact += 1;
      reasoning.push('Hot weather = ball carries further');
    } else if (weather.temperature < 50) {
      totalPointsImpact -= 1;
      reasoning.push('Cold weather = ball does not carry');
    }

    // Rain delays/doubleheaders
    if (weather.precipitation > 0.1) {
      homeAdvantage -= 0.5; // Unpredictable conditions
      reasoning.push('Rain may cause delays or postponement');
    }

    return {
      totalPointsImpact: Math.round(totalPointsImpact * 10) / 10,
      homeTeamAdvantage: Math.round(homeAdvantage * 10) / 10,
      passGameImpact: 0,
      rushGameImpact: 0,
      confidenceAdjustment: this.calculateConfidenceAdjustment(weather),
      reasoning,
    };
  }

  /**
   * Analyze weather impact on an NHL game
   */
  analyzeNHL(weather: WeatherConditions, homeTeam: string, awayTeam: string): WeatherImpact {
    // NHL is indoors, minimal direct impact
    // But altitude affects puck movement in Denver
    let homeAdvantage = 0;
    const reasoning: string[] = [];

    if (homeTeam.includes('Avalanche')) {
      homeAdvantage += 0.5;
      reasoning.push('Altitude affects puck movement at Ball Arena');
    }

    return {
      totalPointsImpact: 0,
      homeTeamAdvantage: Math.round(homeAdvantage * 10) / 10,
      passGameImpact: 0,
      rushGameImpact: 0,
      confidenceAdjustment: 0,
      reasoning,
    };
  }

  private calculateConfidenceAdjustment(weather: WeatherConditions): number {
    let adjustment = 0;

    // High uncertainty conditions reduce confidence
    if (weather.windSpeed > 20) adjustment -= 3;
    if (weather.precipitation > 0.2) adjustment -= 2;
    if (weather.visibility && weather.visibility < 1) adjustment -= 2;
    if (weather.condition === 'extreme') adjustment -= 5;

    return adjustment;
  }

  /**
   * Get weather-adjusted total
   */
  adjustTotal(baseTotal: number, impact: WeatherImpact): number {
    return Math.max(30, baseTotal + impact.totalPointsImpact);
  }

  /**
   * Apply weather adjustment to pick confidence
   */
  adjustConfidence(baseConfidence: number, impact: WeatherImpact): number {
    const adjusted = baseConfidence + impact.confidenceAdjustment;
    return Math.max(50, Math.min(99, adjusted));
  }
}

export default WeatherImpactAnalysisService;
