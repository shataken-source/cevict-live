import { MetadataRoute } from 'next';

/**
 * Robots.txt for PetReunion
 * Ensures proper search engine indexing
 */
export default function robots(): MetadataRoute.Robots {
  const quiet =
    String(process.env.PETREUNION_QUIET_MODE || process.env.QUIET_MODE || '')
      .trim()
      .toLowerCase() === 'true' ||
    String(process.env.PETREUNION_QUIET_MODE || process.env.QUIET_MODE || '')
      .trim()
      .toLowerCase() === '1';

  if (quiet) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }

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
