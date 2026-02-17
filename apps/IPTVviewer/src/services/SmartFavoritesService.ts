import { Channel } from '@/types';

export interface FavoriteKeyword {
    id: string;
    keyword: string;
    category: string;
    isRegex?: boolean;
    priority: number; // Higher = checked first
}

export interface FavoriteCategory {
    id: string;
    name: string;
    color: string;
    keywords: FavoriteKeyword[];
    autoAdd: boolean;
}

export interface SmartFavoriteResult {
    channel: Channel;
    matchedKeywords: string[];
    matchedCategories: string[];
}

/**
 * Smart Favorites Service
 *
 * Automatically categorizes and favorites channels based on keywords.
 * Supports:
 * - Keyword matching (e.g., "Sports", "News")
 * - Regex patterns for advanced users
 * - Category organization
 * - Auto-discovery of similar channels
 */
class SmartFavoritesServiceImpl {
    private categories: FavoriteCategory[] = [];

    // Predefined smart categories with common keywords
    private defaultCategories: FavoriteCategory[] = [
        {
            id: 'sports',
            name: 'Sports',
            color: '#FF6B35',
            keywords: [
                { id: 's1', keyword: 'sports', category: 'sports', priority: 10 },
                { id: 's2', keyword: 'espn', category: 'sports', priority: 10 },
                { id: 's3', keyword: 'fox sports', category: 'sports', priority: 10 },
                { id: 's4', keyword: 'nbc sports', category: 'sports', priority: 10 },
                { id: 's5', keyword: 'cbs sports', category: 'sports', priority: 10 },
                { id: 's6', keyword: 'football', category: 'sports', priority: 8 },
                { id: 's7', keyword: 'basketball', category: 'sports', priority: 8 },
                { id: 's8', keyword: 'baseball', category: 'sports', priority: 8 },
                { id: 's9', keyword: 'hockey', category: 'sports', priority: 8 },
                { id: 's10', keyword: 'soccer', category: 'sports', priority: 7 },
                { id: 's11', keyword: 'nba', category: 'sports', priority: 9 },
                { id: 's12', keyword: 'nfl', category: 'sports', priority: 9 },
                { id: 's13', keyword: 'mlb', category: 'sports', priority: 9 },
                { id: 's14', keyword: 'nhl', category: 'sports', priority: 9 },
                { id: 's15', keyword: 'golf', category: 'sports', priority: 6 },
                { id: 's16', keyword: 'tennis', category: 'sports', priority: 6 },
            ],
            autoAdd: true,
        },
        {
            id: 'news',
            name: 'News',
            color: '#0066CC',
            keywords: [
                { id: 'n1', keyword: 'news', category: 'news', priority: 10 },
                { id: 'n2', keyword: 'cnn', category: 'news', priority: 10 },
                { id: 'n3', keyword: 'fox news', category: 'news', priority: 10 },
                { id: 'n4', keyword: 'msnbc', category: 'news', priority: 10 },
                { id: 'n5', keyword: 'bbc', category: 'news', priority: 10 },
                { id: 'n6', keyword: 'abc news', category: 'news', priority: 10 },
                { id: 'n7', keyword: 'cbs news', category: 'news', priority: 10 },
                { id: 'n8', keyword: 'weather', category: 'news', priority: 5 },
                { id: 'n9', keyword: 'headlines', category: 'news', priority: 8 },
            ],
            autoAdd: true,
        },
        {
            id: 'entertainment',
            name: 'Entertainment',
            color: '#9B59B6',
            keywords: [
                { id: 'e1', keyword: 'entertainment', category: 'entertainment', priority: 10 },
                { id: 'e2', keyword: 'tv shows', category: 'entertainment', priority: 10 },
                { id: 'e3', keyword: 'drama', category: 'entertainment', priority: 8 },
                { id: 'e4', keyword: 'comedy', category: 'entertainment', priority: 8 },
                { id: 'e5', keyword: 'reality', category: 'entertainment', priority: 7 },
                { id: 'e6', keyword: 'Bravo', category: 'entertainment', priority: 9 },
                { id: 'e7', keyword: 'E! ', category: 'entertainment', priority: 9 },
                { id: 'e8', keyword: 'VH1', category: 'entertainment', priority: 9 },
                { id: 'e9', keyword: 'TBS', category: 'entertainment', priority: 9 },
                { id: 'e10', keyword: 'TruTV', category: 'entertainment', priority: 9 },
            ],
            autoAdd: false,
        },
        {
            id: 'movies',
            name: 'Movies',
            color: '#E74C3C',
            keywords: [
                { id: 'm1', keyword: 'movie', category: 'movies', priority: 10 },
                { id: 'm2', keyword: 'cinema', category: 'movies', priority: 10 },
                { id: 'm3', keyword: 'hbo', category: 'movies', priority: 10 },
                { id: 'm4', keyword: 'showtime', category: 'movies', priority: 10 },
                { id: 'm5', keyword: 'starz', category: 'movies', priority: 10 },
                { id: 'm6', keyword: 'tcm', category: 'movies', priority: 9 },
                { id: 'm7', keyword: 'amc', category: 'movies', priority: 9 },
                { id: 'm8', keyword: ' IFC', category: 'movies', priority: 8 },
                { id: 'm9', keyword: 'syfy', category: 'movies', priority: 7 },
                { id: 'm10', keyword: 'horror', category: 'movies', priority: 7 },
            ],
            autoAdd: true,
        },
        {
            id: 'kids',
            name: 'Kids & Family',
            color: '#2ECC71',
            keywords: [
                { id: 'k1', keyword: 'kids', category: 'kids', priority: 10 },
                { id: 'k2', keyword: 'cartoon', category: 'kids', priority: 10 },
                { id: 'k3', keyword: 'disney', category: 'kids', priority: 10 },
                { id: 'k4', keyword: 'nickelodeon', category: 'kids', priority: 10 },
                { id: 'k5', keyword: 'cartoon network', category: 'kids', priority: 10 },
                { id: 'k6', keyword: 'disney channel', category: 'kids', priority: 10 },
                { id: 'k7', keyword: 'nick jr', category: 'kids', priority: 9 },
                { id: 'k8', keyword: 'boomerang', category: 'kids', priority: 8 },
                { id: 'k9', keyword: 'baby', category: 'kids', priority: 7 },
                { id: 'k10', keyword: 'family', category: 'kids', priority: 7 },
            ],
            autoAdd: true,
        },
        {
            id: 'music',
            name: 'Music',
            color: '#E91E63',
            keywords: [
                { id: 'mu1', keyword: 'music', category: 'music', priority: 10 },
                { id: 'mu2', keyword: 'mtv', category: 'music', priority: 10 },
                { id: 'mu3', keyword: 'vh1', category: 'music', priority: 10 },
                { id: 'mu4', keyword: 'bet', category: 'music', priority: 8 },
                { id: 'mu5', keyword: 'hip hop', category: 'music', priority: 8 },
                { id: 'mu6', keyword: 'country', category: 'music', priority: 7 },
                { id: 'mu7', keyword: 'rock', category: 'music', priority: 7 },
                { id: 'mu8', keyword: 'jazz', category: 'music', priority: 6 },
            ],
            autoAdd: false,
        },
        {
            id: 'international',
            name: 'International',
            color: '#00BCD4',
            keywords: [
                { id: 'i1', keyword: 'telemundo', category: 'international', priority: 10 },
                { id: 'i2', keyword: 'univision', category: 'international', priority: 10 },
                { id: 'i3', keyword: 'tv espanol', category: 'international', priority: 10 },
                { id: 'i4', keyword: 'canal', category: 'international', priority: 7 },
                { id: 'i5', keyword: 'france', category: 'international', priority: 6 },
                { id: 'i6', keyword: 'deutsche', category: 'international', priority: 6 },
                { id: 'i7', keyword: 'italiano', category: 'international', priority: 6 },
                { id: 'i8', keyword: 'asian', category: 'international', priority: 7 },
                { id: 'i9', keyword: 'korean', category: 'international', priority: 7 },
                { id: 'i10', keyword: 'chinese', category: 'international', priority: 7 },
            ],
            autoAdd: false,
        },
    ];

