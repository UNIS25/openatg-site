import type { Metadata } from "next";
import { headers } from "next/headers";
import "./style.css";
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
      <body>{children}</body>
    </html>
  );
}
