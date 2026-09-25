/* eslint-disable @next/next/no-css-tags -- Reuse the approved storefront's exact immutable stylesheets without rebuilding or overwriting them. */
import type { Metadata } from 'next';
import './editorial.css';

export const metadata: Metadata = {
  title: 'Varathans Cigar Collection · 18+ — Packaging concept',
  robots: { index: false, follow: false, noarchive: true },
  icons: { icon: '/varathans25/brand/varathans25-original.png' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="de" suppressHydrationWarning><head>
    <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; base-uri 'self'; object-src 'none'; form-action 'none'; upgrade-insecure-requests" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <link rel="stylesheet" href="/varathans25/_next/static/chunks/1m04jr2gni_51.css" />
    <link rel="stylesheet" href="/varathans25/_next/static/chunks/0005g2_i28x_6.css" />
    <link rel="preload" href="/varathans25/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
  </head><body className="editorial-document">{children}</body></html>;
}
