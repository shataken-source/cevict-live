/**
 * Core types for CevictScraper
 */

export interface ScrapeOptions {
  url: string;
  waitFor?: string | number;
  selector?: string;
  screenshot?: boolean;
  fullPage?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
  }>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  proxy?: string;
  executeScript?: string; // JavaScript to execute on page
  waitForNetworkIdle?: boolean; // Wait for all network requests to complete
  extractTable?: string; // CSS selector for table to extract
  followRedirects?: boolean;
}

export interface ScrapeResult {
  success: boolean;
  url: string;
  html?: string;
  text?: string;
  title?: string;
  screenshot?: Buffer;
  metadata?: PageMetadata;
  scriptResult?: any; // Result from custom JavaScript execution
  tableData?: TableExtractResult; // Extracted table data
  error?: string;
  duration: number;
  timestamp: string;
}

export interface PageMetadata {
  title: string;
  description?: string;
  keywords?: string[];
  author?: string;
  ogImage?: string;
  canonicalUrl?: string;
  publishDate?: string;
  modifiedDate?: string;
}

export interface ExtractOptions {
  selector: string;
  attribute?: string;
  multiple?: boolean;
  type?: 'text' | 'html' | 'attribute' | 'href' | 'src' | 'table' | 'json';
}

export interface TableExtractResult {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

export interface ExtractResult {
  selector: string;
  data: string | string[] | null | TableExtractResult;
  count: number;
}

export interface FormFillOptions {
  selector: string;
  value: string;
  clear?: boolean;
}

export interface ClickOptions {
  selector: string;
  waitForNavigation?: boolean;
  timeout?: number;
}

export interface ScrollOptions {
  direction: 'up' | 'down' | 'left' | 'right';
  amount?: number;
  selector?: string;
}

export interface BrowserPoolOptions {
  maxBrowsers?: number;
  maxPagesPerBrowser?: number;
  headless?: boolean;
  timeout?: number;
  userDataDir?: string;
}

export interface ScrapingJob {
  id: string;
  type: 'scrape' | 'extract' | 'form' | 'click' | 'scroll' | 'screenshot';
  options: ScrapeOptions | ExtractOptions | FormFillOptions | ClickOptions | ScrollOptions;
  priority: 'high' | 'normal' | 'low';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: ScrapeResult;
  error?: string;
}

export interface ScrapingStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageDuration: number;
  activeBrowsers: number;
  activePages: number;
  queueSize: number;
}

export interface ScrapingConfig {
  maxConcurrentJobs: number;
  jobTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  defaultViewport: {
    width: number;
    height: number;
  };
  defaultUserAgent: string;
  respectRobotsTxt: boolean;
  rateLimitPerDomain: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}
