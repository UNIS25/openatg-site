import { notFound } from 'next/navigation';
import { StoreProvider, StoreShell } from '@/components/store';
import { isLocale } from '@/lib/i18n';
import data from '@/data/shell.json';

export const dynamicParams = false;
export function generateStaticParams() { return ['de', 'fr', 'en'].map(locale => ({ locale })); }
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <StoreProvider locale={locale} {...data}><StoreShell>{children}</StoreShell></StoreProvider>;
}
