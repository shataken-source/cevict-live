/**
 * CevictScraper - Professional Playwright Scraping Service
 * No API key needed - pure browser automation
 */
import { chromium, Browser, BrowserContext, Page, Route } from 'playwright';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  ScrapeOptions, ScrapeResult, ExtractOptions, ExtractResult,
  MultiExtractOptions, MultiExtractResult, BrowserPoolOptions,
  ScrapingConfig, ScrapingStats, ScrapingJob, TableExtractResult,
  CrawlOptions, CrawlResult, CacheEntry, RateLimitEntry,
  ProxyConfig, BlockRules, PageMetadata,
} from '../types';

// ── UA pool ───────────────────────────────────────────────────────────────────
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36',
];

// ── Ad/tracker domains to block ───────────────────────────────────────────────
const AD_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'googletagmanager.com', 'google-analytics.com',
  'analytics.google.com', 'facebook.net', 'connect.facebook.net', 'ads.twitter.com',
  'amazon-adsystem.com', 'scorecardresearch.com', 'quantserve.com', 'outbrain.com',
  'taboola.com', 'criteo.com', 'rubiconproject.com', 'pubmatic.com', 'openx.net', 'adnxs.com',
  'adsrvr.org', 'moatads.com', 'hotjar.com', 'mouseflow.com', 'fullstory.com',
];

// Block heavy resource types by default for speed
const BLOCK_TYPES = ['image', 'stylesheet', 'font', 'media'];

const rua = () => UAS[Math.floor(Math.random() * UAS.length)];
const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const SESSION_DIR = path.join(process.cwd(), '.scraper-sessions');

export class CevictScraper extends EventEmitter {
  private browsers: Map<string, Browser> = new Map();
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();
  private activeJobs: Map<string, ScrapingJob> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private proxyIdx = 0;
  private isShuttingDown = false;

  private stats: ScrapingStats = {
    totalJobs: 0, completedJobs: 0, failedJobs: 0, averageDuration: 0,
    activeBrowsers: 0, activePages: 0, queueSize: 0,
    cacheHits: 0, cacheMisses: 0, blockedRequests: 0, bytesTransferred: 0,
  };

  private cfg: ScrapingConfig = {
    maxConcurrentJobs: 5, jobTimeout: 30000, retryAttempts: 3, retryDelay: 1000,
    defaultViewport: { width: 1920, height: 1080 }, defaultUserAgent: rua(),
    respectRobotsTxt: false, rateLimitPerDomain: 500,
    cacheEnabled: true, cacheTTL: 300_000,
    stealthMode: true, blockAds: true, maxQueueSize: 500,
  };

  private pool: BrowserPoolOptions;

