import { notFound } from "next/navigation";
import Platform from "@/components/platform";
import { locales, type Locale } from "@/lib/domain";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; segments?: string[] }>;
}) {
  const { locale, segments = [] } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const path = segments.join("/");
  if (
    ![
      "",
      "store",
      "shop",
      "club/member",
      "tea",
      "pantry",
      "club",
      "membership",
      "account",
      "bag",
      "login",
      "register",
      "reset",
      "admin",
      "privacy",
    ].includes(path) &&
    !path.startsWith("product/")
  )
    notFound();
  return <Platform locale={locale as Locale} page={path} />;
}
