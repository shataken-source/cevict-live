/**
 * Weather Impact Module
 * Fetches weather data and calculates impact on outdoor sports
 */

interface WeatherData {
  location: string;
  temperature: number; // Fahrenheit
  windSpeed: number; // mph
  windGust: number;
  precipitation: number; // inches
  precipitationProbability: number; // 0-100
  humidity: number; // 0-100
  visibility: number; // miles
  conditions: string;
  alerts: string[];
}

interface GameWeather {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  outdoor: boolean;
  weather: WeatherData | null;
  impact: WeatherImpact;
}

interface WeatherImpact {
  score: number; // 0-100, 100 = perfect conditions
  category: 'favorable' | 'neutral' | 'unfavorable' | 'severe';
  factors: string[];
  bettingImpact: string;
  totalAdjustment: number; // Adjustment to expected total
  spreadAdjustment: number; // Adjustment to spread
}

export class WeatherImpactAnalyzer {
  private apiKey = process.env.WEATHER_API_KEY;
  private baseUrl = 'https://api.weatherapi.com/v1';
  
  /**
   * Fetch weather for a stadium location
   */
  async getWeatherForLocation(location: string, hoursAhead: number = 0): Promise<WeatherData | null> {
    if (!this.apiKey) {
      console.warn('⚠️ WEATHER_API_KEY not configured');
      return null;
    }
    
    try {
      const dt = new Date();
      dt.setHours(dt.getHours() + hoursAhead);
      const dateStr = dt.toISOString().split('T')[0];
      
      const response = await fetch(
        `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&dt=${dateStr}&aqi=no`
      );
      
      if (!response.ok) {
        console.warn('Weather API error:', response.status);
        return null;
      }
      
      const data = await response.json();
      const current = data.current;
      const forecast = data.forecast?.forecastday?.[0]?.hour?.find((h: any) => {
        const hTime = new Date(h.time);
        return hTime.getHours() === dt.getHours();
      }) || current;
      
      return {
        location: data.location?.name || location,
        temperature: forecast.temp_f || current.temp_f,
        windSpeed: forecast.wind_mph || current.wind_mph,
        windGust: forecast.gust_mph || current.gust_mph || 0,
        precipitation: forecast.precip_in || current.precip_in || 0,
        precipitationProbability: forecast.chance_of_rain || 0,
        humidity: forecast.humidity || current.humidity,
        visibility: forecast.vis_miles || current.vis_miles || 10,
        conditions: forecast.condition?.text || current.condition?.text || 'Unknown',
        alerts: data.alerts?.alert?.map((a: any) => a.headline) || []
      };
    } catch (error) {
      console.error('Error fetching weather:', error);
      return null;
    }
  }
  
  /**
   * Calculate weather impact on a game
   */
  calculateImpact(weather: WeatherData | null, sport: string): WeatherImpact {
    if (!weather) {
      return {
        score: 50,
        category: 'neutral',
        factors: ['No weather data available'],
        bettingImpact: 'No impact',
        totalAdjustment: 0,
        spreadAdjustment: 0
      };
    }
    
    const factors: string[] = [];
    let score = 100; // Start perfect, deduct for bad conditions
    
    // Temperature impact
    if (weather.temperature < 32) {
      factors.push(`❄️ Freezing temps (${weather.temperature}°F) - affects grip`);
      score -= 15;
    } else if (weather.temperature > 85) {
      factors.push(`🌡️ Hot temps (${weather.temperature}°F) - player fatigue`);
      score -= 10;
    }
    
    // Wind impact (critical for football)
    if (sport === 'NFL' || sport === 'NCAA') {
      if (weather.windSpeed > 15) {
        factors.push(`💨 High winds (${weather.windSpeed} mph) - affects passing/kicking`);
        score -= 20;
      } else if (weather.windSpeed > 10) {
        factors.push(`🌬️ Moderate winds (${weather.windSpeed} mph)`);
        score -= 10;
      }
      
      if (weather.windGust > 25) {
        factors.push(`🌪️ Wind gusts (${weather.windGust} mph) - unpredictable`);
        score -= 15;
      }
    }
    
    // Precipitation impact
    if (weather.precipitation > 0.1) {
      factors.push(`🌧️ Rain (${weather.precipitation} in) - slippery conditions`);
      score -= 25;
    } else if (weather.precipitationProbability > 60) {
      factors.push(`☁️ High rain chance (${weather.precipitationProbability}%)`);
      score -= 10;
    }
    
    // Visibility
    if (weather.visibility < 1) {
      factors.push(`🌫️ Poor visibility (${weather.visibility} miles)`);
      score -= 20;
    }
    
    // Weather alerts
    for (const alert of weather.alerts.slice(0, 2)) {
      factors.push(`⚠️ ${alert}`);
      score -= 20;
    }
    
    // Calculate category
    let category: WeatherImpact['category'];
    if (score >= 80) category = 'favorable';
    else if (score >= 60) category = 'neutral';
    else if (score >= 40) category = 'unfavorable';
    else category = 'severe';
    
    // Calculate betting adjustments
    let totalAdjustment = 0;
    let spreadAdjustment = 0;
    
    if (sport === 'NFL' || sport === 'NCAA') {
      // High winds reduce passing effectiveness → lower totals
      if (weather.windSpeed > 15) totalAdjustment -= 3;
      if (weather.windGust > 20) totalAdjustment -= 2;
      
      // Rain reduces scoring
      if (weather.precipitation > 0.1) totalAdjustment -= 4;
      
      // Wind favors underdog (affects kicking/field position)
      if (weather.windSpeed > 12) spreadAdjustment += 1.5;
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      category,
      factors: factors.length > 0 ? factors : ['Favorable conditions'],
      bettingImpact: this.getBettingImpact(category, totalAdjustment, spreadAdjustment),
      totalAdjustment,
      spreadAdjustment
    };
  }
  
