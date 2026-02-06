/**
 * PetReunion API Fetcher
 * 
 * Fetches lost/found pet stories from PetReunion API
 */

const https = require('https');
const http = require('http');

class PetReunionFetcher {
  constructor(apiUrl = 'https://petreunion.com/api/latest') {
    this.apiUrl = apiUrl;
  }

  /**
   * Fetch latest stories from PetReunion API
   * @param {number} maxStories - Maximum number of stories to fetch
   * @returns {Promise<Array>} Array of story objects
   */
  async fetchLatestStories(maxStories = 5) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.apiUrl);
      const protocol = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'TikTok-Automation/1.0',
          'Accept': 'application/json',
        },
      };

      const req = protocol.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const stories = JSON.parse(data);
            
            // Handle both array and object responses
            const storyArray = Array.isArray(stories) ? stories : (stories.stories || stories.data || []);
            
            // Limit to maxStories
            const limited = storyArray.slice(0, maxStories);
            
            resolve(limited);
          } catch (error) {
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`API request failed: ${error.message}`));
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('API request timeout'));
      });

      req.end();
    });
  }

  /**
   * Format story for video generation
   * @param {object} story - Story object from API
   * @returns {object} Formatted story with required fields
   */
  formatStoryForVideo(story) {
    return {
      id: story.id || story._id || Date.now().toString(),
      title: story.title || story.name || 'Lost Pet Alert',
      description: story.description || story.details || '',
      location: story.location || story.city || 'Unknown',
      petType: story.petType || story.type || 'Pet',
      date: story.date || story.createdAt || new Date().toISOString(),
      images: story.images || story.photos || [],
      contact: story.contact || story.phone || '',
      status: story.status || 'missing', // missing, found, reunited
      raw: story, // Keep original for reference
    };
  }
}

module.exports = PetReunionFetcher;