    constructor() {
        this.categories = [...this.defaultCategories];
    }

    /**
     * Search channels and auto-match based on keywords
     */
    smartMatch(channels: Channel[]): SmartFavoriteResult[] {
        const results: SmartFavoriteResult[] = [];

        channels.forEach(channel => {
            const channelName = channel.name.toLowerCase();
            const channelGroup = (channel.group || '').toLowerCase();
            const matchedKeywords: string[] = [];
            const matchedCategories: string[] = [];

            this.categories.forEach(category => {
                category.keywords.forEach(keyword => {
                    if (keyword.isRegex) {
                        try {
                            const regex = new RegExp(keyword.keyword, 'i');
                            if (regex.test(channelName) || regex.test(channelGroup)) {
                                matchedKeywords.push(keyword.keyword);
                                if (!matchedCategories.includes(category.name)) {
                                    matchedCategories.push(category.name);
                                }
                            }
                        } catch (e) {
                            // Invalid regex, skip
                        }
                    } else {
                        if (channelName.includes(keyword.keyword.toLowerCase()) ||
                            channelGroup.includes(keyword.keyword.toLowerCase())) {
                            matchedKeywords.push(keyword.keyword);
                            if (!matchedCategories.includes(category.name)) {
                                matchedCategories.push(category.name);
                            }
                        }
                    }
                });
            });

            if (matchedKeywords.length > 0) {
                results.push({
                    channel,
                    matchedKeywords,
                    matchedCategories,
                });
            }
        });

        // Sort by number of matches (most matches first)
        return results.sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);
    }

    /**
     * Add a custom keyword
     */
    addKeyword(categoryId: string, keyword: string): void {
        const category = this.categories.find(c => c.id === categoryId);
        if (category) {
            category.keywords.push({
                id: `custom-${Date.now()}`,
                keyword,
                category: categoryId,
                priority: 5, // Default priority for custom keywords
            });
        }
    }

    /**
     * Create a new custom category
     */
    createCategory(name: string, keywords: string[], color?: string): FavoriteCategory {
        const newCategory: FavoriteCategory = {
            id: `custom-${Date.now()}`,
            name,
            color: color || '#888888',
            keywords: keywords.map((kw, index) => ({
                id: `custom-kw-${Date.now()}-${index}`,
                keyword: kw,
                category: name,
                priority: 5,
            })),
            autoAdd: false,
        };
        this.categories.push(newCategory);
        return newCategory;
    }

    /**
     * Get all categories
     */
    getCategories(): FavoriteCategory[] {
        return [...this.categories];
    }

    /**
     * Export favorites configuration
     */
    exportConfig(): string {
        return JSON.stringify({
            version: '1.0',
            exportedAt: new Date().toISOString(),
            categories: this.categories,
        }, null, 2);
    }

    /**
     * Import favorites configuration
     */
    importConfig(configJson: string): boolean {
        try {
            const config = JSON.parse(configJson);
            if (config.categories && Array.isArray(config.categories)) {
                this.categories = config.categories;
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to import favorites config:', e);
            return false;
        }
    }

    /**
     * Generate shareable URL for favorites
     */
    generateShareUrl(baseUrl: string, userId: string): string {
        const config = this.exportConfig();
        const encoded = Buffer.from(config).toString('base64url');
        return `${baseUrl}/favorites/import?data=${encoded}&from=${userId}`;
    }

    /**
     * Import from share URL
     */
    importFromUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const data = urlObj.searchParams.get('data');
            if (data) {
                const decoded = Buffer.from(data, 'base64url').toString('utf-8');
                return this.importConfig(decoded);
            }
            return false;
        } catch (e) {
            console.error('Failed to import from URL:', e);
            return false;
        }
    }

    /**
     * Get suggested keywords based on user's watching habits
     */
    getSuggestions(watchedChannels: Channel[]): string[] {
        const channelNames = watchedChannels.map(c => c.name.toLowerCase());
        const suggestions: Set<string> = new Set();

        // Find common patterns
        channelNames.forEach(name => {
            this.categories.forEach(category => {
                category.keywords.forEach(keyword => {
                    if (!name.includes(keyword.keyword.toLowerCase())) {
                        // This keyword might be relevant
                        suggestions.add(keyword.keyword);
                    }
                });
            });
        });

        return Array.from(suggestions).slice(0, 20);
    }

    /**
     * Reset to default categories
     */
    resetToDefault(): void {
        this.categories = [...this.defaultCategories];
    }
}

export const SmartFavoritesService = new SmartFavoritesServiceImpl();
