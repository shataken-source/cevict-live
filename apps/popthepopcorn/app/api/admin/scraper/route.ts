import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { scrapeAll } from '@/lib/scraper'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  // Check authentication
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run scraper in background
    scrapeAll().catch((error) => {
      console.error('Scraper error:', error)
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Scraper started. Check logs for progress.' 
    })
  } catch (error) {
    console.error('Error starting scraper:', error)
    return NextResponse.json({ error: 'Failed to start scraper' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Check authentication
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get last scrape time from database (check most recent headline)
    const { data: latestHeadline } = await supabase
      .from('headlines')
      .select('scraped_at')
      .order('scraped_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      lastScrapeTime: latestHeadline?.scraped_at || null,
    })
  } catch (error) {
    console.error('Error fetching scraper status:', error)
    return NextResponse.json({ error: 'Failed to fetch scraper status' }, { status: 500 })
  }
}
