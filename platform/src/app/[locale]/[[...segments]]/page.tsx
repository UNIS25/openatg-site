import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Platform from "@/components/platform";
import { locales, type Locale } from "@/lib/domain";
import { identity } from "@/lib/server";
import { verificationDestination } from "@/lib/club-state";
import { RestrictedEditorial } from "@/components/restricted-editorial";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; segments?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: language, segments = [] } = await params;
  if (!locales.includes(language as Locale)) notFound();
  const locale = language as Locale;
  const path = segments.join("/");
  const restricted = [
    "club/member",
    "club/collection",
    "club/account",
    "club/membership",
  ].includes(path);
  const verification = [
    "verify-age",
    "verification-pending",
    "verification-result",
  ].includes(path);
  const administrative = ["admin", "admin/verification"].includes(path);
  if (
    ![
      "",
      "store",
      "club",
      "membership",
      "shop",
      "tea",
      "pantry",
      "account",
      "bag",
      "login",
      "register",
      "reset",
      "privacy",
    ].includes(path) &&
    !restricted &&
    !verification &&
    !administrative &&
    !path.startsWith("product/")
  )
    notFound();
  if (restricted || verification || administrative) {
    const s = await identity().catch(() => null);
    if (!s) {
      if ((await cookies()).get("v25_refresh")?.value)
        redirect(
          `/auth/refresh?next=${encodeURIComponent(`/${locale}/${path}`)}`,
        );
      redirect(`/${locale}/login?next=${encodeURIComponent(path)}`);
    }
    if (administrative) {
      if (
        path === "admin/verification"
          ? !s.identity.admin
          : !s.identity.admin && !s.identity.staff && !s.identity.role
      )
        redirect(`/${locale}/account?access=denied`);
    } else if (restricted && s.identity.account_state !== "verified_18_plus")
      redirect(verificationDestination(locale, s.identity.account_state));
    else if (verification) {
      const next = verificationDestination(locale, s.identity.account_state);
      // Result is a valid screen for rejected/suspended users; expiry must go through a fresh submission.
      if (next !== `/${locale}/${path}`) redirect(next);
    }
  }
  return (
    <Platform
      locale={locale}
      page={path}
      restrictedContent={
        path === "club/collection" ? (
          <RestrictedEditorial locale={locale} query={await searchParams} />
        ) : undefined
      }
    />
  );
}
