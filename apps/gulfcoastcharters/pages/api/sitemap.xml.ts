/**
 * XML Sitemap API Route
 * 
 * Route: /api/sitemap.xml
 * Generates XML sitemap for search engines
 */

import { NextApiRequest, NextApiResponse } from 'next';

type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gulfcoastcharters.com';

  // Define all routes
  const routes: SitemapUrl[] = [
    // Main pages
    { loc: `${baseUrl}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${baseUrl}/about`, changefreq: 'monthly', priority: 0.8 },
    { loc: `${baseUrl}/contact`, changefreq: 'monthly', priority: 0.8 },
    { loc: `${baseUrl}/help`, changefreq: 'weekly', priority: 0.7 },
    { loc: `${baseUrl}/faq`, changefreq: 'weekly', priority: 0.7 },
    { loc: `${baseUrl}/blog`, changefreq: 'daily', priority: 0.8 },
    { loc: `${baseUrl}/reviews`, changefreq: 'daily', priority: 0.7 },
    { loc: `${baseUrl}/weather`, changefreq: 'hourly', priority: 0.6 },
    { loc: `${baseUrl}/community`, changefreq: 'daily', priority: 0.7 },
    { loc: `${baseUrl}/search`, changefreq: 'daily', priority: 0.6 },
    
    // User pages
    { loc: `${baseUrl}/dashboard`, changefreq: 'daily', priority: 0.6 },
    { loc: `${baseUrl}/profile`, changefreq: 'weekly', priority: 0.5 },
    { loc: `${baseUrl}/settings`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${baseUrl}/notifications`, changefreq: 'daily', priority: 0.5 },
    { loc: `${baseUrl}/bookings`, changefreq: 'daily', priority: 0.7 },
    
    // Feature pages
    { loc: `${baseUrl}/vessels`, changefreq: 'daily', priority: 0.8 },
    { loc: `${baseUrl}/captains`, changefreq: 'daily', priority: 0.8 },
    { loc: `${baseUrl}/gift-cards`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${baseUrl}/loyalty`, changefreq: 'weekly', priority: 0.6 },
    { loc: `${baseUrl}/referral`, changefreq: 'weekly', priority: 0.6 },
    
    // Legal pages
    { loc: `${baseUrl}/terms`, changefreq: 'yearly', priority: 0.3 },
    { loc: `${baseUrl}/privacy`, changefreq: 'yearly', priority: 0.3 },
  ];

  // Generate XML sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${route.loc}</loc>
    ${route.lastmod ? `    <lastmod>${route.lastmod}</lastmod>` : ''}
    ${route.changefreq ? `    <changefreq>${route.changefreq}</changefreq>` : ''}
    ${route.priority ? `    <priority>${route.priority}</priority>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.status(200).send(sitemap);
}
