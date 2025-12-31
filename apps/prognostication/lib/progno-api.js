/**
 * PROGNO API Integration Layer
 * Connects to the PROGNO prediction system for sports betting insights
 */

export class PrognoAPI {
  constructor() {
    this.baseURL = process.env.PROGNO_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.PROGNO_API_KEY;
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * Get authentication headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Prognostication-Client/1.0'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Generate cache key for requests
   */
  getCacheKey(endpoint, params = {}) {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(cacheEntry) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < this.cacheTimeout;
  }

  /**
   * Make API request with caching
   */
  async request(endpoint, options = {}) {
    const cacheKey = this.getCacheKey(endpoint, options.params || {});

    // Check cache first
    if (this.isCacheValid(this.cache.get(cacheKey))) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const url = new URL(endpoint, this.baseURL);

      // Add query parameters
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
          }
        });
      }

      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: this.getHeaders(),
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`PROGNO API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;

    } catch (error) {
      console.error('[PROGNO API] Request failed:', error);
      throw error;
    }
  }

  /**
   * Get current sports predictions (using API v2.0)
   */
  async getPredictions(sport = 'all', limit = 50) {
    return this.request('/api/progno/v2', {
      params: { action: 'predictions', sport, limit }
    });
  }

  /**
   * Get predictions for specific game
   */
  async getGamePrediction(gameId) {
    return this.request(`/predictions/${gameId}`);
  }

  /**
   * Get predictions by confidence level
   */
  async getPredictionsByConfidence(minConfidence = 70, sport = 'all') {
    return this.request('/predictions', {
      params: { min_confidence: minConfidence, sport }
    });
  }

  /**
   * Get live predictions (real-time updates)
   */
  async getLivePredictions() {
    return this.request('/predictions/live');
  }

  /**
   * Get historical predictions for analysis
   */
  async getHistoricalPredictions(days = 30, sport = 'all') {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return this.request('/predictions/history', {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        sport
      }
    });
  }

  /**
   * Get prediction statistics and performance metrics
   */
  async getStatistics(timeframe = '30d') {
    return this.request('/statistics', {
      params: { timeframe }
    });
  }

  /**
   * Get available sports and leagues
   */
  async getAvailableSports() {
    return this.request('/sports');
  }

  /**
   * Submit a new prediction (for premium users)
   */
  async submitPrediction(predictionData) {
    return this.request('/predictions', {
      method: 'POST',
      body: predictionData
    });
  }

  /**
   * Get user's prediction history
   */
  async getUserPredictions(userId, limit = 100) {
    return this.request(`/users/${userId}/predictions`, {
      params: { limit }
    });
  }

  /**
   * Get trending predictions
   */
  async getTrendingPredictions(timeframe = '24h') {
    return this.request('/predictions/trending', {
      params: { timeframe }
    });
  }

  /**
   * Get premium predictions (high confidence)
   */
  async getPremiumPredictions(minConfidence = 90) {
    return this.request('/predictions/premium', {
      params: { min_confidence: minConfidence }
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get API health status (using API v2.0)
   */
  async getHealthStatus() {
    try {
      const response = await this.request('/api/progno/v2', {
        params: { action: 'health' }
      });
      return {
        status: 'healthy',
        ...response
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Export the appropriate API class based on environment
export const prognoAPI = new PrognoAPI();

export default prognoAPI;
