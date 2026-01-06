import { MetadataRoute } from 'next'

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

const CATEGORIES = [
  'indoor_smoking',
  'vaping',
  'outdoor_public',
  'patio_private',
  'retail_sales',
  'hemp_restrictions',
  'penalties',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://smokersrights.com';
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  const dynamicEntries: MetadataRoute.Sitemap = [];
  const now = new Date();

  STATES.forEach((state) => {
    CATEGORIES.forEach((cat) => {
      dynamicEntries.push({
        url: `${baseUrl}/legal/${state}/${cat}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    });
  });

  return [...staticEntries, ...dynamicEntries];
}

