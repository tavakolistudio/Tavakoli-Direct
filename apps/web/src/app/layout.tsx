import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import { APP_NAME, APP_TAGLINE_FA } from '@tavakoli/config';
import './globals.css';

const vazir = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazir',
  display: 'swap',
});

// Public site URL for SEO — read raw process.env (not the validated proxy) so the
// production build never requires secrets to collect metadata.
const siteUrl = process.env.APP_URL ?? 'https://tavakoli-direct.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${APP_NAME} — دایرکت هوشمند اینستاگرام`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_TAGLINE_FA,
  applicationName: APP_NAME,
  keywords: [
    'دایرکت هوشمند',
    'اتوماسیون دایرکت اینستاگرام',
    'پاسخ خودکار اینستاگرام',
    'پاسخ خصوصی کامنت',
    'مدیریت پیام اینستاگرام',
    'باشگاه مشتریان',
    'توکلی استودیو',
    'Tavakoli Studio',
    'Instagram DM automation',
  ],
  authors: [{ name: 'Tavakoli Studio' }],
  creator: 'Tavakoli Studio',
  publisher: 'Tavakoli Studio',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: siteUrl,
    siteName: APP_NAME,
    title: `${APP_NAME} — دایرکت هوشمند اینستاگرام`,
    description: APP_TAGLINE_FA,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — دایرکت هوشمند اینستاگرام`,
    description: APP_TAGLINE_FA,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
