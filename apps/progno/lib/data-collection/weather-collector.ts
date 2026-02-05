/**
 * Weather Data Collector for Phase 4 (Chaos Sensitivity Index)
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

  /**
   * Get weather for a stadium location
   */
  async getWeatherForStadium(
    stadium: StadiumLocation,
    gameDate: Date
  ): Promise<WeatherData | null> {

    if (!this.apiKey) {
      console.warn('[Weather Collector] No OpenWeather API key configured');
      return null;
    }

    try {
      // OpenWeatherMap API
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${stadium.latitude}&lon=${stadium.longitude}&appid=${this.apiKey}&units=imperial`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[Weather Collector] API error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Determine precipitation type
      let precipitationType: 'none' | 'rain' | 'heavy_rain' | 'snow' = 'none';
      const weatherMain = data.weather?.[0]?.main?.toLowerCase() || '';
      if (weatherMain.includes('snow')) {
        precipitationType = 'snow';
      } else if (weatherMain.includes('rain')) {
        const rainVolume = data.rain?.['1h'] || 0;
        precipitationType = rainVolume > 0.1 ? 'heavy_rain' : 'rain';
      }

      return {
        temperature: data.main?.temp || 70,
        conditions: data.weather?.[0]?.description || 'clear',
        windSpeed: (data.wind?.speed || 0) * 2.237, // Convert m/s to mph
        windGusts: data.wind?.gust ? (data.wind.gust * 2.237) : undefined,
        precipitationType,
        humidity: data.main?.humidity || 50,
        visibility: (data.visibility || 10000) / 1609.34, // Convert m to miles
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error('[Weather Collector] Error:', error.message);
      return null;
    }
  }

  /**
   * Get weather forecast for a future game
   */
  async getForecastForStadium(
    stadium: StadiumLocation,
    gameDate: Date
  ): Promise<WeatherData | null> {

    if (!this.apiKey) {
      return null;
    }

    try {
      // Use 5-day forecast API
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${stadium.latitude}&lon=${stadium.longitude}&appid=${this.apiKey}&units=imperial`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      // Find forecast closest to game time
      const gameTime = gameDate.getTime();
      let closestForecast = data.list?.[0];
      let minDiff = Infinity;

      for (const forecast of data.list || []) {
        const forecastTime = new Date(forecast.dt * 1000).getTime();
        const diff = Math.abs(forecastTime - gameTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestForecast = forecast;
        }
      }

      if (!closestForecast) {
        return null;
      }

      // Parse forecast data
      let precipitationType: 'none' | 'rain' | 'heavy_rain' | 'snow' = 'none';
      const weatherMain = closestForecast.weather?.[0]?.main?.toLowerCase() || '';
      if (weatherMain.includes('snow')) {
        precipitationType = 'snow';
      } else if (weatherMain.includes('rain')) {
        precipitationType = closestForecast.rain?.['3h'] > 5 ? 'heavy_rain' : 'rain';
      }

      return {
        temperature: closestForecast.main?.temp || 70,
        conditions: closestForecast.weather?.[0]?.description || 'clear',
        windSpeed: (closestForecast.wind?.speed || 0) * 2.237,
        windGusts: closestForecast.wind?.gust ? (closestForecast.wind.gust * 2.237) : undefined,
        precipitationType,
        humidity: closestForecast.main?.humidity || 50,
        visibility: 10, // Forecast doesn't include visibility
        timestamp: new Date(closestForecast.dt * 1000),
      };
    } catch (error: any) {
      console.error('[Weather Collector] Forecast error:', error.message);
      return null;
    }
  }
}

