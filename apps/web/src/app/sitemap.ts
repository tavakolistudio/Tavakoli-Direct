import type { MetadataRoute } from 'next';

const siteUrl = process.env.APP_URL ?? 'https://tavakoli-direct.vercel.app';

/** Public pages only — the private panel is excluded (see robots.ts). */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: siteUrl, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${siteUrl}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/data-deletion`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
