import type { MetadataRoute } from 'next';

const siteUrl = process.env.APP_URL ?? 'https://tavakoli-direct.vercel.app';

/** Only the public showcase page is indexed. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
