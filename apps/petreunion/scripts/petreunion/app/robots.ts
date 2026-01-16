import { MetadataRoute } from 'next';

/**
 * Robots.txt for PetReunion
 * Ensures proper search engine indexing
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/'],
      },
    ],
    sitemap: 'https://petreunion.org/sitemap.xml',
  };
}
