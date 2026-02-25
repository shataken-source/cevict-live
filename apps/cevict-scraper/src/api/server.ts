/**
 * CevictScraper API Server - Port 3009
 * No API key needed - pure browser automation
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import { CevictScraper } from '../lib/scraper';
import { ScrapeOptions, CrawlOptions, MultiExtractOptions } from '../types';

dotenv.config();

const PORT = process.env.PORT || 3009;
const LOG_LVL = process.env.LOG_LEVEL || 'info';

// ── Logger ────────────────────────────────────────────────────────────────────
const logger = createLogger({
  level: LOG_LVL,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}] ${message}`),
  ),
  transports: [new transports.Console()],
});

// ── Build scraper from env ────────────────────────────────────────────────────
const scraper = new CevictScraper({
  maxBrowsers: parseInt(process.env.MAX_BROWSERS || '3'),
  maxPagesPerBrowser: parseInt(process.env.MAX_PAGES_PER_BROWSER || '8'),
  headless: process.env.HEADLESS !== 'false',
  timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000'),
}, {
  rateLimitPerDomain: parseInt(process.env.RATE_LIMIT_PER_DOMAIN || '500'),
  cacheEnabled: process.env.CACHE_ENABLED === 'true',
  cacheTTL: parseInt(process.env.CACHE_TTL || '300000'),
  blockAds: process.env.BLOCK_ADS !== 'false',
}, logger);

// ── Concurrency cap for batch ─────────────────────────────────────────────────
const BATCH_CONCURRENCY = parseInt(process.env.BATCH_CONCURRENCY || '5');
async function pLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['*'];
app.use(cors({ origin: allowedOrigins.includes('*') ? '*' : allowedOrigins, methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));

// ── Logging middleware ────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: any) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ── API Key authentication middleware ─────────────────────────────────────────
const API_KEY = process.env.SCRAPER_API_KEY?.trim();
function requireAuth(req: Request, res: Response, next: any) {
  if (!API_KEY) {
    logger.warn('SCRAPER_API_KEY not set — blocking all authenticated requests');
    return res.status(503).json({ error: 'SCRAPER_API_KEY not configured' });
  }
  const presented = (req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.headers['x-api-key'] || '').toString().trim();
  if (presented !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing API key' });
  }
  next();
}

// ── SSRF protection: block private/internal IPs ──────────────────────────────
const BLOCKED_URL_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/0\./,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/169\.254\./,  // link-local
  /^file:/i,
  /^ftp:/i,
];
function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try { new URL(url); } catch { return false; }
  return !BLOCKED_URL_PATTERNS.some(p => p.test(url));
}

// ── Health (no auth required) ────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), stats: scraper.getStats() });
});

app.get('/stats', (_req: Request, res: Response) => {
  res.json(scraper.getStats());
});

// ── Core scrape ───────────────────────────────────────────────────────────────
app.post('/scrape', requireAuth, async (req: Request, res: Response) => {
  try {
    const options: ScrapeOptions = req.body;
    if (!options.url) return res.status(400).json({ error: 'url is required' }) as any;
    if (!validateUrl(options.url)) return res.status(400).json({ error: 'URL blocked by SSRF policy' }) as any;
    const result = await scraper.scrape(options);
    res.status(result.success ? 200 : 500).json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Screenshot ────────────────────────────────────────────────────────────────
app.post('/screenshot', requireAuth, async (req: Request, res: Response) => {
  try {
    const options: ScrapeOptions = { ...req.body, screenshot: true };
    if (!options.url) return res.status(400).json({ error: 'url is required' }) as any;
    if (!validateUrl(options.url)) return res.status(400).json({ error: 'URL blocked by SSRF policy' }) as any;
    const result = await scraper.scrape(options);
    if (result.success && result.screenshot) {
      res.set('Content-Type', 'image/png').send(result.screenshot);
    } else {
      res.status(500).json(result);
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Batch scrape (concurrency-capped) ────────────────────────────────────────
app.post('/batch', requireAuth, async (req: Request, res: Response) => {
  try {
    const { urls, options, concurrency }: { urls: string[]; options?: Partial<ScrapeOptions>; concurrency?: number } = req.body;
    if (!Array.isArray(urls) || !urls.length) return res.status(400).json({ error: 'urls array is required' }) as any;
    const blocked = urls.filter(u => !validateUrl(u));
    if (blocked.length) return res.status(400).json({ error: `${blocked.length} URL(s) blocked by SSRF policy` }) as any;
    const cap = Math.min(concurrency || BATCH_CONCURRENCY, 20);
    const tasks = urls.map(url => () => scraper.scrape({ ...options, url }));
    const results = await pLimit(tasks, cap);
    res.json({
      success: true, total: urls.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results, timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Table extraction ──────────────────────────────────────────────────────────
app.post('/extract-table', requireAuth, async (req: Request, res: Response) => {
  try {
    const { url, selector, waitFor }: { url: string; selector: string; waitFor?: string | number } = req.body;
    if (!url || !selector) return res.status(400).json({ error: 'url and selector are required' }) as any;
    if (!validateUrl(url)) return res.status(400).json({ error: 'URL blocked by SSRF policy' }) as any;
    const result = await scraper.scrape({ url, waitFor, extractTable: selector });
    if (result.success) {
      res.json({ success: true, url, selector, tableData: result.tableData, timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ success: false, url, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Execute JS ────────────────────────────────────────────────────────────────
app.post('/execute', requireAuth, async (req: Request, res: Response) => {
  try {
    const { url, script, waitFor }: { url: string; script: string; waitFor?: string | number } = req.body;
    if (!url || !script) return res.status(400).json({ error: 'url and script are required' }) as any;
    if (!validateUrl(url)) return res.status(400).json({ error: 'URL blocked by SSRF policy' }) as any;
    const result = await scraper.scrape({ url, waitFor, executeScript: script, waitForNetworkIdle: true });
    if (result.success) {
      res.json({ success: true, url, scriptResult: result.scriptResult, timestamp: new Date().toISOString() });
    } else {
      res.status(500).json(result);
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Multi-field extract (single page load) ────────────────────────────────────
app.post('/multi-extract', requireAuth, async (req: Request, res: Response) => {
  try {
    const opts: MultiExtractOptions = req.body;
    if (!opts.url || !opts.fields) return res.status(400).json({ error: 'url and fields are required' }) as any;
    if (!validateUrl(opts.url)) return res.status(400).json({ error: 'URL blocked by SSRF policy' }) as any;
    const result = await scraper.multiExtract(opts);
    res.status(result.success ? 200 : 500).json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Crawler (with server-side timeout) ───────────────────────────────────────
app.post('/crawl', requireAuth, async (req: Request, res: Response) => {
  try {
    const opts: CrawlOptions = req.body;
    if (!opts.startUrl) return res.status(400).json({ error: 'startUrl is required' }) as any;
    if (!validateUrl(opts.startUrl)) return res.status(400).json({ error: 'URL blocked by SSRF policy' }) as any;
    const timeoutMs = (opts.timeoutMs || 120000);
    const result = await Promise.race([
      scraper.crawl(opts),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`Crawl timed out after ${timeoutMs}ms`)), timeoutMs)),
    ]);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Cache management ──────────────────────────────────────────────────────────
app.delete('/cache', requireAuth, (_req: Request, res: Response) => {
  scraper.clearCache();
  res.json({ success: true, message: 'Cache cleared', timestamp: new Date().toISOString() });
});

// ── Session management ────────────────────────────────────────────────────────
app.get('/sessions', requireAuth, (_req: Request, res: Response) => {
  res.json({ sessions: scraper.listSessions(), timestamp: new Date().toISOString() });
});

app.delete('/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  await scraper.deleteSession(req.params.id);
  res.json({ success: true, deleted: req.params.id, timestamp: new Date().toISOString() });
});

// ── Page interaction (fillForm / click / scroll) ────────────────────────────
app.post('/interact', requireAuth, async (req: Request, res: Response) => {
  try {
    const { url, actions, waitFor, screenshot }: {
      url: string;
      actions: Array<
        | { type: 'fill'; selector: string; value: string; pressEnter?: boolean }
        | { type: 'click'; selector: string; waitForNavigation?: boolean }
        | { type: 'scroll'; direction?: string; amount?: number; selector?: string }
        | { type: 'wait'; value: number }
        | { type: 'select'; selector: string; value: string }
      >;
      waitFor?: string | number;
      screenshot?: boolean;
    } = req.body;
    if (!url || !Array.isArray(actions)) return res.status(400).json({ error: 'url and actions[] are required' }) as any;
    if (!validateUrl(url)) return res.status(400).json({ error: 'URL blocked by SSRF policy' }) as any;
    const result = await scraper.interact({ url, actions, waitFor, screenshot });
    res.status(result.success ? 200 : 500).json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── PDF generation ────────────────────────────────────────────────────────────
app.post('/pdf', requireAuth, async (req: Request, res: Response) => {
  try {
    const { url, waitFor, format: fmt, printBackground }: {
      url: string; waitFor?: string | number; format?: string; printBackground?: boolean;
    } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' }) as any;
    if (!validateUrl(url)) return res.status(400).json({ error: 'URL blocked by SSRF policy' }) as any;
    const pdf = await scraper.pdf({ url, waitFor, format: fmt, printBackground });
    if (pdf) {
      res.set('Content-Type', 'application/pdf')
        .set('Content-Disposition', 'attachment; filename="page.pdf"')
        .send(pdf);
    } else {
      res.status(500).json({ success: false, error: 'PDF generation failed', timestamp: new Date().toISOString() });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Extract links/images/json from page ───────────────────────────────────────
app.post('/extract', requireAuth, async (req: Request, res: Response) => {
  try {
    const { url, extractLinks, extractImages, extractJson, waitFor, blockRules }: ScrapeOptions = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' }) as any;
    if (!validateUrl(url)) return res.status(400).json({ error: 'URL blocked by SSRF policy' }) as any;
    const result = await scraper.scrape({ url, waitFor, extractLinks, extractImages, extractJson, blockRules });
    if (result.success) {
      res.json({
        success: true, url,
        links: result.links,
        images: result.images,
        jsonData: result.jsonData,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json(result);
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await scraper.initialize();
    app.listen(PORT, () => {
      logger.info(`CevictScraper running on port ${PORT}`);
      logger.info('Endpoints:');
      [
        'GET  /health', 'GET  /stats',
        'POST /scrape', 'POST /batch', 'POST /screenshot', 'POST /pdf',
        'POST /extract', 'POST /extract-table', 'POST /execute',
        'POST /multi-extract', 'POST /interact', 'POST /crawl',
        'DEL  /cache', 'GET  /sessions', 'DEL  /sessions/:id',
      ].forEach(e => logger.info(`  ${e}`));
    });
    const graceful = async (sig: string) => {
      logger.info(`${sig} — shutting down`);
      await scraper.shutdown();
      process.exit(0);
    };
    process.on('SIGTERM', () => graceful('SIGTERM'));
    process.on('SIGINT', () => graceful('SIGINT'));
  } catch (e) {
    logger.error(`Failed to start: ${e}`);
    process.exit(1);
  }
}

start();
