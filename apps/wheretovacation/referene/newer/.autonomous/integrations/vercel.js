/**
 * Vercel API Integration
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class VercelClient {
  constructor(config = {}) {
    this.token = config.token || process.env.VERCEL_TOKEN;
    this.teamId = config.teamId || process.env.VERCEL_TEAM_ID;
    this.projectId = config.projectId || process.env.VERCEL_PROJECT_ID;
    this.baseUrl = 'https://api.vercel.com';
  }

  /**
   * Load config from file
   */
  static loadConfig() {
    const configPath = path.join(__dirname, '../config/api-keys.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return new VercelClient(config.vercel);
    }
    return new VercelClient();
  }

  /**
   * Make API request
   */
  async request(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      };

      if (this.teamId) {
        url.searchParams.set('teamId', this.teamId);
      }

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(`Vercel API error: ${json.error?.message || body}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Get deployment status
   */
  async getDeployments(limit = 10) {
    const endpoint = `/v6/deployments${this.projectId ? `?projectId=${this.projectId}` : ''}&limit=${limit}`;
    return this.request('GET', endpoint);
  }

  /**
   * Get project info
   */
  async getProject() {
    if (!this.projectId) {
      throw new Error('Project ID required');
    }
    return this.request('GET', `/v9/projects/${this.projectId}`);
  }

  /**
   * Create deployment
   */
  async createDeployment(config) {
    return this.request('POST', '/v13/deployments', config);
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId) {
    return this.request('GET', `/v2/deployments/${deploymentId}/events`);
  }

  /**
   * Check if deployment is ready
   */
  async isDeploymentReady(deploymentId) {
    try {
      const deployment = await this.request('GET', `/v13/deployments/${deploymentId}`);
      return deployment.readyState === 'READY';
    } catch (error) {
      return false;
    }
  }
}

module.exports = VercelClient;












