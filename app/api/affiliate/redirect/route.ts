/**
 * Fast-Link Redirector for Affiliate Links
 * Prevents external links from bloating index.html file size
 * Keeps HTML under 100KB as required
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const ref = searchParams.get('ref') || 'SR001';

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  // Add affiliate ref if not present
  let affiliateUrl = url;
  try {
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has('ref')) {
      urlObj.searchParams.set('ref', ref);
    }
    affiliateUrl = urlObj.toString();
  } catch {
    // If URL parsing fails, append ref
    affiliateUrl = `${url}${url.includes('?') ? '&' : '?'}ref=${ref}`;
  }

  // Redirect to affiliate URL
  return NextResponse.redirect(affiliateUrl, 302);
}

