import type { Metadata } from "next";
import { headers } from "next/headers";
import "./style.css";
import "./cinematic.css";
export const metadata: Metadata = {
  title: "Varathans25 · Private staging",
  description: "Varathans25 local review platform",
  robots: { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers();
  return (
    <html lang="de">
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
