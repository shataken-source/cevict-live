import { NextRequest, NextResponse } from 'next/server';
import { activeScrapers } from '@/lib/api/scraper-manager';

export async function GET(request: NextRequest) {
  const active = Array.from(activeScrapers.entries()).map(([id, data]) => ({
    id,
    type: data.type,
    runningFor: Date.now() - data.startTime,
    runningForSeconds: Math.floor((Date.now() - data.startTime) / 1000)
  }));

  return NextResponse.json({
    activeScrapers: active.length,
    scrapers: active,
    message: active.length > 0 
      ? `${active.length} scraper(s) currently running`
      : 'No active scrapers'
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const action = body.action; // 'register', 'unregister', 'clear'
  const scraperId = body.scraperId;
  const type = body.type;

  if (action === 'register' && scraperId && type) {
    activeScrapers.set(scraperId, {
      startTime: Date.now(),
      type
    });
    return NextResponse.json({ success: true, message: 'Scraper registered' });
  }

  if (action === 'unregister' && scraperId) {
    activeScrapers.delete(scraperId);
    return NextResponse.json({ success: true, message: 'Scraper unregistered' });
  }

  if (action === 'clear') {
    activeScrapers.clear();
    return NextResponse.json({ success: true, message: 'All scrapers cleared' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// Export the map so other routes can use it
