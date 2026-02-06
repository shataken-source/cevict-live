/**
 * Robots.txt API Route
 * 
 * Route: /api/robots.txt
 * Generates robots.txt for search engines
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gulfcoastcharters.com';

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /dashboard
Disallow: /settings
Disallow: /notifications
Disallow: /bookings/*

# Sitemap
Sitemap: ${baseUrl}/api/sitemap.xml

# Crawl-delay (optional)
Crawl-delay: 1
`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.status(200).send(robotsTxt);
}
