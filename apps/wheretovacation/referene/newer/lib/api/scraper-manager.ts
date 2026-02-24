// Central place to track running scrapers across API routes
export const activeScrapers: Map<string, { startTime: number; type: string }> = new Map();

