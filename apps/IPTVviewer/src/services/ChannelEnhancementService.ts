import { Channel } from '@/types';
import { TMDBService, TMDbTVShow } from './TMDBService';
import { TVMazeService, TVMazeShow } from './TVMazeService';

export interface EnhancedChannel extends Channel {
    tmdbShow?: TMDbTVShow;
    tvmazeShow?: TVMazeShow;
    posterUrl?: string;
    rating?: number;
    overview?: string;
    genres?: string[];
    isEnhanced: boolean;
}

export interface EnhancementResult {
    channel: Channel;
    enhanced: EnhancedChannel;
    source: 'tmdb' | 'tvmaze' | 'none';
}

export class ChannelEnhancementService {
    private static cache: Map<string, EnhancedChannel> = new Map();
    private static readonly CACHE_DURATION = 86400000; // 24 hours

    /**
     * Enhance a single channel with external API data
     */
    static async enhanceChannel(channel: Channel): Promise<EnhancedChannel> {
        // Check cache first
        const cached = this.cache.get(channel.id);
        if (cached && cached.isEnhanced) {
            return cached;
        }

        const enhanced: EnhancedChannel = {
            ...channel,
            isEnhanced: false,
        };

        try {
            // Try TVMaze first (no API key needed)
            const tvmazeShow = await TVMazeService.matchChannelToShow(channel);
            if (tvmazeShow) {
                enhanced.tvmazeShow = tvmazeShow;
                enhanced.posterUrl = TVMazeService.getImageUrl(tvmazeShow.image) || undefined;
                enhanced.rating = tvmazeShow.rating.average || undefined;
                enhanced.overview = TVMazeService.stripHtml(tvmazeShow.summary);
                enhanced.genres = tvmazeShow.genres;
                enhanced.isEnhanced = true;

                this.cache.set(channel.id, enhanced);
                return enhanced;
            }

            // Fall back to TMDb if API key is configured
            if (TMDBService.isConfigured()) {
                const tmdbShow = await TMDBService.matchChannelToShow(channel);
                if (tmdbShow) {
                    enhanced.tmdbShow = tmdbShow;
                    enhanced.posterUrl = TMDBService.getPosterUrl(tmdbShow.poster_path) || undefined;
                    enhanced.rating = tmdbShow.vote_average || undefined;
                    enhanced.overview = tmdbShow.overview;
                    enhanced.genres = tmdbShow.genre_ids?.map(id => TMDBService.getGenreName(id, true));
                    enhanced.isEnhanced = true;

                    this.cache.set(channel.id, enhanced);
                    return enhanced;
                }
            }
        } catch (error) {
            console.error(`Error enhancing channel ${channel.name}:`, error);
        }

        // Return unenhanced channel
        this.cache.set(channel.id, enhanced);
        return enhanced;
    }

    /**
     * Enhance multiple channels
     */
    static async enhanceChannels(
        channels: Channel[],
        onProgress?: (current: number, total: number) => void
    ): Promise<EnhancedChannel[]> {
        const results: EnhancedChannel[] = [];
        const limit = 5; // Rate limit requests
        const delay = 1000; // 1 second between batches

        for (let i = 0; i < channels.length; i += limit) {
            const batch = channels.slice(i, i + limit);

            const batchResults = await Promise.all(
                batch.map(channel => this.enhanceChannel(channel))
            );

            results.push(...batchResults);

            if (onProgress) {
                onProgress(Math.min(i + limit, channels.length), channels.length);
            }

            // Rate limiting delay
            if (i + limit < channels.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return results;
    }

    /**
     * Get all enhanced channels from cache
     */
    static getCachedChannels(): EnhancedChannel[] {
        return Array.from(this.cache.values());
    }

    /**
     * Clear enhancement cache
     */
    static clearCache(): void {
        this.cache.clear();
    }

    /**
     * Search enhanced channels
     */
    static searchChannels(query: string): EnhancedChannel[] {
        const lowercaseQuery = query.toLowerCase();
        return Array.from(this.cache.values()).filter(
            channel =>
                channel.name.toLowerCase().includes(lowercaseQuery) ||
                channel.overview?.toLowerCase().includes(lowercaseQuery) ||
                channel.genres?.some(g => g.toLowerCase().includes(lowercaseQuery))
        );
    }

    /**
     * Get channels by genre
     */
    static getChannelsByGenre(genre: string): EnhancedChannel[] {
        return Array.from(this.cache.values()).filter(
            channel => channel.genres?.some(g => g.toLowerCase() === genre.toLowerCase())
        );
    }

    /**
     * Get top rated channels
     */
    static getTopRatedChannels(limit: number = 10): EnhancedChannel[] {
        return Array.from(this.cache.values())
            .filter(c => c.rating && c.rating > 0)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, limit);
    }
}
