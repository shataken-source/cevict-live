import { Channel } from '@/types';

// TVMaze API types
export interface TVMazeShow {
    id: number;
    name: string;
    summary: string | null;
    url: string;
    image: {
        medium: string | null;
        original: string | null;
    } | null;
    premiered: string | null;
    ended: string | null;
    rating: {
        average: number | null;
    };
    genres: string[];
    status: string;
    runtime: number | null;
    averageRuntime: number | null;
    schedule: {
        time: string;
        days: string[];
    };
    network: TVMazeNetwork | null;
    webChannel: TVMazeWebChannel | null;
    externals: {
        tvrage: number | null;
        thetvdb: number | null;
        imdb: string | null;
    };
}

export interface TVMazeNetwork {
    id: number;
    name: string;
    country: TVMazeCountry | null;
}

export interface TVMazeWebChannel {
    id: number;
    name: string;
    country: TVMazeCountry | null;
}

export interface TVMazeCountry {
    name: string;
    code: string;
    timezone: string;
}

export interface TVMazeEpisode {
    id: number;
    name: string;
    summary: string | null;
    season: number;
    number: number;
    runtime: number | null;
    airdate: string;
    airstamp: string;
    airtime: string;
    rating: {
        average: number | null;
    };
    image: {
        medium: string | null;
        original: string | null;
    } | null;
    show: TVMazeShow;
}

export interface TVMazeSchedule {
    id: number;
    name: string;
    date: string;
    season: number;
    number: number;
    runtime: number | null;
    show: TVMazeShow;
}

export interface TVMazeSearchResult {
    score: number;
    show: TVMazeShow;
}

export class TVMazeService {
    private static readonly BASE_URL = 'https://api.tvmaze.com';
    private static cache: Map<string, { data: any; expiry: number }> = new Map();
    private static readonly CACHE_DURATION = 3600000; // 1 hour

    /**
     * Get image URL
     */
    static getImageUrl(image: { medium: string | null; original?: string | null } | null, size: 'medium' | 'original' = 'medium'): string | null {
        if (!image) return null;
        if (size === 'original' && image.original) return image.original;
        return image.medium || null;
    }

    /**
     * Strip HTML from summary
     */
    static stripHtml(html: string | null): string {
        if (!html) return '';
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .trim();
    }

    /**
     * Search shows by query
     */
    static async searchShows(query: string): Promise<TVMazeSearchResult[]> {
        const cacheKey = `search_${query.toLowerCase()}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const url = `${this.BASE_URL}/search/shows?q=${encodeURIComponent(query)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TVMaze API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Get show by ID
     */
    static async getShow(showId: number): Promise<TVMazeShow> {
        const cacheKey = `show_${showId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const url = `${this.BASE_URL}/shows/${showId}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TVMaze API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Get show episodes
     */
    static async getShowEpisodes(showId: number): Promise<TVMazeEpisode[]> {
        const cacheKey = `episodes_${showId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const url = `${this.BASE_URL}/shows/${showId}/episodes`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TVMaze API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Get episodes by date
     */
    static async getEpisodesByDate(date: string): Promise<TVMazeSchedule[]> {
        const cacheKey = `schedule_${date}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const url = `${this.BASE_URL}/schedule?date=${date}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TVMaze API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data, 7200000); // 2 hours for schedule
        return data;
    }

    /**
     * Get today's schedule
     */
    static async getTodaySchedule(): Promise<TVMazeSchedule[]> {
        const today = new Date().toISOString().split('T')[0];
        return this.getEpisodesByDate(today);
    }

    /**
     * Get popular shows
     */
    static async getPopularShows(page: number = 0): Promise<TVMazeShow[]> {
        const cacheKey = `popular_${page}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const url = `${this.BASE_URL}/shows?page=${page}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TVMaze API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Get show by external ID (IMDb, TVRage, TheTVDB)
     */
    static async getShowByExternalId(externalSource: 'imdb' | 'tvrage' | 'thetvdb', externalId: string): Promise<TVMazeShow | null> {
        const cacheKey = `external_${externalSource}_${externalId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const url = `${this.BASE_URL}/lookup/shows?${externalSource}=${externalId}`;
        const response = await fetch(url);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`TVMaze API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Get show seasons
     */
    static async getShowSeasons(showId: number): Promise<any[]> {
        const cacheKey = `seasons_${showId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const url = `${this.BASE_URL}/shows/${showId}/seasons`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TVMaze API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Match channel to TVMaze show
     * Uses fuzzy matching on channel name
     */
    static async matchChannelToShow(channel: Channel): Promise<TVMazeShow | null> {
        try {
            // Extract show name from channel name
            const searchName = channel.name
                .replace(/\d+$/, '') // Remove trailing numbers
                .replace(/HD|SD|FHD|UHD|4K/g, '') // Remove quality tags
                .replace(/[^\w\s]/g, '') // Remove special chars
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();

            if (searchName.length < 2) return null;

            const results = await this.searchShows(searchName);

            if (results && results.length > 0) {
                // Return best match (highest score)
                return results[0].show;
            }

            return null;
        } catch (error) {
            console.error('TVMaze match error:', error);
            return null;
        }
    }

    /**
     * Get show cast
     */
    static async getShowCast(showId: number): Promise<any[]> {
        const cacheKey = `cast_${showId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const url = `${this.BASE_URL}/shows/${showId}/cast`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TVMaze API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    // Cache helpers
    private static getCached(key: string): any | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
        return null;
    }

    private static setCached(key: string, data: any, duration: number = this.CACHE_DURATION): void {
        this.cache.set(key, { data, expiry: Date.now() + duration });
    }

    static clearCache(): void {
        this.cache.clear();
    }
}
