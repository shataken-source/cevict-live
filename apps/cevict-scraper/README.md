# CevictScraper

**Internal Playwright-based scraping service for the Cevict ecosystem**

## Overview

CevictScraper is a powerful browser automation and scraping tool built on Playwright. It provides both a standalone API server and a reusable library for other projects in the Cevict ecosystem.

## Features

- **Browser Pool Management** - Efficiently manages multiple browser instances
- **Automatic Retries** - Built-in retry logic with exponential backoff
- **Rate Limiting** - Per-domain rate limiting to avoid being blocked
- **Screenshot Capture** - Full-page or element-specific screenshots
- **Form Interaction** - Fill forms, click buttons, scroll pages
- **Data Extraction** - Extract data using CSS selectors
- **Proxy Support** - Route requests through proxies
- **Batch Processing** - Scrape multiple URLs concurrently

## Installation

```bash
cd C:\cevict-live\apps\cevict-scraper
npm install
npx playwright install
```

## Usage

### As a Standalone Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### As a Library

```typescript
import { CevictScraper, scraper } from 'cevict-scraper';

// Using singleton instance
await scraper.initialize();

const result = await scraper.scrape({
  url: 'https://example.com',
  waitFor: '.content',
  screenshot: true
});

console.log(result.html);
console.log(result.text);

// Shutdown when done
await scraper.shutdown();
```

### Custom Instance

```typescript
import { CevictScraper } from 'cevict-scraper';

const scraper = new CevictScraper({
  maxBrowsers: 3,
  maxPagesPerBrowser: 5,
  headless: true
});

await scraper.initialize();

// Use scraper...

await scraper.shutdown();
```

## API Endpoints

### `POST /scrape`
Scrape a single URL.

```json
{
  "url": "https://example.com",
  "waitFor": ".content",
  "screenshot": true,
  "fullPage": false
}
```

### `POST /batch`
Scrape multiple URLs.

```json
{
  "urls": ["https://example.com", "https://example.org"],
  "options": {
    "waitFor": 2000
  }
}
```

### `POST /screenshot`
Capture screenshot only.

```json
{
  "url": "https://example.com",
  "fullPage": true
}
```

### `GET /stats`
Get scraping statistics.

### `GET /health`
Health check.

## Scraping Options

```typescript
interface ScrapeOptions {
  url: string;                    // Required - URL to scrape
  waitFor?: string | number;    // Wait for selector (ms or CSS)
  selector?: string;              // Extract specific element
  screenshot?: boolean;           // Capture screenshot
  fullPage?: boolean;             // Full page screenshot
  viewport?: { width: number; height: number };
  userAgent?: string;             // Custom user agent
  cookies?: Array<{ name: string; value: string }>;
  headers?: Record<string, string>;
  timeout?: number;               // Request timeout (ms)
  retries?: number;               // Retry attempts
  proxy?: string;                 // Proxy URL
}
```

## Environment Variables

```bash
PORT=3009                           # Server port
NODE_ENV=production                 # Environment
ALLOWED_ORIGINS=localhost:3000,localhost:3008  # CORS origins
```

## Integration with Other Projects

### From progno/alpha-hunter/prognostication:

```typescript
// Direct library import
import { scraper } from '../../cevict-scraper/src';

// Or via API call
const response = await fetch('http://localhost:3009/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://sportsbook.example.com/odds',
    waitFor: '.odds-table'
  })
});

const result = await response.json();
```

## Project Structure

```
cevict-scraper/
├── src/
│   ├── lib/
│   │   └── scraper.ts          # Core scraper class
│   ├── api/
│   │   └── server.ts           # Express API server
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   └── index.ts                # Main exports
├── package.json
├── tsconfig.json
└── README.md
```

## Use Cases

1. **Odds Scraping** - Extract live odds from sportsbooks
2. **Injury Reports** - Scrape injury data from team sites
3. **Weather Data** - Get detailed weather for game locations
4. **Line Movement** - Track betting line changes
5. **News Aggregation** - Collect relevant sports news
6. **Social Monitoring** - Track Twitter/Reddit sentiment

## Comparison with ScrapingBee

| Feature | CevictScraper (Playwright) | ScrapingBee |
|---------|------------------------------|-------------|
| JavaScript Rendering | ✅ Full support | ⚠️ Limited |
| Interactions (click, scroll) | ✅ Yes | ❌ No |
| Screenshots | ✅ Yes | ❌ No |
| Cost | Free (self-hosted) | $49+/month |
| Rate Limits | Your infrastructure | 1000/month |
| Maintenance | You manage | Managed |

## Best Practices

1. **Always use `waitFor`** - Ensure content is loaded before extracting
2. **Respect robots.txt** - Don't scrape sites that prohibit it
3. **Rate limit** - Use built-in rate limiting to avoid blocks
4. **Rotate proxies** - For high-volume scraping
5. **Handle errors** - Always check `result.success`
6. **Shutdown properly** - Call `scraper.shutdown()` when done

## Troubleshooting

### Browser fails to launch
```bash
npx playwright install
```

### Memory issues
Reduce `maxBrowsers` and `maxPagesPerBrowser` in options.

### Rate limiting
Increase `rateLimitPerDomain` or use proxies.

## License

MIT
