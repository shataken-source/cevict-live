import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion.org').replace(/\/$/, '');
  const now = new Date();

  const urls: Array<{ path: string; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; priority?: number }> = [
    { path: '/petreunion', changeFrequency: 'daily', priority: 1 },
    { path: '/petreunion/report', changeFrequency: 'daily', priority: 0.9 },
    { path: '/petreunion/find-my-pet', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/petreunion/image-match', changeFrequency: 'weekly', priority: 0.6 },
  ];

  return urls.map((u) => ({
    url: `${siteUrl}${u.path}`,
    lastModified: now,
    changeFrequency: u.changeFrequency,
    priority: u.priority,
  }));
}
