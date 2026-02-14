// News API types
export interface NewsArticle {
    source: {
        id: string | null;
        name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
}

export interface NewsResponse {
    status: string;
    totalResults: number;
    articles: NewsArticle[];
}

export interface NewsCategory {
    id: string;
    name: string;
    icon: string;
}

export const NEWS_CATEGORIES: NewsCategory[] = [
    { id: 'general', name: 'General', icon: '📰' },
    { id: 'technology', name: 'Technology', icon: '💻' },
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'health', name: 'Health', icon: '🏥' },
];

export class NewsService {
    private static readonly NEWS_API_BASE = 'https://newsapi.org/v2';
    private static readonly GNEWS_BASE = 'https://gnews.io/api/v4';
    private static cache: Map<string, { data: NewsArticle[]; expiry: number }> = new Map();
    private static readonly CACHE_DURATION = 900000; // 15 minutes

    // Configuration
    private static newsApiKey: string = '';
    private static gnewsApiKey: string = '';

    /**
     * Configure News API keys
     */
    static setNewsApiKey(key: string): void {
        this.newsApiKey = key;
    }

    static setGnewsApiKey(key: string): void {
        this.gnewsApiKey = key;
    }

    static isNewsApiConfigured(): boolean {
        return !!this.newsApiKey;
    }

    static isGnewsConfigured(): boolean {
        return !!this.gnewsApiKey;
    }

    /**
     * Get top headlines using NewsAPI
     */
    static async getTopHeadlines(
        category: string = 'general',
        country: string = 'us'
    ): Promise<NewsArticle[]> {
        const cacheKey = `headlines_${category}_${country}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.newsApiKey) {
            // Fall back to GNews
            return this.getGnewsTopHeadlines(category);
        }

        try {
            const url = `${this.NEWS_API_BASE}/top-headlines?country=${country}&category=${category}&apiKey=${this.newsApiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`NewsAPI error: ${response.status}`);
            }

            const data: NewsResponse = await response.json();
            this.setCached(cacheKey, data.articles);
            return data.articles;
        } catch (error) {
            console.error('NewsAPI error:', error);
            // Fall back to GNews
            return this.getGnewsTopHeadlines(category);
        }
    }

    /**
     * Get headlines using GNews API (fallback)
     */
    static async getGnewsTopHeadlines(category: string = 'general'): Promise<NewsArticle[]> {
        const cacheKey = `gnews_${category}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        if (!this.gnewsApiKey) {
            // Return sample data if no API key
            return this.getSampleNews();
        }

        try {
            const endpoint = category === 'general' ? 'top-headlines' : `search`;
            const query = category === 'general' ? '' : `q=${category}`;
            const url = `${this.GNEWS_BASE}/${endpoint}?${query}&lang=en&max=10&apikey=${this.gnewsApiKey}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`GNews error: ${response.status}`);
            }

            const data = await response.json();

            // Transform GNews format to our format
            const articles: NewsArticle[] = (data.articles || []).map((article: any) => ({
                source: { id: null, name: article.source.name },
                author: article.author,
                title: article.title,
                description: article.description,
                url: article.url,
                urlToImage: article.image,
                publishedAt: article.publishedAt,
                content: article.content,
            }));

            this.setCached(cacheKey, articles);
            return articles;
        } catch (error) {
            console.error('GNews error:', error);
            return this.getSampleNews();
        }
    }

    /**
     * Search news
     */
    static async searchNews(query: string): Promise<NewsArticle[]> {
        const cacheKey = `search_${query.toLowerCase()}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        // Use GNews for search (more flexible)
        if (this.gnewsApiKey) {
            try {
                const url = `${this.GNEWS_BASE}/search?q=${encodeURIComponent(query)}&lang=en&max=20&apikey=${this.gnewsApiKey}`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();
                    const articles: NewsArticle[] = (data.articles || []).map((article: any) => ({
                        source: { id: null, name: article.source.name },
                        author: article.author,
                        title: article.title,
                        description: article.description,
                        url: article.url,
                        urlToImage: article.image,
                        publishedAt: article.publishedAt,
                        content: article.content,
                    }));

                    this.setCached(cacheKey, articles);
                    return articles;
                }
            } catch (error) {
                console.error('Search error:', error);
            }
        }

        return this.getSampleNews();
    }

    /**
     * Get breaking news (multiple categories at once)
     */
    static async getBreakingNews(): Promise<NewsArticle[]> {
        const categories = ['technology', 'sports', 'business', 'entertainment'];
        const allArticles: NewsArticle[] = [];

        for (const category of categories) {
            try {
                const articles = await this.getTopHeadlines(category);
                allArticles.push(...articles.slice(0, 3)); // Take top 3 from each
            } catch (e) {
                // Continue on error
            }
        }

        // Shuffle and return
        return allArticles.sort(() => Math.random() - 0.5);
    }

    /**
     * Sample news for demo purposes
     */
    private static getSampleNews(): NewsArticle[] {
        return [
            {
                source: { id: null, name: 'TechCrunch' },
                author: 'Tech Writer',
                title: 'Streaming Services Continue to Grow in Popularity',
                description: 'More viewers are cutting the cord and turning to streaming services for their entertainment needs.',
                url: 'https://example.com/news/1',
                urlToImage: null,
                publishedAt: new Date().toISOString(),
                content: 'The streaming industry continues to evolve...',
            },
            {
                source: { id: null, name: 'Variety' },
                author: 'Entertainment Reporter',
                title: 'New IPTV Technologies Revolutionize Home Entertainment',
                description: 'Advanced IPTV solutions are changing how we watch television.',
                url: 'https://example.com/news/2',
                urlToImage: null,
                publishedAt: new Date().toISOString(),
                content: 'The future of television is here...',
            },
            {
                source: { id: null, name: 'The Verge' },
                author: 'Technology Editor',
                title: 'Smart TV Features You Need to Know About',
                description: 'Modern smart TVs offer more features than ever before.',
                url: 'https://example.com/news/3',
                urlToImage: null,
                publishedAt: new Date().toISOString(),
                content: 'Smart TVs have come a long way...',
            },
        ];
    }

    // Cache helpers
    private static getCached(key: string): NewsArticle[] | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
        return null;
    }

    private static setCached(key: string, data: NewsArticle[]): void {
        this.cache.set(key, { data, expiry: Date.now() + this.CACHE_DURATION });
    }

    static clearCache(): void {
        this.cache.clear();
    }
}
