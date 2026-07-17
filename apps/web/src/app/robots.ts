import type { MetadataRoute } from 'next';

const siteUrl = process.env.APP_URL ?? 'https://tavakoli-direct.vercel.app';

/**
 * Allow indexing of the public showcase page, but keep the private panel out of
 * search engines.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/clients',
        '/instagram-accounts',
        '/automations',
        '/inbox',
        '/contacts',
        '/reports',
        '/team',
        '/settings',
        '/dev',
        '/api',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
