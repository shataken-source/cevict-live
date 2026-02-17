// Watchmode API types
export interface StreamingSource {
    name: string;
    url: string;
    type: 'subscription' | 'rent' | 'buy' | 'free';
    region: string;
    format: string;
}

export interface StreamingAvailability {
    title: string;
    year: number;
    imdb_id: string;
    tmdb_type: 'movie' | 'tv';
    tmdb_id: number;
    streaming_sources: StreamingSource[];
}

export interface TitleSearchResult {
    id: number;
    name: string;
    year: number;
    imdb_id: string;
    tmdb_type: 'movie' | 'tv';
    poster_path: string | null;
}

export interface WatchmodeConfig {
    apiKey: string;
    baseUrl: string;
}

const DEFAULT_CONFIG: WatchmodeConfig = {
    apiKey: '',
    baseUrl: 'https://api.watchmode.com/v1',
};

// Streaming service icons and colors
export const STREAMING_SERVICES: { [key: string]: { icon: string; color: string } } = {
    'netflix': { icon: '🎬', color: '#E50914' },
    'amazon_prime': { icon: '📦', color: '#00A8E1' },
    'hulu': { icon: '📺', color: '#1CE783' },
    'disney_plus': { icon: '🏰', color: '#113CCF' },
    'hbomax': { icon: '🔵', color: '#5822B4' },
    'paramount': { icon: '🎥', color: '#0064FF' },
    'peacock': { icon: '🦚', color: '#000000' },
    'apple_tv': { icon: '🍎', color: '#000000' },
    'google_play': { icon: '🎮', color: '#4285F4' },
    'youtube': { icon: '▶️', color: '#FF0000' },
    'vudu': { icon: '💿', color: '#000000' },
    'microsoft_store': { icon: '🪟', color: '#00A4EF' },
    'fubo': { icon: '⚽', color: '#000000' },
    'sling': { icon: '🐍', color: '#000000' },
    'directv': { icon: '📡', color: '#000000' },
};

export class WatchmodeService {
    private static config: WatchmodeConfig = { ...DEFAULT_CONFIG };
    private static cache: Map<string, { data: any; expiry: number }> = new Map();
    private static readonly CACHE_DURATION = 3600000; // 1 hour

    /**
     * Configure API key
     */
    static setApiKey(apiKey: string): void {
        this.config = { ...DEFAULT_CONFIG, apiKey };
    }

    static getApiKey(): string {
        return this.config.apiKey;
    }

    static isConfigured(): boolean {
        return !!this.config.apiKey;
    }

    /**
     * Search for title by name
     */
    static async searchTitle(query: string): Promise<TitleSearchResult[]> {
        const cacheKey = `search_${query.toLowerCase()}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.isConfigured()) {
            return [];
        }

        try {
            const url = `${this.config.baseUrl}/autocomplete/?apiKey=${this.config.apiKey}&search_value=${encodeURIComponent(query)}&types=1,2`; // 1=movie, 2=tv
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Watchmode API error: ${response.status}`);
            }

            const data = await response.json();
            const results: TitleSearchResult[] = (data.results || []).slice(0, 20).map((item: any) => ({
                id: item.id,
                name: item.name,
                year: item.year,
                imdb_id: item.imdb_id,
                tmdb_type: item.type === 1 ? 'movie' : 'tv',
                poster_path: item.poster_path,
            }));

            this.setCached(cacheKey, results);
            return results;
        } catch (error) {
            console.error('Watchmode search error:', error);
            return [];
        }
    }

    /**
     * Get streaming availability for a title
     */
    static async getStreamingAvailability(
        tmdbId: number,
        tmdbType: 'movie' | 'tv'
    ): Promise<StreamingAvailability | null> {
        const cacheKey = `stream_${tmdbType}_${tmdbId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.isConfigured()) {
            return null;
        }

        try {
            const url = `${this.config.baseUrl}/title/${tmdbType}/${tmdbId}/sources/?apiKey=${this.config.apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Watchmode API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                return null;
            }

            // Group by source and get unique sources
            const sourceMap = new Map<string, StreamingSource>();
            data.forEach((item: any) => {
                const sourceName = item.source_name.toLowerCase().replace(/\s+/g, '_');
                if (!sourceMap.has(sourceName)) {
                    sourceMap.set(sourceName, {
                        name: item.source_name,
                        url: item.url,
                        type: item.type,
                        region: item.region,
                        format: item.format || 'HD',
                    });
                }
            });

            const result: StreamingAvailability = {
                title: data[0]?.title || '',
                year: data[0]?.year || 0,
                imdb_id: data[0]?.imdb_id || '',
                tmdb_type: tmdbType,
                tmdb_id: tmdbId,
                streaming_sources: Array.from(sourceMap.values()),
            };

            this.setCached(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Watchmode availability error:', error);
            return null;
        }
    }

    /**
     * Get streaming info for multiple titles
     */
    static async getMultipleStreamingInfo(
        titles: { tmdbId: number; tmdbType: 'movie' | 'tv' }[]
    ): Promise<Map<number, StreamingAvailability>> {
        const results = new Map<number, StreamingAvailability>();

        for (const title of titles) {
            try {
                const availability = await this.getStreamingAvailability(title.tmdbId, title.tmdbType);
                if (availability) {
                    results.set(title.tmdbId, availability);
                }
            } catch (e) {
                // Skip on error
            }
        }

        return results;
    }

    /**
     * Get streaming service info
     */
    static getServiceInfo(sourceName: string): { icon: string; color: string } {
        const normalized = sourceName.toLowerCase().replace(/\s+/g, '_');
        return STREAMING_SERVICES[normalized] || { icon: '📺', color: '#666' };
    }

    /**
     * Format source type
     */
    static formatSourceType(type: string): string {
        switch (type) {
            case 'subscription':
                return '📺 Subscription';
            case 'rent':
                return '💰 Rent';
            case 'buy':
                return '💵 Buy';
            case 'free':
                return '🆓 Free';
            default:
                return type;
        }
    }

    // Cache helpers
    private static getCached(key: string): any | null {
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