  constructor(options: BrowserPoolOptions = {}) {
    super();
    this.pool = { maxBrowsers: 3, maxPagesPerBrowser: 8, headless: true, timeout: 30000, ...options };
    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  // ── Logging ──────────────────────────────────────────────────────────────────
  private log(lvl: string, msg: string) {
    const line = `[CevictScraper][${lvl.toUpperCase()}] ${msg}`;
    if (lvl === 'error') console.error(line);
    else if (lvl === 'warn') console.warn(line);
    else if (lvl === 'debug' && process.env.SCRAPER_DEBUG) console.log(line);
    else if (lvl === 'info') console.log(line);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  async initialize(): Promise<void> {
    this.log('info', 'Starting...');
    await this.mkBrowser('b0');
    this.cacheReaper();
    this.emit('ready', {});
    this.log('info', 'Ready');
  }

  // ── Browser pool ─────────────────────────────────────────────────────────────
  private async mkBrowser(id: string, proxy?: ProxyConfig): Promise<Browser> {
    const opts: any = {
      headless: this.pool.headless ?? true,
      timeout: this.pool.timeout,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-first-run', '--no-zygote', '--disable-gpu',
        '--window-size=1920,1080', '--disable-notifications',
      ],
    };
    if (proxy) opts.proxy = { server: proxy.server, username: proxy.username, password: proxy.password };
    const b = await chromium.launch(opts);
    this.browsers.set(id, b);
    this.stats.activeBrowsers = this.browsers.size;
    return b;
  }

  private nextProxy(): ProxyConfig | undefined {
    const p = this.pool.proxies;
    return p?.length ? p[this.proxyIdx++ % p.length] : undefined;
  }

  private async mkContext(bid: string, o: ScrapeOptions): Promise<{ ctx: BrowserContext; ck: string }> {
    const ua = o.userAgent || rua();
    const sid = o.session?.id;
    const ck = `${bid}-${sid || ua.slice(0, 20)}`;
    if (this.contexts.has(ck)) return { ctx: this.contexts.get(ck)!, ck };

    const browser = this.browsers.get(bid);
    if (!browser) throw new Error(`Browser ${bid} missing`);

    const co: any = {
      viewport: o.viewport || this.cfg.defaultViewport,
      userAgent: ua, locale: 'en-US', timezoneId: 'America/New_York',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24"',
        'sec-ch-ua-mobile': '?0', 'sec-ch-ua-platform': '"Windows"',
        ...(o.headers || {}),
      },
    };

    const px = typeof o.proxy === 'object' ? o.proxy as ProxyConfig : undefined;
    if (px) co.proxy = { server: px.server, username: px.username, password: px.password };

    if (sid && o.session?.persist) {
      const sf = path.join(SESSION_DIR, `${sid}.json`);
      if (fs.existsSync(sf)) { try { co.storageState = JSON.parse(fs.readFileSync(sf, 'utf8')); } catch { } }
    }

    const ctx = await browser.newContext(co);

    // Stealth overrides
    if (this.cfg.stealthMode || o.stealth !== false) {
      await ctx.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        (window as any).chrome = { runtime: {}, loadTimes: () => { }, csi: () => { } };
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
      });
    }

    this.contexts.set(ck, ctx);
    return { ctx, ck };
  }

  private async getPage(o: ScrapeOptions): Promise<{ page: Page; ck: string; release: () => Promise<void> }> {
    for (const [bid] of this.browsers) {
      const b = this.browsers.get(bid)!;
      const n = Array.from(this.pages.values()).filter(p => p.context().browser() === b).length;
      if (n < (this.pool.maxPagesPerBrowser || 8)) {
        const { ctx, ck } = await this.mkContext(bid, o);
        const page = await ctx.newPage();
        const pid = `p-${crypto.randomUUID()}`;
        this.pages.set(pid, page);
        this.stats.activePages = this.pages.size;
        return {
          page, ck,
          release: async () => { try { await page.close(); } catch { } this.pages.delete(pid); this.stats.activePages = this.pages.size; },
        };
      }
    }
    if (this.browsers.size < (this.pool.maxBrowsers || 3)) {
      await this.mkBrowser(`b${this.browsers.size}`, this.nextProxy());
      return this.getPage(o);
    }
    // Queue: wait for slot
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('Pool timeout 30s')), 30000);
      const iv = setInterval(async () => {
        for (const [bid] of this.browsers) {
          const b = this.browsers.get(bid)!;
          const n = Array.from(this.pages.values()).filter(p => p.context().browser() === b).length;
          if (n < (this.pool.maxPagesPerBrowser || 8)) {
            clearInterval(iv); clearTimeout(t); res(await this.getPage(o)); return;
          }
        }
      }, 200);
    });
  }

  // ── Rate limiting (token bucket) ──────────────────────────────────────────────
  private async rateLimit(url: string): Promise<void> {
    if (!this.cfg.rateLimitPerDomain) return;
    const host = new URL(url).hostname;
    const now = Date.now();
    const e = this.rateLimits.get(host) || { tokens: 10, lastRefill: now };
    e.tokens = Math.min(10, e.tokens + Math.floor((now - e.lastRefill) / this.cfg.rateLimitPerDomain));
    e.lastRefill = now;
    if (e.tokens <= 0) { await this.wait(this.cfg.rateLimitPerDomain); e.tokens = 1; }
    e.tokens--;
    this.rateLimits.set(host, e);
  }

  // ── Request interception ──────────────────────────────────────────────────────
  private async intercept(page: Page, rules?: BlockRules): Promise<void> {
    const types = rules?.resources || (this.cfg.blockAds ? BLOCK_TYPES : []);
    const domains = [...AD_DOMAINS, ...(rules?.domains || [])];
    const patterns = (rules?.patterns || []).map((p: string) => new RegExp(p));
    await page.route('**/*', (r: Route) => {
      const url = r.request().url();
      const type = r.request().resourceType();
      if (types.includes(type) || domains.some((d: string) => url.includes(d)) || patterns.some((p: RegExp) => p.test(url))) {
        this.stats.blockedRequests++;
        r.abort();
      } else {
        r.continue();
      }
    });
  }

  // ── Cache ─────────────────────────────────────────────────────────────────────
  private ck(o: ScrapeOptions) { return crypto.createHash('md5').update(`${o.url}|${o.executeScript || ''}|${o.selector || ''}`).digest('hex'); }
  private fromCache(o: ScrapeOptions): ScrapeResult | null {
    if (!this.cfg.cacheEnabled && !o.cache) return null;
    const e = this.cache.get(this.ck(o));
    if (!e) { this.stats.cacheMisses++; return null; }
    if (Date.now() > e.expiresAt) { this.cache.delete(this.ck(o)); this.stats.cacheMisses++; return null; }
    this.stats.cacheHits++;
    return { ...e.result, cached: true };
  }
  private toCache(o: ScrapeOptions, r: ScrapeResult) {
    if (!this.cfg.cacheEnabled && !o.cache) return;
    this.cache.set(this.ck(o), { result: r, expiresAt: Date.now() + (o.cacheTTL ?? this.cfg.cacheTTL) });
  }
  clearCache() { this.cache.clear(); }
  private cacheReaper() { setInterval(() => { const n = Date.now(); for (const [k, v] of this.cache) if (n > v.expiresAt) this.cache.delete(k); }, 60_000); }

  // ── Session ───────────────────────────────────────────────────────────────────
  private async saveSession(ck: string, sid: string) {
    const ctx = this.contexts.get(ck);
    if (!ctx) return;
    try { fs.writeFileSync(path.join(SESSION_DIR, `${sid}.json`), JSON.stringify(await ctx.storageState(), null, 2)); } catch { }
  }
  async deleteSession(sid: string) { const f = path.join(SESSION_DIR, `${sid}.json`); if (fs.existsSync(f)) fs.unlinkSync(f); }
  listSessions() { return fs.readdirSync(SESSION_DIR).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)); }

  // ── Infinite scroll ───────────────────────────────────────────────────────────
  private async infiniteScroll(page: Page, opts: any) {
    const max = opts.maxScrolls ?? 10, delay = opts.scrollDelay ?? 800;
    let prev = 0;
    for (let i = 0; i < max; i++) {
      if (opts.stopSelector && await page.$(opts.stopSelector)) break;
      if (opts.itemSelector) { const n = await page.locator(opts.itemSelector).count(); if (i > 0 && n === prev) break; prev = n; }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(delay);
    }
  }

  // ── Core scrape ───────────────────────────────────────────────────────────────
  async scrape(o: ScrapeOptions, retry = 0): Promise<ScrapeResult> {
    const t0 = Date.now();
    this.stats.totalJobs++;
    const hit = this.fromCache(o);
    if (hit) return hit;
    await this.rateLimit(o.url);
    const { page, ck, release } = await this.getPage(o);
    try {
      await this.intercept(page, o.blockRules);
      if (o.cookies?.length) await page.context().addCookies(o.cookies.map((c: any) => ({ ...c, path: '/', expires: -1 })));
      if (o.humanize) await this.wait(rnd(300, 900));
      const resp = await page.goto(o.url, { waitUntil: o.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded', timeout: o.timeout || this.cfg.jobTimeout });
      const statusCode = resp?.status();
      const finalUrl = page.url();
      const wt = o.waitForSelector || o.waitFor;
      if (wt) { if (typeof wt === 'number') await page.waitForTimeout(wt); else await page.waitForSelector(wt as string, { timeout: o.timeout || 10000 }).catch(() => { }); }
      if (o.clickBefore) { await page.locator(o.clickBefore).first().click({ timeout: 5000 }).catch(() => { }); await page.waitForTimeout(500); }
      if (o.typeInto) { await page.locator(o.typeInto.selector).fill(o.typeInto.text); if (o.humanize) await this.wait(rnd(100, 400)); }
      if (o.infiniteScroll) await this.infiniteScroll(page, o.infiniteScroll);
      let scriptResult: any = null;
      if (o.executeScript) scriptResult = await page.evaluate(o.executeScript);
      const html = await page.content();
      const text = await page.evaluate(() => document.body?.innerText || '');
      const title = await page.title();
      const metadata = await this.getMeta(page);
      const tableData = o.extractTable ? await this.getTable(page, o.extractTable) : undefined;
      const allTables = o.extractMultipleTables ? await this.getAllTables(page) : undefined;
      const links = o.extractLinks ? await this.getLinks(page) : undefined;
      const images = o.extractImages ? await this.getImages(page) : undefined;
      const jsonData = o.extractJson ? await this.getStructured(page) : undefined;
      let screenshot: Buffer | undefined;
      if (o.screenshot) screenshot = await page.screenshot({ fullPage: o.fullPage ?? false, type: 'png' }) as Buffer;
      if (o.session?.persist && o.session.id) await this.saveSession(ck, o.session.id);
      const dur = Date.now() - t0;
      this.stats.completedJobs++;
      this.stats.averageDuration = (this.stats.averageDuration * (this.stats.completedJobs - 1) + dur) / this.stats.completedJobs;
      this.emit('scrape:success', { url: o.url, dur, statusCode });
      const result: ScrapeResult = { success: true, url: o.url, finalUrl, statusCode, html, text, title, screenshot, metadata, scriptResult, tableData, allTables, links, images, jsonData, retryCount: retry, cached: false, duration: dur, timestamp: new Date().toISOString() };
      this.toCache(o, result);
      return result;
    } catch (err: any) {
      const dur = Date.now() - t0;
      this.stats.failedJobs++;
      this.log('warn', `Failed [${retry + 1}] ${o.url}: ${err.message}`);
      this.emit('scrape:error', { url: o.url, error: err.message });
      const max = o.retries ?? this.cfg.retryAttempts;
      if (retry < max) { await this.wait((o.retryDelay ?? this.cfg.retryDelay) * Math.pow(2, retry)); return this.scrape(o, retry + 1); }
      return { success: false, url: o.url, error: err.message, retryCount: retry, duration: dur, timestamp: new Date().toISOString() };
    } finally { await release(); }
  }

  // ── Multi-field extract ───────────────────────────────────────────────────────
  async multiExtract(opts: MultiExtractOptions): Promise<MultiExtractResult> {
    const t0 = Date.now();
    const so: ScrapeOptions = { ...(opts.scrapeOptions || {}), url: opts.url };
    const { page, release } = await this.getPage(so);
    const data: Record<string, any> = {}, errors: Record<string, string> = {};
    try {
      await this.intercept(page, opts.scrapeOptions?.blockRules);
      await page.goto(opts.url, { waitUntil: 'domcontentloaded', timeout: this.cfg.jobTimeout });
      for (const [f, ex] of Object.entries(opts.fields)) {
        try { data[f] = (await this.extract(page, ex)).data; } catch (e: any) { errors[f] = e.message; }
      }
      return { success: true, url: opts.url, data, errors, duration: Date.now() - t0, timestamp: new Date().toISOString() };
    } catch (e: any) {
      return { success: false, url: opts.url, data, errors: { _page: e.message }, duration: Date.now() - t0, timestamp: new Date().toISOString() };
    } finally { await release(); }
  }

  // ── Crawler ───────────────────────────────────────────────────────────────────
  async crawl(opts: CrawlOptions): Promise<CrawlResult> {
    const t0 = Date.now();
    const visited = new Set<string>();
    const queue: { url: string; depth: number }[] = [{ url: opts.startUrl, depth: 0 }];
    const results: ScrapeResult[] = [], errors: { url: string; error: string }[] = [];
    const maxD = opts.maxDepth ?? 2, maxP = opts.maxPages ?? 50;
    const same = opts.sameDomain !== false;
    const pat = opts.urlPattern ? new RegExp(opts.urlPattern) : null;
    const host = new URL(opts.startUrl).hostname;
    while (queue.length && visited.size < maxP) {
      const item = queue.shift()!;
      if (visited.has(item.url)) continue;
      visited.add(item.url);
      try {
        const r = await this.scrape({ ...opts.scrapeOptions, url: item.url, extractLinks: true });
        results.push(r);
        if (r.success && r.links && item.depth < maxD) {
          for (const lnk of r.links) {
            try {
              const u = new URL(lnk);
              if (same && u.hostname !== host) continue;
              if (pat && !pat.test(lnk)) continue;
              if (!visited.has(lnk)) queue.push({ url: lnk, depth: item.depth + 1 });
            } catch { }
          }
        }
      } catch (e: any) { errors.push({ url: item.url, error: e.message }); }
    }
    return { success: true, startUrl: opts.startUrl, pagesVisited: visited.size, results, errors, duration: Date.now() - t0, timestamp: new Date().toISOString() };
  }

  // ── Extract ───────────────────────────────────────────────────────────────────
  async extract(page: Page, o: ExtractOptions): Promise<ExtractResult> {
    try {
      if (o.type === 'table') { const t = await this.getTable(page, o.selector); return { selector: o.selector, data: t, count: t.rowCount }; }
      const loc = o.multiple ? page.locator(o.selector) : page.locator(o.selector).first();
      let data: any = null;
      switch (o.type || 'text') {
        case 'text': data = o.multiple ? await loc.allTextContents() : await loc.textContent(); break;
        case 'html': data = o.multiple ? await loc.evaluateAll((els: Element[]) => els.map(e => e.outerHTML)) : await loc.evaluate((e: Element) => e.outerHTML); break;
        case 'value': data = o.multiple ? await loc.evaluateAll((els: HTMLInputElement[]) => els.map(e => e.value)) : await loc.evaluate((e: HTMLInputElement) => e.value); break;
        case 'href': data = o.multiple ? await loc.evaluateAll((els: HTMLAnchorElement[]) => els.map(e => e.href)) : await loc.evaluate((e: HTMLAnchorElement) => e.href); break;
        case 'src': data = o.multiple ? await loc.evaluateAll((els: HTMLImageElement[]) => els.map(e => e.src)) : await loc.evaluate((e: HTMLImageElement) => e.src); break;
        case 'json': data = o.multiple ? await loc.evaluateAll((els: Element[]) => els.map(e => { try { return JSON.parse(e.textContent || ''); } catch { return null; } })) : await loc.evaluate((e: Element) => { try { return JSON.parse(e.textContent || ''); } catch { return null; } }); break;
        case 'attribute':
          if (!o.attribute) throw new Error('attribute name required');
          data = o.multiple ? await loc.evaluateAll((els: Element[], a: string) => els.map(e => e.getAttribute(a)), o.attribute) : await loc.getAttribute(o.attribute);
          break;
      }
      return { selector: o.selector, data, count: Array.isArray(data) ? data.length : data != null ? 1 : 0 };
    } catch { return { selector: o.selector, data: null, count: 0 }; }
  }

  // ── Page interaction helpers ──────────────────────────────────────────────────
  async fillForm(page: Page, o: { selector: string; value: string; clear?: boolean; pressEnter?: boolean }) {
    const loc = page.locator(o.selector);
    if (o.clear !== false) await loc.fill('');
    await loc.fill(o.value);
    if (o.pressEnter) await loc.press('Enter');
  }

  async click(page: Page, o: { selector: string; waitForNavigation?: boolean; timeout?: number }) {
    const loc = page.locator(o.selector);
    if (o.waitForNavigation) await Promise.all([page.waitForNavigation({ timeout: o.timeout || 10000 }), loc.click()]);
    else await loc.click();
  }

  async scroll(page: Page, o: { direction: string; amount?: number; selector?: string }) {
    if (o.selector) { await page.locator(o.selector).scrollIntoViewIfNeeded(); return; }
    const amt = o.amount || 500;
    await page.evaluate(([d, a]: [string, number]) => window.scrollBy(d === 'left' ? -a : d === 'right' ? a : 0, d === 'up' ? -a : d === 'down' ? a : 0), [o.direction, amt] as [string, number]);
  }

  // ── Private extraction helpers ────────────────────────────────────────────────
  private async getTable(page: Page, sel: string): Promise<TableExtractResult> {
    return page.evaluate((s: string) => {
      const t = document.querySelector(s);
      if (!t) return { headers: [], rows: [], rowCount: 0, objects: [] };
      const headers = Array.from(t.querySelectorAll('th, thead td')).map((h: any) => h.textContent?.trim() || '');
      const rows = Array.from(t.querySelectorAll('tbody tr, tr'))
        .map((r: any) => Array.from(r.querySelectorAll('td')).map((d: any) => d.textContent?.trim() || ''))
        .filter((r: string[]) => r.length > 0);
      const objects = rows.map((r: string[]) => Object.fromEntries(headers.map((h: string, i: number) => [h || `col${i}`, r[i] || ''])));
      return { headers, rows, rowCount: rows.length, objects };
    }, sel);
  }

  private async getAllTables(page: Page): Promise<TableExtractResult[]> {
    const n: number = await page.evaluate(() => document.querySelectorAll('table').length);
    const out: TableExtractResult[] = [];
    for (let i = 1; i <= n; i++) out.push(await this.getTable(page, `table:nth-of-type(${i})`));
    return out;
  }

  private async getLinks(page: Page): Promise<string[]> {
    return page.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a: any) => a.href as string).filter((h: string) => h.startsWith('http')));
  }

  private async getImages(page: Page): Promise<string[]> {
    return page.evaluate(() => Array.from(document.querySelectorAll('img[src]')).map((i: any) => i.src as string).filter((s: string) => s.startsWith('http')));
  }

  private async getStructured(page: Page): Promise<any> {
    return page.evaluate(() => {
      const r: any = {};
      const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s: any) => { try { return JSON.parse(s.textContent || ''); } catch { return null; } }).filter(Boolean);
      if (ld.length) r.jsonLd = ld;
      if ((window as any).__NEXT_DATA__) r.nextData = (window as any).__NEXT_DATA__;
      if ((window as any).__NUXT__) r.nuxtData = (window as any).__NUXT__;
      if ((window as any).__INITIAL_STATE__) r.initialState = (window as any).__INITIAL_STATE__;
      return r;
    });
  }

  private async getMeta(page: Page): Promise<PageMetadata> {
    return page.evaluate(() => {
      const m = (n: string) => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.getAttribute('content') || undefined;
      const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s: any) => { try { return JSON.parse(s.textContent || ''); } catch { return null; } }).filter(Boolean);
      return {
        title: document.title,
        description: m('description') || m('og:description'),
        keywords: m('keywords')?.split(',').map((k: string) => k.trim()),
        author: m('author'),
        ogImage: m('og:image'), ogTitle: m('og:title'), ogDescription: m('og:description'),
        canonicalUrl: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined,
        publishDate: m('article:published_time') || m('publish_date'),
        modifiedDate: m('article:modified_time') || m('modified_date'),
        language: document.documentElement.lang || undefined,
        robots: m('robots'),
        structuredData: ld.length ? ld : undefined,
      };
    });
  }

  // ── Stats / shutdown ──────────────────────────────────────────────────────────
  getStats(): ScrapingStats {
    return { ...this.stats, activeBrowsers: this.browsers.size, activePages: this.pages.size, queueSize: this.activeJobs.size };
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    this.log('info', 'Shutting down...');
    for (const [, p] of this.pages) { try { await p.close(); } catch { } }
    for (const [, c] of this.contexts) { try { await c.close(); } catch { } }
    for (const [, b] of this.browsers) { try { await b.close(); } catch { } }
    this.pages.clear(); this.contexts.clear(); this.browsers.clear();
    this.emit('shutdown:complete', {});
    this.log('info', 'Shutdown complete');
  }

  private wait(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
}

export const scraper = new CevictScraper();
