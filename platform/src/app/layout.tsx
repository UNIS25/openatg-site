import type { Metadata } from "next";
import { headers } from "next/headers";
import "./style.css";
import "./cinematic.css";
import "./experience.css";
export const metadata: Metadata = {
  title: "Varathans25 · Tee, Curry & Club",
  description: "Varathans25 local review platform",
  robots: { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-v25-locale") || "de";
  return (
    <html lang={locale}>
      <head>
        <link
          rel="preload"
          href="/varathans25/fonts/inter-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
