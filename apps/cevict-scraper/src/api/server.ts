/**
 * CevictScraper API Server
 * Express server for internal scraping requests
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { CevictScraper, scraper } from '../lib/scraper';
import { ScrapeOptions, ExtractOptions, FormFillOptions, ClickOptions, ScrollOptions } from '../types';

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3008'],
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  const stats = scraper.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats
  });
});

// Scrape endpoint
app.post('/scrape', async (req, res) => {
  try {
    const options: ScrapeOptions = req.body;
    
    if (!options.url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await scraper.scrape(options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Extract endpoint
app.post('/extract', async (req, res) => {
  try {
    const { url, selector, options }: { url: string; selector: string; options: ExtractOptions } = req.body;
    
    if (!url || !selector) {
      return res.status(400).json({ error: 'URL and selector are required' });
    }

    // First scrape to get page
    const scrapeResult = await scraper.scrape({ url });
    
    if (!scrapeResult.success) {
      return res.status(500).json(scrapeResult);
    }

    // Note: In real implementation, we'd need to keep the page open
    // This is a simplified version
    res.json({
      success: true,
      url,
      selector,
      message: 'Extract endpoint - full implementation requires page persistence',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Screenshot endpoint
app.post('/screenshot', async (req, res) => {
  try {
    const options: ScrapeOptions = {
      ...req.body,
      screenshot: true
    };
    
    if (!options.url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await scraper.scrape(options);
    
    if (result.success && result.screenshot) {
      res.set('Content-Type', 'image/png');
      res.send(result.screenshot);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Stats endpoint
app.get('/stats', (req, res) => {
  const stats = scraper.getStats();
  res.json(stats);
});

// Batch scrape endpoint
app.post('/batch', async (req, res) => {
  try {
    const { urls, options }: { urls: string[]; options: ScrapeOptions } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'urls array is required' });
    }

    const results = await Promise.all(
      urls.map(url => scraper.scrape({ ...options, url }))
    );

    res.json({
      success: true,
      total: urls.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize and start server
async function startServer() {
  try {
    await scraper.initialize();
    
    app.listen(PORT, () => {
      console.log(`🚀 CevictScraper API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Scrape endpoint: POST http://localhost:${PORT}/scrape`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await scraper.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      await scraper.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
