/**
 * Environmental Factors Integration Service
 * Uses CevictScraper (cevict-scraper) for weather when provided, instead of ScrapingBee.
 */

import { WeatherImpactAnalysisService, WeatherConditions } from './weather-impact-service';
import { StadiumImpactService, AltitudeImpact } from './stadium-impact-service';
import { CevictScraperService } from './cevict-scraper-service';

export interface EnvironmentalFactors {
  weather: WeatherConditions | null;
  altitude: AltitudeImpact | null;
  dome: boolean;
  surface: 'grass' | 'turf' | 'hybrid' | null;
  climate: 'hot' | 'cold' | 'mild' | 'dry' | 'humid' | null;
}

export interface EnvironmentalAdjustment {
  homeAdvantageAdjustment: number;
  totalAdjustment: number;
  confidenceAdjustment: number;
  reasoning: string[];
}

export class EnvironmentalFactorsService {
  private weatherService: WeatherImpactAnalysisService;
  private stadiumService: StadiumImpactService;
  private scraper: CevictScraperService | null = null;

  constructor(cevictScraperUrl?: string, apiKey?: string) {
    this.weatherService = new WeatherImpactAnalysisService();
    this.stadiumService = new StadiumImpactService();
    if (cevictScraperUrl) {
      this.scraper = new CevictScraperService(cevictScraperUrl, apiKey);
    }
  }

  async analyzeGame(
    sport: string,
    homeTeam: string,
    awayTeam: string,
    gameDate: string,
    isDome: boolean = false
  ): Promise<EnvironmentalAdjustment> {
    const reasoning: string[] = [];
    let homeAdvantageAdjustment = 0;
    let totalAdjustment = 0;
    let confidenceAdjustment = 0;
    const stadiumInfo = this.stadiumService.getStadiumInfo(homeTeam);
    if (!isDome) {
      const altitudeImpact = this.stadiumService.calculateAltitudeImpact(homeTeam, awayTeam);
      homeAdvantageAdjustment += altitudeImpact.homeAdvantageBoost;
      reasoning.push(...altitudeImpact.adjustmentReasons);
      if (altitudeImpact.visitingTeamDisadvantage > 5) confidenceAdjustment += 2;
    }
    if (!isDome && stadiumInfo && !stadiumInfo.dome) {
      let weather: WeatherConditions | null = null;
      if (this.scraper) {
        const scrapedWeather = await this.scraper.scrapeWeatherData(stadiumInfo.city, gameDate);
        if (scrapedWeather) weather = this.parseScrapedWeather(scrapedWeather);
      }
      if (weather) {
        let weatherImpact;
        switch (sport.toLowerCase()) {
          case 'nfl': weatherImpact = this.weatherService.analyzeNFL(weather, homeTeam, awayTeam); break;
          case 'nba': weatherImpact = this.weatherService.analyzeNBA(weather, homeTeam, awayTeam); break;
          case 'mlb': weatherImpact = this.weatherService.analyzeMLB(weather, homeTeam, awayTeam); break;
          case 'nhl': weatherImpact = this.weatherService.analyzeNHL(weather, homeTeam, awayTeam); break;
          default: weatherImpact = null;
        }
        if (weatherImpact) {
          totalAdjustment += weatherImpact.totalPointsImpact;
          homeAdvantageAdjustment += weatherImpact.homeTeamAdvantage;
          confidenceAdjustment += weatherImpact.confidenceAdjustment;
          reasoning.push(...weatherImpact.reasoning);
          const awayStadium = this.stadiumService.getStadiumInfo(awayTeam);
          if (awayStadium?.dome && (weather.temperature < 32 || weather.temperature > 90 || weather.windSpeed > 20)) {
            homeAdvantageAdjustment += 2;
            reasoning.push(`${awayTeam} (dome team) playing in outdoor ${weather.condition} conditions`);
          }
        }
      }
    }
    if (stadiumInfo?.surface === 'turf' && sport.toLowerCase() === 'nfl') {
      const turfAdvantageTeams = ['Cowboys', 'Vikings', 'Lions', 'Colts', 'Saints'];
      if (turfAdvantageTeams.some(t => homeTeam.includes(t))) {
        homeAdvantageAdjustment += 0.5;
        reasoning.push(`${homeTeam} has home turf advantage`);
      }
    }
    return {
      homeAdvantageAdjustment: Math.round(homeAdvantageAdjustment * 10) / 10,
      totalAdjustment: Math.round(totalAdjustment * 10) / 10,
      confidenceAdjustment: Math.round(confidenceAdjustment * 10) / 10,
      reasoning,
    };
  }

  applyAdjustments(
    baseHomeWinProb: number,
    baseTotal: number,
    baseConfidence: number,
    adjustments: EnvironmentalAdjustment
  ): { winProb: number; total: number; confidence: number; reasoning: string[] } {
    const winProbAdjustment = adjustments.homeAdvantageAdjustment / 100;
    const adjustedWinProb = Math.max(0.1, Math.min(0.9, baseHomeWinProb + winProbAdjustment));
    const adjustedTotal = Math.max(30, baseTotal + adjustments.totalAdjustment);
    const adjustedConfidence = Math.max(50, Math.min(99, baseConfidence + adjustments.confidenceAdjustment));
    return {
      winProb: Math.round(adjustedWinProb * 100) / 100,
      total: Math.round(adjustedTotal * 10) / 10,
      confidence: Math.round(adjustedConfidence * 10) / 10,
      reasoning: adjustments.reasoning,
    };
  }

  async getHighRiskGames(games: Array<{ sport: string; homeTeam: string; awayTeam: string; gameDate: string; isDome: boolean }>): Promise<Array<{ game: any; riskLevel: 'high' | 'medium' | 'low'; factors: string[] }>> {
    const highRiskGames = [];
    for (const game of games) {
      const factors = await this.analyzeGame(game.sport, game.homeTeam, game.awayTeam, game.gameDate, game.isDome);
      const riskFactors = factors.reasoning;
      let riskLevel: 'high' | 'medium' | 'low' = 'low';
      if (riskFactors.some(r => r.includes('severe') || r.includes('5280ft'))) riskLevel = 'high';
      else if (riskFactors.length > 2 || factors.homeAdvantageAdjustment > 3) riskLevel = 'medium';
      if (riskLevel !== 'low') highRiskGames.push({ game, riskLevel, factors: riskFactors });
    }
    return highRiskGames;
  }

  private parseScrapedWeather(data: any): WeatherConditions | null {
    try {
      return {
        temperature: parseInt(data.temperature) || 70,
        condition: this.parseCondition(data.condition),
        windSpeed: parseInt(data.wind) || 0,
        humidity: parseInt(data.humidity) || 50,
        precipitation: 0,
      };
    } catch (e) {
      return null;
    }
  }

  private parseCondition(condition: string): WeatherConditions['condition'] {
    const cond = condition?.toLowerCase() || '';
    if (cond.includes('rain')) return 'rain';
    if (cond.includes('snow')) return 'snow';
    if (cond.includes('wind')) return 'windy';
    if (cond.includes('fog')) return 'fog';
    if (cond.includes('cloud')) return 'cloudy';
    if (cond.includes('clear') || cond.includes('sun')) return 'clear';
    return 'clear';
  }
}

export default EnvironmentalFactorsService;
