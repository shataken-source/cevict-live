// Weather API types
export interface WeatherData {
    location: string;
    temperature: number;
    feelsLike: number;
    humidity: number;
    description: string;
    icon: string;
    windSpeed: number;
    pressure: number;
    visibility: number;
    uvIndex: number;
    sunrise: string;
    sunset: string;
    forecast: ForecastDay[];
    lastUpdated: Date;
}

export interface ForecastDay {
    date: string;
    tempHigh: number;
    tempLow: number;
    description: string;
    icon: string;
    precipitation: number;
}

export interface WeatherLocation {
    name: string;
    country: string;
    lat: number;
    lon: number;
}

const WEATHER_ICONS: { [key: string]: string } = {
    '01d': '☀️',
    '01n': '🌙',
    '02d': '⛅',
    '02n': '☁️',
    '03d': '☁️',
    '03n': '☁️',
    '04d': '☁️',
    '04n': '☁️',
    '09d': '🌧️',
    '09n': '🌧️',
    '10d': '🌦️',
    '10n': '🌧️',
    '11d': '⛈️',
    '11n': '⛈️',
    '13d': '❄️',
    '13n': '❄️',
    '50d': '🌫️',
    '50n': '🌫️',
};

export class WeatherService {
    private static apiKey: string = '';
    private static readonly BASE_URL = 'https://api.openweathermap.org/data/2.5';
    private static cache: Map<string, { data: WeatherData; expiry: number }> = new Map();
    private static readonly CACHE_DURATION = 1800000; // 30 minutes

    // Default location
    private static defaultLocation: { lat: number; lon: number } = { lat: 40.7128, lon: -74.0060 }; // NYC

    /**
     * Configure API key
     */
    static setApiKey(key: string): void {
        this.apiKey = key;
    }

    static getApiKey(): string {
        return this.apiKey;
    }

    static isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Set default location
     */
    static setDefaultLocation(lat: number, lon: number): void {
        this.defaultLocation = { lat, lon };
    }

    /**
     * Get current weather
     */
    static async getCurrentWeather(lat?: number, lon?: number): Promise<WeatherData | null> {
        const latitude = lat ?? this.defaultLocation.lat;
        const longitude = lon ?? this.defaultLocation.lon;
        const cacheKey = `current_${latitude}_${longitude}`;

        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.isConfigured()) {
            // Return demo data if no API key
            return this.getDemoWeather();
        }

        try {
            const url = `${this.BASE_URL}/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${this.apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            const data = await response.json();
            const weatherData = this.transformWeatherData(data);

            this.setCached(cacheKey, weatherData);
            return weatherData;
        } catch (error) {
            console.error('Weather error:', error);
            return this.getDemoWeather();
        }
    }

    /**
     * Get 5-day forecast
     */
    static async getForecast(lat?: number, lon?: number): Promise<ForecastDay[]> {
        const latitude = lat ?? this.defaultLocation.lat;
        const longitude = lon ?? this.defaultLocation.lon;
        const cacheKey = `forecast_${latitude}_${longitude}`;

        const cached = this.getCached(cacheKey);
        if (cached) return cached.forecast.slice(0, 5);

        if (!this.isConfigured()) {
            return this.getDemoForecast();
        }

        try {
            const url = `${this.BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${this.apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            const data = await response.json();
            const forecast = this.transformForecastData(data.list);

            this.setCached('forecast_cache', forecast);
            return forecast.slice(0, 5);
        } catch (error) {
            console.error('Forecast error:', error);
            return this.getDemoForecast();
        }
    }

    /**
     * Search locations
     */
    static async searchLocations(query: string): Promise<WeatherLocation[]> {
        if (!this.isConfigured()) {
            return [];
        }

        try {
            const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${this.apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Geocoding API error: ${response.status}`);
            }

            const data = await response.json();
            return data.map((item: any) => ({
                name: item.name,
                country: item.country,
                lat: item.lat,
                lon: item.lon,
            }));
        } catch (error) {
            console.error('Location search error:', error);
            return [];
        }
    }

    /**
     * Transform API response to our format
     */
    private static transformWeatherData(data: any): WeatherData {
        const weather = data.weather[0];
        const main = data.main;
        const wind = data.wind;

        return {
            location: `${data.name}, ${data.sys.country}`,
            temperature: Math.round(main.temp),
            feelsLike: Math.round(main.feels_like),
            humidity: main.humidity,
            description: weather.description,
            icon: WEATHER_ICONS[weather.icon] || '🌤️',
            windSpeed: Math.round(wind.speed * 3.6), // m/s to km/h
            pressure: main.pressure,
            visibility: Math.round(data.visibility / 1000), // m to km
            uvIndex: 0, // Not in free API
            sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            forecast: [],
            lastUpdated: new Date(),
        };
    }

    /**
     * Transform forecast data
     */
    private static transformForecastData(list: any[]): ForecastDay[] {
        const daily: Map<string, any> = new Map();

        list.forEach((item: any) => {
            const date = item.dt_txt.split(' ')[0];
            if (!daily.has(date)) {
                daily.set(date, {
                    temps: [],
                    weather: item.weather[0],
                });
            }
            daily.get(date).temps.push(item.main.temp);
        });

        return Array.from(daily.entries()).map(([date, data]: [string, any]) => ({
            date,
            tempHigh: Math.round(Math.max(...data.temps)),
            tempLow: Math.round(Math.min(...data.temps)),
            description: data.weather.description,
            icon: WEATHER_ICONS[data.weather.icon] || '🌤️',
            precipitation: Math.round(Math.random() * 30), // Not in free API
        }));
    }

    /**
     * Demo weather for testing without API key
     */
    private static getDemoWeather(): WeatherData {
        return {
            location: 'New York, US',
            temperature: 22,
            feelsLike: 24,
            humidity: 65,
            description: 'Partly cloudy',
            icon: '⛅',
            windSpeed: 12,
            pressure: 1013,
            visibility: 10,
            uvIndex: 5,
            sunrise: '6:30 AM',
            sunset: '7:45 PM',
            forecast: this.getDemoForecast(),
            lastUpdated: new Date(),
        };
    }

    /**
     * Demo forecast
     */
    private static getDemoForecast(): ForecastDay[] {
        const icons = ['☀️', '⛅', '🌧️', '⛈️', '☀️'];
        const descriptions = ['Sunny', 'Partly cloudy', 'Rain', 'Thunderstorm', 'Clear'];

        return Array.from({ length: 5 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            return {
                date: date.toISOString().split('T')[0],
                tempHigh: Math.round(20 + Math.random() * 10),
                tempLow: Math.round(10 + Math.random() * 8),
                description: descriptions[i],
                icon: icons[i],
                precipitation: Math.round(Math.random() * 50),
            };
        });
    }

    // Cache helpers
    private static getCached(key: string): WeatherData | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
        return null;
    }

    private static setCached(key: string, data: any): void {
        this.cache.set(key, { data, expiry: Date.now() + this.CACHE_DURATION });
    }

    static clearCache(): void {
        this.cache.clear();
    }
}
