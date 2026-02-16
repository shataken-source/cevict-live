/**
 * CevictScraper - Main Export
 * 
 * This is the main entry point for CevictScraper.
 * Can be used as a library in other projects or as a standalone service.
 * 
 * Usage:
 * ```typescript
 * import { CevictScraper, scraper } from 'cevict-scraper';
 * 
 * // Using singleton
 * await scraper.initialize();
 * const result = await scraper.scrape({ url: 'https://example.com' });
 * 
 * // Using new instance
 * const myScraper = new CevictScraper({ maxBrowsers: 2 });
 * await myScraper.initialize();
 * ```
 */

export { CevictScraper, scraper } from './lib/scraper';
export * from './types';

// Version
export const VERSION = '1.0.0';
