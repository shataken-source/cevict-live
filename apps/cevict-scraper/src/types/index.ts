/**
 * Core types for CevictScraper
 */

export interface ProxyConfig {
  server: string;           // e.g. http://host:port
  username?: string;
  password?: string;
  rotate?: boolean;         // auto-rotate from pool
}

export interface SessionOptions {
  id: string;               // session key for cookie/storage persistence
  persist?: boolean;        // save to disk between runs
}

export interface BlockRules {
  resources?: Array<'image' | 'stylesheet' | 'font' | 'media' | 'other'>;
  domains?: string[];       // block specific domains (ads, trackers)
  patterns?: string[];      // URL patterns to block (regex strings)
}

export interface InfiniteScrollOptions {
  maxScrolls?: number;      // max scroll iterations (default 10)
  scrollDelay?: number;     // ms between scrolls (default 800)
  stopSelector?: string;    // stop when this selector appears
  itemSelector?: string;    // count items to detect new content
}

export interface CrawlOptions {
  startUrl: string;
  maxDepth?: number;        // link follow depth (default 2)
  maxPages?: number;        // total page cap (default 50)
  sameDomain?: boolean;     // only follow same-domain links (default true)
  urlPattern?: string;      // regex to filter which URLs to crawl
  scrapeOptions?: Partial<ScrapeOptions>;
}

export interface CrawlResult {
  success: boolean;
  startUrl: string;
  pagesVisited: number;
  results: ScrapeResult[];
  errors: Array<{ url: string; error: string }>;
  duration: number;
  timestamp: string;
}

export interface ScrapeOptions {
  url: string;
  waitFor?: string | number;
  selector?: string;
  screenshot?: boolean;
  fullPage?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  cookies?: Array<{ name: string; value: string; domain?: string }>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  proxy?: string | ProxyConfig;
  executeScript?: string;
  waitForNetworkIdle?: boolean;
  extractTable?: string;
  extractMultipleTables?: boolean;
  followRedirects?: boolean;
  blockRules?: BlockRules;
  infiniteScroll?: InfiniteScrollOptions;
  session?: SessionOptions;
  stealth?: boolean;        // enable stealth mode (default true)
  cache?: boolean;          // use response cache
  cacheTTL?: number;        // cache TTL in ms
  extractLinks?: boolean;   // extract all links from page
  extractImages?: boolean;  // extract all image URLs
  extractJson?: boolean;    // try to extract JSON-LD / __NEXT_DATA__ etc
  waitForSelector?: string; // alias for waitFor when string
  clickBefore?: string;     // click this selector before extracting
  typeInto?: { selector: string; text: string }; // type into field before extracting
  humanize?: boolean;       // add human-like delays and mouse movements
}

export interface ScrapeResult {
  success: boolean;
  url: string;
  finalUrl?: string;        // after redirects
  statusCode?: number;
  html?: string;
  text?: string;
  title?: string;
  screenshot?: Buffer;
  metadata?: PageMetadata;
  scriptResult?: any;
  tableData?: TableExtractResult;
  allTables?: TableExtractResult[];
  links?: string[];
  images?: string[];
  jsonData?: any;           // extracted JSON-LD / structured data
  error?: string;
  retryCount?: number;
  cached?: boolean;
  duration: number;
  timestamp: string;
}

export interface PageMetadata {
  title: string;
  description?: string;
  keywords?: string[];
  author?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  publishDate?: string;
  modifiedDate?: string;
  language?: string;
  robots?: string;
  structuredData?: any[];   // JSON-LD blocks
}

export interface ExtractOptions {
  selector: string;
  attribute?: string;
  multiple?: boolean;
  type?: 'text' | 'html' | 'attribute' | 'href' | 'src' | 'table' | 'json' | 'value';
  transform?: string;       // JS expression to transform result e.g. "x => x.trim()"
}

export interface MultiExtractOptions {
  url: string;
  fields: Record<string, ExtractOptions>;
  scrapeOptions?: Partial<ScrapeOptions>;
}

export interface MultiExtractResult {
  success: boolean;
  url: string;
  data: Record<string, any>;
  errors: Record<string, string>;
  duration: number;
  timestamp: string;
}

export interface TableExtractResult {
  headers: string[];
  rows: string[][];
  rowCount: number;
  objects?: Record<string, string>[];  // rows as key-value objects using headers
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
  pressEnter?: boolean;
}

export interface ClickOptions {
  selector: string;
  waitForNavigation?: boolean;
  timeout?: number;
  force?: boolean;
  position?: { x: number; y: number };
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
  proxies?: ProxyConfig[];
}

export interface ScrapingJob {
  id: string;
  type: 'scrape' | 'extract' | 'form' | 'click' | 'scroll' | 'screenshot' | 'crawl';
  options: ScrapeOptions | ExtractOptions | FormFillOptions | ClickOptions | ScrollOptions | CrawlOptions;
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
  cacheHits: number;
  cacheMisses: number;
  blockedRequests: number;
  bytesTransferred: number;
}

export interface ScrapingConfig {
  maxConcurrentJobs: number;
  jobTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  defaultViewport: { width: number; height: number };
  defaultUserAgent: string;
  respectRobotsTxt: boolean;
  rateLimitPerDomain: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  stealthMode: boolean;
  blockAds: boolean;
  maxQueueSize: number;
}

export interface CacheEntry {
  result: ScrapeResult;
  expiresAt: number;
}

export interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}
