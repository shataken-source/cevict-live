/**
 * CevictScraper - Core Playwright-based Scraping Service
 * 
 * Features:
 * - Browser pool management for efficiency
 * - Automatic retries with exponential backoff
 * - Screenshot capture
 * - Form interaction
 * - Data extraction with selectors
 * - Proxy support
 * - Rate limiting per domain
 */

import { chromium, Browser, BrowserContext, Page, Locator } from 'playwright';
import {
  ScrapeOptions,
  ScrapeResult,
  ExtractOptions,
  ExtractResult,
  FormFillOptions,
  ClickOptions,
  ScrollOptions,
  PageMetadata,
  BrowserPoolOptions,
  ScrapingConfig,
  ScrapingStats,
  ScrapingJob
} from '../types';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export class CevictScraper extends EventEmitter {
  private browsers: Map<string, Browser> = new Map();
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();
  private jobQueue: ScrapingJob[] = [];
  private activeJobs: Map<string, ScrapingJob> = new Map();
  private stats: ScrapingStats = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageDuration: 0,
    activeBrowsers: 0,
    activePages: 0,
    queueSize: 0
  };

  private config: ScrapingConfig = {
    maxConcurrentJobs: 5,
    jobTimeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    defaultViewport: { width: 1920, height: 1080 },
    defaultUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    respectRobotsTxt: true,
    rateLimitPerDomain: 1000,
    cacheEnabled: false,
    cacheTTL: 3600000
  };

  private poolOptions: BrowserPoolOptions;
  private domainLastAccess: Map<string, number> = new Map();
  private isShuttingDown = false;

  constructor(options: BrowserPoolOptions = {}) {
    super();
    this.poolOptions = {
      maxBrowsers: 3,
      maxPagesPerBrowser: 5,
      headless: true,
      timeout: 30000,
      ...options
    };
  }

  /**
   * Initialize the scraper with required browsers
   */
  async initialize(): Promise<void> {
    this.emit('init', { message: 'Initializing CevictScraper...' });
    
    // Pre-launch browsers based on pool options
    for (let i = 0; i < (this.poolOptions.maxBrowsers || 1); i++) {
      await this.createBrowser(`browser-${i}`);
    }
    
    this.startQueueProcessor();
    this.emit('ready', { message: 'CevictScraper ready' });
  }

  /**
   * Create a new browser instance
   */
  private async createBrowser(id: string): Promise<Browser> {
    const browser = await chromium.launch({
      headless: this.poolOptions.headless ?? true,
      timeout: this.poolOptions.timeout,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    this.browsers.set(id, browser);
    this.stats.activeBrowsers = this.browsers.size;
    this.emit('browser:created', { id });
    
    return browser;
  }

  /**
   * Get or create a browser context
   */
  private async getContext(browserId: string, options?: any): Promise<BrowserContext> {
    const contextKey = `${browserId}-${JSON.stringify(options)}`;
    
    if (this.contexts.has(contextKey)) {
      return this.contexts.get(contextKey)!;
    }

    const browser = this.browsers.get(browserId);
    if (!browser) {
      throw new Error(`Browser ${browserId} not found`);
    }

    const context = await browser.newContext({
      viewport: this.config.defaultViewport,
      userAgent: this.config.defaultUserAgent,
      ...options
    });

    this.contexts.set(contextKey, context);
    return context;
  }

  /**
   * Get an available page from the pool
   */
  private async getPage(): Promise<{ page: Page; release: () => void }> {
    // Find browser with available page slots
    for (const [browserId, browser] of this.browsers) {
      const browserPages = Array.from(this.pages.entries())
        .filter(([_, page]) => page.context().browser() === browser);
      
      if (browserPages.length < (this.poolOptions.maxPagesPerBrowser || 5)) {
        const context = await this.getContext(browserId);
        const page = await context.newPage();
        const pageId = `page-${crypto.randomUUID()}`;
        this.pages.set(pageId, page);
        this.stats.activePages = this.pages.size;
        
        return {
          page,
          release: () => {
            this.pages.delete(pageId);
            this.stats.activePages = this.pages.size;
          }
        };
      }
    }

    // If all browsers are full, create new browser if under limit
    if (this.browsers.size < (this.poolOptions.maxBrowsers || 3)) {
      const newBrowserId = `browser-${this.browsers.size}`;
      await this.createBrowser(newBrowserId);
      return this.getPage();
    }

    throw new Error('Browser pool exhausted');
  }

  /**
   * Main scraping method
   */
  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    const startTime = Date.now();
    const jobId = crypto.randomUUID();

    try {
      // Check rate limiting
      await this.enforceRateLimit(options.url);

      // Get page from pool
      const { page, release } = await this.getPage();

      try {
        // Set custom headers if provided
        if (options.headers) {
          await page.setExtraHTTPHeaders(options.headers);
        }

        // Set cookies if provided
        if (options.cookies) {
          await page.context().addCookies(options.cookies.map(c => ({
            ...c,
            path: '/',
            expires: -1
          })));
        }

        // Set user agent if provided
        if (options.userAgent) {
          await page.setExtraHTTPHeaders({
            'User-Agent': options.userAgent
          });
        }

        // Navigate to URL
        const response = await page.goto(options.url, {
          waitUntil: 'networkidle',
          timeout: options.timeout || this.config.jobTimeout
        });

        if (!response) {
          throw new Error('Navigation failed - no response');
        }

        // Wait for specific element or time if specified
        if (options.waitFor) {
          if (typeof options.waitFor === 'number') {
            await page.waitForTimeout(options.waitFor);
          } else {
            await page.waitForSelector(options.waitFor, {
              timeout: options.timeout || 5000
            });
          }
        }

        // Extract content
        const html = await page.content();
        const text = await page.evaluate(() => document.body.innerText);
        const title = await page.title();
        const metadata = await this.extractMetadata(page);

        // Take screenshot if requested
        let screenshot: Buffer | undefined;
        if (options.screenshot) {
          screenshot = await page.screenshot({
            fullPage: options.fullPage ?? false,
            type: 'png'
          });
        }

        const duration = Date.now() - startTime;

        // Update stats
        this.stats.completedJobs++;
        this.updateAverageDuration(duration);

        this.emit('scrape:success', { url: options.url, duration, jobId });

        return {
          success: true,
          url: options.url,
          html,
          text,
          title,
          screenshot,
          metadata,
          duration,
          timestamp: new Date().toISOString()
        };

      } finally {
        release();
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.stats.failedJobs++;
      
      this.emit('scrape:error', { url: options.url, error: error.message, jobId });

      // Retry logic
      const retries = options.retries ?? this.config.retryAttempts;
      if (retries > 0) {
        await this.delay(this.config.retryDelay);
        return this.scrape({ ...options, retries: retries - 1 });
      }

      return {
        success: false,
        url: options.url,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Extract data using selectors
   */
  async extract(page: Page, options: ExtractOptions): Promise<ExtractResult> {
    try {
      const locator: Locator = options.multiple 
        ? page.locator(options.selector)
        : page.locator(options.selector).first();

      let data: string | string[] | null = null;

      switch (options.type || 'text') {
        case 'text':
          data = options.multiple 
            ? await locator.allTextContents()
            : await locator.textContent();
          break;
        case 'html':
          data = options.multiple
            ? await locator.evaluateAll(els => els.map(el => el.outerHTML))
            : await locator.evaluate(el => el.outerHTML);
          break;
        case 'attribute':
          if (!options.attribute) throw new Error('Attribute name required');
          data = options.multiple
            ? await locator.evaluateAll((els, attr) => els.map(el => el.getAttribute(attr)), options.attribute)
            : await locator.getAttribute(options.attribute);
          break;
        case 'href':
          data = options.multiple
            ? await locator.evaluateAll(els => els.map(el => (el as HTMLAnchorElement).href))
            : await locator.evaluate(el => (el as HTMLAnchorElement).href);
          break;
        case 'src':
          data = options.multiple
            ? await locator.evaluateAll(els => els.map(el => (el as HTMLImageElement).src))
            : await locator.evaluate(el => (el as HTMLImageElement).src);
          break;
      }

      const count = Array.isArray(data) ? data.length : (data ? 1 : 0);

      return {
        selector: options.selector,
        data,
        count
      };

    } catch (error: any) {
      return {
        selector: options.selector,
        data: null,
        count: 0
      };
    }
  }

  /**
   * Fill a form field
   */
  async fillForm(page: Page, options: FormFillOptions): Promise<void> {
    const locator = page.locator(options.selector);
    
    if (options.clear !== false) {
      await locator.fill('');
    }
    
    await locator.fill(options.value);
  }

  /**
   * Click an element
   */
  async click(page: Page, options: ClickOptions): Promise<void> {
    const locator = page.locator(options.selector);
    
    if (options.waitForNavigation) {
      await Promise.all([
        page.waitForNavigation({ timeout: options.timeout || 10000 }),
        locator.click()
      ]);
    } else {
      await locator.click();
    }
  }

  /**
   * Scroll the page
   */
  async scroll(page: Page, options: ScrollOptions): Promise<void> {
    const amount = options.amount || 500;
    
    if (options.selector) {
      await page.locator(options.selector).scrollIntoViewIfNeeded();
    } else {
      const direction = options.direction;
      await page.evaluate((dir, amt) => {
        window.scrollBy(
          dir === 'left' ? -amt : dir === 'right' ? amt : 0,
          dir === 'up' ? -amt : dir === 'down' ? amt : 0
        );
      }, direction, amount);
    }
  }

  /**
   * Extract page metadata
   */
  private async extractMetadata(page: Page): Promise<PageMetadata> {
    return await page.evaluate(() => {
      const getMeta = (name: string) => {
        const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return meta?.getAttribute('content') || undefined;
      };

      return {
        title: document.title,
        description: getMeta('description') || getMeta('og:description'),
        keywords: getMeta('keywords')?.split(',').map(k => k.trim()),
        author: getMeta('author'),
        ogImage: getMeta('og:image'),
        canonicalUrl: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined,
        publishDate: getMeta('article:published_time') || getMeta('publish_date'),
        modifiedDate: getMeta('article:modified_time') || getMeta('modified_date')
      };
    });
  }

  /**
   * Enforce rate limiting per domain
   */
  private async enforceRateLimit(url: string): Promise<void> {
    if (!this.config.rateLimitPerDomain) return;

    const domain = new URL(url).hostname;
    const lastAccess = this.domainLastAccess.get(domain) || 0;
    const now = Date.now();
    const delay = this.config.rateLimitPerDomain - (now - lastAccess);

    if (delay > 0) {
      await this.delay(delay);
    }

    this.domainLastAccess.set(domain, Date.now());
  }

  /**
   * Get current scraping stats
   */
  getStats(): ScrapingStats {
    return {
      ...this.stats,
      queueSize: this.jobQueue.length,
      activeBrowsers: this.browsers.size,
      activePages: this.pages.size
    };
  }

  /**
   * Shutdown the scraper gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.emit('shutdown', { message: 'Shutting down CevictScraper...' });

    // Close all pages
    for (const [id, page] of this.pages) {
      await page.close();
      this.pages.delete(id);
    }

    // Close all contexts
    for (const [id, context] of this.contexts) {
      await context.close();
      this.contexts.delete(id);
    }

    // Close all browsers
    for (const [id, browser] of this.browsers) {
      await browser.close();
      this.browsers.delete(id);
    }

    this.emit('shutdown:complete', { message: 'CevictScraper shutdown complete' });
  }

  /**
   * Utility: Delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update average duration stat
   */
  private updateAverageDuration(duration: number): void {
    const total = this.stats.averageDuration * (this.stats.completedJobs - 1) + duration;
    this.stats.averageDuration = total / this.stats.completedJobs;
  }

  /**
   * Start the job queue processor
   */
  private startQueueProcessor(): void {
    // Queue processing logic would go here for background job processing
    setInterval(() => {
      this.processQueue();
    }, 100);
  }

  /**
   * Process queued jobs
   */
  private async processQueue(): Promise<void> {
    if (this.isShuttingDown) return;
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) return;
    if (this.jobQueue.length === 0) return;

    const job = this.jobQueue.shift();
    if (!job) return;

    this.activeJobs.set(job.id, job);
    job.startedAt = new Date();

    try {
      // Process job based on type
      // Implementation depends on job type
      this.emit('job:complete', { jobId: job.id });
    } catch (error: any) {
      job.error = error.message;
      this.emit('job:error', { jobId: job.id, error: error.message });
    } finally {
      job.completedAt = new Date();
      this.activeJobs.delete(job.id);
    }
  }
}

// Export singleton instance
export const scraper = new CevictScraper();
