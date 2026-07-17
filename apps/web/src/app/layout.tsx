import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import { APP_NAME, APP_TAGLINE_FA } from '@tavakoli/config';
import './globals.css';

const vazir = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazir',
  display: 'swap',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE_FA,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
