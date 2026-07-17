import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import { APP_NAME } from '@tavakoli/config';
import './globals.css';

const vazir = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazir',
  display: 'swap',
});

// Public site URL for SEO — read raw process.env (not the validated proxy) so the
// production build never requires secrets to collect metadata.
const siteUrl = process.env.APP_URL ?? 'https://tavakoli-direct.vercel.app';

const seoDescription =
  'دایرکت هوشمند توکلی استودیو: پاسخ خودکار به دایرکت و کامنت اینستاگرام، ساخت سناریوهای گفتگو، جمع‌آوری سرنخ و صندوق پیام مشترک تیمی بر پایهٔ ابزارهای رسمی متا. ویژهٔ باشگاه مشتریان توکلی استودیو.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${APP_NAME} — دایرکت هوشمند اینستاگرام | توکلی استودیو`,
    template: `%s | ${APP_NAME}`,
  },
  description: seoDescription,
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
    title: `${APP_NAME} — دایرکت هوشمند اینستاگرام | توکلی استودیو`,
    description: seoDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — دایرکت هوشمند اینستاگرام | توکلی استودیو`,
    description: seoDescription,
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
