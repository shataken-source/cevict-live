import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: headlines } = await supabase
      .from('headlines')
      .select('*')
      .order('drama_score', { ascending: false })
      .order('posted_at', { ascending: false })
      .limit(50)

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PopThePopcorn 🍿</title>
    <description>Breaking news and trending stories with AI-powered drama scoring</description>
    <link>https://popthepopcorn.com</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${headlines?.map(headline => `
    <item>
      <title>${escapeXml(headline.title)} [Drama: ${headline.drama_score}/10]</title>
      <link>${escapeXml(headline.url)}</link>
      <description>${escapeXml(headline.description || headline.title)}</description>
      <pubDate>${new Date(headline.posted_at).toUTCString()}</pubDate>
      <source>${escapeXml(headline.source)}</source>
      <category>${escapeXml(headline.category)}</category>
    </item>
    `).join('') || ''}
  </channel>
</rss>`

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/xml',
      },
    })
  } catch (error) {
    console.error('Error generating RSS feed:', error)
    return NextResponse.json({ error: 'Failed to generate feed' }, { status: 500 })
  }
}

function escapeXml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
