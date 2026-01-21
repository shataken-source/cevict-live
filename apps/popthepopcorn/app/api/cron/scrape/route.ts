import { NextResponse } from 'next/server'
import { scrapeAll } from '@/lib/scraper'

// Force dynamic rendering (can't be statically generated)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  // Verify cron secret if needed
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await scrapeAll()
    return NextResponse.json({ success: true, message: 'Scraping completed' })
  } catch (error) {
    console.error('Cron scrape error:', error)
    return NextResponse.json({ error: 'Scraping failed' }, { status: 500 })
  }
}
