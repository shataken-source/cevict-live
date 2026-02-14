import { Channel } from '@/types';

// TMDB API types
export interface TMDbMovie {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    vote_average: number;
    vote_count: number;
    genre_ids: number[];
}

export interface TMDbTVShow {
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    first_air_date: string;
    vote_average: number;
    vote_count: number;
    genre_ids: number[];
}

export interface TMDbSearchResponse<T> {
    page: number;
    results: T[];
    total_pages: number;
    total_results: number;
}

export interface TMDbGenre {
    id: number;
    name: string;
}

export interface TMDbGenreResponse {
    genres: TMDbGenre[];
}

export interface TMDBConfig {
    apiKey: string;
    baseUrl: string;
    imageBaseUrl: string;
}

const DEFAULT_CONFIG: TMDBConfig = {
    apiKey: '',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
};

// Genre mapping for TV shows
const TV_GENRES: { [key: number]: string } = {
    10759: 'Action & Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    10762: 'Kids',
    9648: 'Mystery',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
    37: 'Western',
};

const MOVIE_GENRES: { [key: number]: string } = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
};

export class TMDBService {
    private static config: TMDBConfig = { ...DEFAULT_CONFIG };
    private static cache: Map<string, { data: any; expiry: number }> = new Map();
    private static readonly CACHE_DURATION = 3600000; // 1 hour

    /**
     * Configure TMDB with API key
     */
    static setApiKey(apiKey: string): void {
        this.config = { ...DEFAULT_CONFIG, apiKey };
    }

    static getApiKey(): string {
        return this.config.apiKey;
    }

    /**
     * Check if API is configured
     */
    static isConfigured(): boolean {
        return !!this.config.apiKey;
    }

    /**
     * Get poster image URL
     */
    static getPosterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342'): string | null {
        if (!path) return null;
        return `${this.config.imageBaseUrl}/${size}${path}`;
    }

    /**
     * Get backdrop image URL
     */
    static getBackdropUrl(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780'): string | null {
        if (!path) return null;
        return `${this.config.imageBaseUrl}/${size}${path}`;
    }

    /**
     * Get genre name from ID
     */
    static getGenreName(genreId: number, isTV: boolean = false): string {
        const genres = isTV ? TV_GENRES : MOVIE_GENRES;
        return genres[genreId] || 'Unknown';
    }

    /**
     * Search for movies
     */
    static async searchMovies(query: string, page: number = 1): Promise<TMDbSearchResponse<TMDbMovie>> {
        const cacheKey = `movie_search_${query}_${page}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.isConfigured()) {
            throw new Error('TMDB API key not configured');
        }

        const url = `${this.config.baseUrl}/search/movie?api_key=${this.config.apiKey}&query=${encodeURIComponent(query)}&page=${page}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Search for TV shows
     */
    static async searchTVShows(query: string, page: number = 1): Promise<TMDbSearchResponse<TMDbTVShow>> {
        const cacheKey = `tv_search_${query}_${page}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.isConfigured()) {
            throw new Error('TMDB API key not configured');
        }

        const url = `${this.config.baseUrl}/search/tv?api_key=${this.config.apiKey}&query=${encodeURIComponent(query)}&page=${page}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Get TV show details
     */
    static async getTVShowDetails(tvId: number): Promise<TMDbTVShow> {
        const cacheKey = `tv_${tvId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.isConfigured()) {
            throw new Error('TMDB API key not configured');
        }

        const url = `${this.config.baseUrl}/tv/${tvId}?api_key=${this.config.apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Get movie details
     */
    static async getMovieDetails(movieId: number): Promise<TMDbMovie> {
        const cacheKey = `movie_${movieId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.isConfigured()) {
            throw new Error('TMDB API key not configured');
        }

        const url = `${this.config.baseUrl}/movie/${movieId}?api_key=${this.config.apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Get popular TV shows
     */
    static async getPopularTVShows(page: number = 1): Promise<TMDbSearchResponse<TMDbTVShow>> {
        const cacheKey = `popular_tv_${page}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.isConfigured()) {
            throw new Error('TMDB API key not configured');
        }

        const url = `${this.config.baseUrl}/tv/popular?api_key=${this.config.apiKey}&page=${page}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Get popular movies
     */
    static async getPopularMovies(page: number = 1): Promise<TMDbSearchResponse<TMDbMovie>> {
        const cacheKey = `popular_movies_${page}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.isConfigured()) {
            throw new Error('TMDB API key not configured');
        }

        const url = `${this.config.baseUrl}/movie/popular?api_key=${this.config.apiKey}&page=${page}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data);
        return data;
    }

    /**
     * Match channel to TMDB show
     * Uses fuzzy matching on channel name
     */
    static async matchChannelToShow(channel: Channel): Promise<TMDbTVShow | null> {
        if (!this.isConfigured()) return null;

        try {
            // Extract show name from channel name
            const searchName = channel.name
                .replace(/\d+$/, '') // Remove trailing numbers
                .replace(/HD|SD|FHD|UHD|4K/g, '') // Remove quality tags
                .replace(/[^\w\s]/g, '') // Remove special chars
                .trim();

            if (searchName.length < 2) return null;

            const results = await this.searchTVShows(searchName);

            if (results.results && results.results.length > 0) {
                // Return first match
                return results.results[0];
            }

            return null;
        } catch (error) {
            console.error('TMDB match error:', error);
            return null;
        }
    }

    /**
     * Get trending content
     */
    static async getTrendingTV(): Promise<TMDbSearchResponse<TMDbTVShow>> {
        const cacheKey = 'trending_tv';
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.isConfigured()) {
            throw new Error('TMDB API key not configured');
        }

        const url = `${this.config.baseUrl}/trending/tv/week?api_key=${this.config.apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        this.setCached(cacheKey, data, 1800000); // 30 min cache for trending
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
