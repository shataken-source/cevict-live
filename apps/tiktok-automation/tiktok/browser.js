/**
 * TikTok Browser Automation
 * 
 * Playwright-based browser automation for TikTok operations
 */

const { chromium } = require('playwright');
const CookieManager = require('../auth/cookie-manager');
const { resolveProjectPath } = require('../config/loader');
const { retry } = require('../services/retry');

class TikTokBrowser {
  constructor(config, accountConfig) {
    this.config = config;
    this.accountConfig = accountConfig;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Initialize browser with saved cookies if available
   */
  async initialize() {
    const browserConfig = {
      headless: this.config.tiktok.headless !== false,
      slowMo: this.config.tiktok.slowMoMs || 50,
    };

    this.browser = await chromium.launch(browserConfig);
    
    // Create context with saved cookies
    const cookies = CookieManager.loadCookies(this.accountConfig.cookiesFile);
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    if (cookies) {
      await this.context.addCookies(cookies);
      console.log(`✅ Loaded cookies for account: ${this.accountConfig.id}`);
    }

    this.page = await this.context.newPage();
    this.page.setDefaultNavigationTimeout(this.config.tiktok.navigationTimeoutMs || 60000);
  }

  /**
   * Navigate to TikTok login page
   */
  async goToLogin() {
    await this.page.goto('https://www.tiktok.com/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for manual login (user logs in manually in browser)
   * @param {number} timeoutMs - Timeout in milliseconds (default: 5 minutes)
   */
  async waitForLogin(timeoutMs = 5 * 60 * 1000) {
    console.log('⏳ Please log in to TikTok in the browser window...');
    console.log('   Waiting for login to complete...');

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      // Check if we're on a logged-in page (not login page)
      const url = this.page.url();
      
      if (!url.includes('/login') && !url.includes('/signup')) {
        // Check for logged-in indicators
        try {
          // Look for profile button or username indicator
          const loggedIn = await this.page.evaluate(() => {
            return document.querySelector('[data-e2e="profile-icon"]') !== null ||
                   document.querySelector('a[href*="/@"]') !== null;
          });

          if (loggedIn) {
            console.log('✅ Login detected!');
            
            // Save cookies
            const cookies = await this.context.cookies();
            await CookieManager.saveCookies(this.accountConfig.cookiesFile, cookies);
            console.log(`✅ Cookies saved to: ${this.accountConfig.cookiesFile}`);
            
            return true;
          }
        } catch (error) {
          // Continue checking
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2 seconds
    }

    throw new Error('Login timeout - please try again');
  }

  /**
   * Navigate to upload page
   */
  async goToUpload() {
    await this.page.goto('https://www.tiktok.com/upload');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Upload video file
   * @param {string} videoPath - Path to video file
   * @param {string} caption - Video caption
   */
  async uploadVideo(videoPath, caption) {
    const absoluteVideoPath = resolveProjectPath(videoPath);
    
    if (!require('fs').existsSync(absoluteVideoPath)) {
      throw new Error(`Video file not found: ${absoluteVideoPath}`);
    }
    
    console.log(`📤 Uploading video: ${absoluteVideoPath}`);
    
    // Retry upload with exponential backoff
    return retry(async () => {
      // Wait for file input (try multiple selectors as TikTok UI changes)
      const fileInputSelectors = [
        'input[type="file"]',
        'input[accept*="video"]',
        'input[data-e2e="upload-file-input"]',
      ];

      let fileInput = null;
      for (const selector of fileInputSelectors) {
        try {
          fileInput = await this.page.waitForSelector(selector, { timeout: 5000 });
          if (fileInput) break;
        } catch (e) {
          // Try next selector
        }
      }

      if (!fileInput) {
        throw new Error('Could not find file input - TikTok UI may have changed');
      }
      
      // Upload file
      await fileInput.setInputFiles(absoluteVideoPath);
      console.log('✅ Video file selected');

      // Wait for video to process (TikTok needs time to process)
      await this.page.waitForTimeout(8000);

      // Enter caption (try multiple selectors)
      if (caption) {
        const captionSelectors = [
          'div[contenteditable="true"][data-text]',
          'div[contenteditable="true"]',
          'textarea[placeholder*="caption"]',
          'div[data-e2e="caption"]',
        ];

        let captionElement = null;
        for (const selector of captionSelectors) {
          try {
            captionElement = await this.page.waitForSelector(selector, { timeout: 5000 });
            if (captionElement) break;
          } catch (e) {
            // Try next selector
          }
        }

        if (captionElement) {
          await captionElement.click();
          await this.page.keyboard.press('Control+A');
          await this.page.type(captionSelectors[0], caption, { delay: 50 });
          console.log('✅ Caption entered');
        } else {
          console.warn('⚠️  Could not find caption input - video will post without caption');
        }
      }

      // Click post button (try multiple selectors)
      const postButtonSelectors = [
        'button[data-e2e="publish-button"]',
        'button:has-text("Post")',
        'button:has-text("Publish")',
        'button[type="submit"]',
      ];

      let postButton = null;
      for (const selector of postButtonSelectors) {
        try {
          postButton = await this.page.waitForSelector(selector, { timeout: 5000 });
          if (postButton) break;
        } catch (e) {
          // Try next selector
        }
      }

      if (!postButton) {
        throw new Error('Could not find post button - TikTok UI may have changed');
      }

      await postButton.click();
      console.log('✅ Post button clicked');

      // Wait for upload to complete (check for URL change or success indicator)
      await this.page.waitForTimeout(15000);
      
      // Check for success indicators
      const url = this.page.url();
      const hasSuccess = url.includes('/video/') || 
                        !url.includes('/upload') ||
                        await this.page.evaluate(() => {
                          return document.querySelector('[data-e2e="upload-success"]') !== null ||
                                 document.textContent.includes('posted');
                        });

      if (hasSuccess) {
        console.log('✅ Video uploaded successfully!');
        return true;
      }

      throw new Error('Upload may have failed - check browser for errors');
    }, {
      maxRetries: 2,
      initialDelay: 3000,
      retryable: (error) => {
        // Retry on network errors, timeout errors
        return error.message.includes('timeout') || 
               error.message.includes('network') ||
               error.message.includes('Could not find');
      },
    });
  }

  /**
   * Get comments for a video
   * @param {string} videoUrl - TikTok video URL
   * @returns {Promise<Array>} Array of comment objects
   */
  async getComments(videoUrl) {
    await this.page.goto(videoUrl);
    await this.page.waitForLoadState('networkidle');

    // Scroll to load comments
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.page.waitForTimeout(2000);

    // Extract comments (TikTok UI selectors - may need updating)
    const comments = await this.page.evaluate(() => {
      const commentElements = document.querySelectorAll('[data-e2e="comment-level-1"]');
      return Array.from(commentElements).slice(0, 20).map(el => {
        const textEl = el.querySelector('[data-e2e="comment-level-1"] p');
        const authorEl = el.querySelector('a[href*="/@"]');
        return {
          id: el.getAttribute('data-comment-id') || Date.now().toString(),
          text: textEl?.textContent?.trim() || '',
          author: authorEl?.textContent?.trim() || 'Unknown',
          timestamp: new Date().toISOString(),
        };
      });
    });

    return comments;
  }

  /**
   * Reply to a comment
   * @param {string} commentId - Comment ID
   * @param {string} replyText - Reply text
   */
  async replyToComment(commentId, replyText) {
    // Find comment and click reply
    const commentSelector = `[data-comment-id="${commentId}"]`;
    const commentElement = await this.page.waitForSelector(commentSelector, { timeout: 10000 });
    
    // Click reply button
    const replyButton = await commentElement.$('button[data-e2e="reply-button"]');
    if (replyButton) {
      await replyButton.click();
      await this.page.waitForTimeout(1000);

      // Type reply
      const replyInput = await this.page.waitForSelector('textarea[placeholder*="reply"]', { timeout: 5000 });
      await replyInput.fill(replyText);
      await this.page.waitForTimeout(500);

      // Submit reply
      const submitButton = await this.page.waitForSelector('button[data-e2e="reply-submit-button"]', { timeout: 5000 });
      await submitButton.click();
      await this.page.waitForTimeout(2000);

      console.log(`✅ Replied to comment: ${commentId}`);
      return true;
    }

    throw new Error(`Could not find reply button for comment: ${commentId}`);
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = TikTokBrowser;
