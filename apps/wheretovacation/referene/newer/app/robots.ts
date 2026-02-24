import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion.org';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/petreunion'],
        disallow: ['/admin', '/api', '/petreunion/shelter'],
      },
    ],
    sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml`,
  };
}
