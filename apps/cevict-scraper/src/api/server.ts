/**
 * CevictScraper API Server - Port 3009
 * No API key needed - pure browser automation
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { scraper } from '../lib/scraper';
import { ScrapeOptions, CrawlOptions, MultiExtractOptions } from '../types';

const app = express();
const PORT = process.env.PORT || 3009;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));

// ── Logging middleware ────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: any) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), stats: scraper.getStats() });
});

app.get('/stats', (_req: Request, res: Response) => {
  res.json(scraper.getStats());
});

// ── Core scrape ───────────────────────────────────────────────────────────────
app.post('/scrape', async (req: Request, res: Response) => {
  try {
    const options: ScrapeOptions = req.body;
    if (!options.url) return res.status(400).json({ error: 'url is required' }) as any;
    const result = await scraper.scrape(options);
    res.status(result.success ? 200 : 500).json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Screenshot ────────────────────────────────────────────────────────────────
app.post('/screenshot', async (req: Request, res: Response) => {
  try {
    const options: ScrapeOptions = { ...req.body, screenshot: true };
    if (!options.url) return res.status(400).json({ error: 'url is required' }) as any;
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

// ── Batch scrape ──────────────────────────────────────────────────────────────
app.post('/batch', async (req: Request, res: Response) => {
  try {
    const { urls, options }: { urls: string[]; options?: Partial<ScrapeOptions> } = req.body;
    if (!Array.isArray(urls) || !urls.length) return res.status(400).json({ error: 'urls array is required' }) as any;
    const results = await Promise.all(urls.map(url => scraper.scrape({ ...options, url })));
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
app.post('/extract-table', async (req: Request, res: Response) => {
  try {
    const { url, selector, waitFor }: { url: string; selector: string; waitFor?: string | number } = req.body;
    if (!url || !selector) return res.status(400).json({ error: 'url and selector are required' }) as any;
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
app.post('/execute', async (req: Request, res: Response) => {
  try {
    const { url, script, waitFor }: { url: string; script: string; waitFor?: string | number } = req.body;
    if (!url || !script) return res.status(400).json({ error: 'url and script are required' }) as any;
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
app.post('/multi-extract', async (req: Request, res: Response) => {
  try {
    const opts: MultiExtractOptions = req.body;
    if (!opts.url || !opts.fields) return res.status(400).json({ error: 'url and fields are required' }) as any;
    const result = await scraper.multiExtract(opts);
    res.status(result.success ? 200 : 500).json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Crawler ───────────────────────────────────────────────────────────────────
app.post('/crawl', async (req: Request, res: Response) => {
  try {
    const opts: CrawlOptions = req.body;
    if (!opts.startUrl) return res.status(400).json({ error: 'startUrl is required' }) as any;
    const result = await scraper.crawl(opts);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
});

// ── Cache management ──────────────────────────────────────────────────────────
app.delete('/cache', (_req: Request, res: Response) => {
  scraper.clearCache();
  res.json({ success: true, message: 'Cache cleared', timestamp: new Date().toISOString() });
});

// ── Session management ────────────────────────────────────────────────────────
app.get('/sessions', (_req: Request, res: Response) => {
  res.json({ sessions: scraper.listSessions(), timestamp: new Date().toISOString() });
});

app.delete('/sessions/:id', async (req: Request, res: Response) => {
  await scraper.deleteSession(req.params.id);
  res.json({ success: true, deleted: req.params.id, timestamp: new Date().toISOString() });
});

// ── Extract links/images/json from page ───────────────────────────────────────
app.post('/extract', async (req: Request, res: Response) => {
  try {
    const { url, extractLinks, extractImages, extractJson, waitFor, blockRules }: ScrapeOptions = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' }) as any;
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
      console.log(`[CevictScraper] Running on port ${PORT}`);
      console.log(`  GET  /health`);
      console.log(`  GET  /stats`);
      console.log(`  POST /scrape`);
      console.log(`  POST /batch`);
      console.log(`  POST /screenshot`);
      console.log(`  POST /extract`);
      console.log(`  POST /extract-table`);
      console.log(`  POST /execute`);
      console.log(`  POST /multi-extract`);
      console.log(`  POST /crawl`);
      console.log(`  DEL  /cache`);
      console.log(`  GET  /sessions`);
      console.log(`  DEL  /sessions/:id`);
    });
    const graceful = async (sig: string) => {
      console.log(`${sig} - shutting down`);
      await scraper.shutdown();
      process.exit(0);
    };
    process.on('SIGTERM', () => graceful('SIGTERM'));
    process.on('SIGINT', () => graceful('SIGINT'));
  } catch (e) {
    console.error('Failed to start:', e);
    process.exit(1);
  }
}

start();
