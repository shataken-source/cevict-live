/**
 * GitHub API Integration
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class GitHubClient {
  constructor(config = {}) {
    this.token = config.token || process.env.GITHUB_TOKEN;
    this.owner = config.owner || process.env.GITHUB_OWNER;
    this.repo = config.repo || process.env.GITHUB_REPO;
    this.baseUrl = 'https://api.github.com';
  }

  /**
   * Load config from file
   */
  static loadConfig() {
    const configPath = path.join(__dirname, '../config/api-keys.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return new GitHubClient(config.github);
    }
    return new GitHubClient();
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
          'Authorization': `token ${this.token}`,
          'User-Agent': 'Autonomous-Dev-System',
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const json = body ? JSON.parse(body) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(`GitHub API error: ${json.message || body}`));
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
   * Get repository info
   */
  async getRepo() {
    return this.request('GET', `/repos/${this.owner}/${this.repo}`);
  }

  /**
   * Get latest commit
   */
  async getLatestCommit(branch = 'main') {
    return this.request('GET', `/repos/${this.owner}/${this.repo}/commits/${branch}`);
  }

  /**
   * Create a commit
   */
  async createCommit(message, files, branch = 'main') {
    // Get current tree
    const { commit: { tree: { sha: baseTree } } } = await this.getLatestCommit(branch);
    
    // Create blobs for files
    const blobs = await Promise.all(
      files.map(async (file) => {
        const content = Buffer.from(file.content).toString('base64');
        const blob = await this.request('POST', `/repos/${this.owner}/${this.repo}/git/blobs`, {
          content,
          encoding: 'base64'
        });
        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha
        };
      })
    );

    // Create tree
    const tree = await this.request('POST', `/repos/${this.owner}/${this.repo}/git/trees`, {
      base_tree: baseTree,
      tree: blobs
    });

    // Get current commit SHA
    const { sha: parentSha } = await this.getLatestCommit(branch);

    // Create commit
    const commit = await this.request('POST', `/repos/${this.owner}/${this.repo}/git/commits`, {
      message,
      tree: tree.sha,
      parents: [parentSha]
    });

    // Update ref
    await this.request('PATCH', `/repos/${this.owner}/${this.repo}/git/refs/heads/${branch}`, {
      sha: commit.sha
    });

    return commit;
  }

  /**
   * Get workflow runs
   */
  async getWorkflowRuns(workflowId = null) {
    const endpoint = workflowId
      ? `/repos/${this.owner}/${this.repo}/actions/workflows/${workflowId}/runs`
      : `/repos/${this.owner}/${this.repo}/actions/runs`;
    return this.request('GET', endpoint);
  }

  /**
   * Trigger workflow
   */
  async triggerWorkflow(workflowId, ref = 'main', inputs = {}) {
    return this.request('POST', `/repos/${this.owner}/${this.repo}/actions/workflows/${workflowId}/dispatches`, {
      ref,
      inputs
    });
  }

  /**
   * Get issues
   */
  async getIssues(state = 'open') {
    return this.request('GET', `/repos/${this.owner}/${this.repo}/issues?state=${state}`);
  }

  /**
   * Create issue
   */
  async createIssue(title, body, labels = []) {
    return this.request('POST', `/repos/${this.owner}/${this.repo}/issues`, {
      title,
      body,
      labels
    });
  }
}

module.exports = GitHubClient;