  /**
   * Analyze weather for multiple games
   */
  async analyzeGames(games: Array<{ gameId: string; homeTeam: string; awayTeam: string; stadium: string; outdoor: boolean; sport: string }>): Promise<GameWeather[]> {
    const results: GameWeather[] = [];
    
    for (const game of games) {
      if (!game.outdoor) {
        results.push({
          ...game,
          weather: null,
          impact: {
            score: 90,
            category: 'favorable',
            factors: ['🏟️ Indoor stadium - controlled conditions'],
            bettingImpact: 'No weather impact (indoor)',
            totalAdjustment: 0,
            spreadAdjustment: 0
          }
        });
        continue;
      }
      
      const weather = await this.getWeatherForLocation(game.stadium, 3); // 3 hours ahead
      const impact = this.calculateImpact(weather, game.sport);
      
      results.push({
        ...game,
        weather,
        impact
      });
    }
    
    return results.sort((a, b) => a.impact.score - b.impact.score);
  }
  
  /**
   * Generate weather report
   */
  generateReport(games: GameWeather[]): string {
    const lines = [
      '🌤️ WEATHER IMPACT REPORT',
      '═'.repeat(60),
      ''
    ];
    
    const outdoor = games.filter(g => g.outdoor);
    const indoor = games.filter(g => !g.outdoor);
    
    // Show severe weather first
    const severe = outdoor.filter(g => g.impact.category === 'severe' || g.impact.category === 'unfavorable');
    
    if (severe.length > 0) {
      lines.push(`⚠️ ${severe.length} GAMES WITH WEATHER CONCERNS:`);
      lines.push('');
      
      for (const game of severe) {
        const w = game.weather;
        lines.push(`${game.awayTeam} @ ${game.homeTeam}`);
        lines.push(`   Score: ${game.impact.score}/100 (${game.impact.category})`);
        if (w) {
          lines.push(`   ${w.temperature}°F | Wind ${w.windSpeed}mph | ${w.conditions}`);
        }
        lines.push(`   Factors: ${game.impact.factors.slice(0, 2).join(', ')}`);
        if (game.impact.totalAdjustment !== 0) {
          lines.push(`   📊 Total adjustment: ${game.impact.totalAdjustment > 0 ? '+' : ''}${game.impact.totalAdjustment}`);
        }
        lines.push('');
      }
    }
    
    if (indoor.length > 0) {
      lines.push(`🏟️ ${indoor.length} indoor games (no weather impact)`);
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  private getBettingImpact(category: string, totalAdj: number, spreadAdj: number): string {
    const parts: string[] = [];
    
    if (category === 'favorable') parts.push('No impact');
    else if (category === 'severe') parts.push('Avoid or reduce stakes');
    else parts.push('Monitor closely');
    
    if (totalAdj !== 0) parts.push(`Total ${totalAdj > 0 ? '+' : ''}${totalAdj}`);
    if (spreadAdj !== 0) parts.push(`Spread ${spreadAdj > 0 ? '+' : ''}${spreadAdj}`);
    
    return parts.join(' | ') || 'Neutral';
  }
}

export const weatherAnalyzer = new WeatherImpactAnalyzer();
