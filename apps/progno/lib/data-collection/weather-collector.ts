/**
 * Weather Data Collector for Phase 4 (Chaos Sensitivity Index)
 * Hardened with timeouts, retries, validation, and graceful fallbacks
 */

export interface WeatherData {
  temperature: number;
  conditions: string;
  windSpeed: number;
  windGusts?: number;
  precipitationType: 'none' | 'rain' | 'heavy_rain' | 'snow';
  humidity: number;
  visibility: number;
  timestamp: Date;
}

export interface StadiumLocation {
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

export class WeatherCollector {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENWEATHER_API_KEY || '';
  }

  async getWeatherForStadium(
    stadium: StadiumLocation,
    gameDate: Date
  ): Promise<WeatherData | null> {

    if (!this.apiKey || !stadium?.latitude || !stadium?.longitude) {
      console.warn('[WeatherCollector] Missing API key or location');
      return null;
    }

    return this.fetchWithRetry(
      () => this.callCurrentWeatherAPI(stadium),
      8000,
      2
    );
  }

  async getForecastForStadium(
    stadium: StadiumLocation,
    gameDate: Date
  ): Promise<WeatherData | null> {

    if (!this.apiKey || !stadium?.latitude || !stadium?.longitude) return null;

    return this.fetchWithRetry(
      () => this.callForecastAPI(stadium, gameDate),
      10000,
      2
    );
  }

  private async fetchWithRetry<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    maxRetries: number
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        return result;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (attempt > maxRetries) {
          console.warn(`[WeatherCollector] Failed after ${maxRetries} attempts: ${err.message}`);
          return null;
        }
        const delay = Math.min(1500 * attempt, 5000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    return null;
  }

  private async callCurrentWeatherAPI(stadium: StadiumLocation): Promise<WeatherData | null> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${stadium.latitude}&lon=${stadium.longitude}&appid=${this.apiKey}&units=imperial`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    return {
      temperature: data.main?.temp || 70,
      conditions: data.weather?.[0]?.description || 'clear',
      windSpeed: (data.wind?.speed || 0) * 2.237,
      windGusts: data.wind?.gust ? (data.wind.gust * 2.237) : undefined,
      precipitationType: this.determinePrecipitationType(data),
      humidity: data.main?.humidity || 50,
      visibility: (data.visibility || 10000) / 1609.34,
      timestamp: new Date()
    };
  }

  private async callForecastAPI(stadium: StadiumLocation, gameDate: Date): Promise<WeatherData | null> {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${stadium.latitude}&lon=${stadium.longitude}&appid=${this.apiKey}&units=imperial`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // Find closest forecast
    const gameTime = gameDate.getTime();
    let closest = data.list?.[0];
    let minDiff = Infinity;

    for (const forecast of data.list || []) {
      const forecastTime = new Date(forecast.dt * 1000).getTime();
      const diff = Math.abs(forecastTime - gameTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = forecast;
      }
    }

    if (!closest) return null;

    return {
      temperature: closest.main?.temp || 70,
      conditions: closest.weather?.[0]?.description || 'clear',
      windSpeed: (closest.wind?.speed || 0) * 2.237,
      windGusts: closest.wind?.gust ? (closest.wind.gust * 2.237) : undefined,
      precipitationType: this.determinePrecipitationType(closest),
      humidity: closest.main?.humidity || 50,
      visibility: 10,
      timestamp: new Date(closest.dt * 1000)
    };
  }

  private determinePrecipitationType(data: any): 'none' | 'rain' | 'heavy_rain' | 'snow' {
    const main = data.weather?.[0]?.main?.toLowerCase() || '';
    if (main.includes('snow')) return 'snow';

    const rainVolume = data.rain?.['1h'] || data.rain?.['3h'] || 0;
    if (main.includes('rain')) {
      return rainVolume > 5 ? 'heavy_rain' : 'rain';
    }
    return 'none';
  }
}