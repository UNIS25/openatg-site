import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PackagingGallery from '@/components/packaging-gallery';
import { collectionCopy, packagingImage, packagingSrcSet } from '@/lib/collection-copy';
import { isLocale } from '@/lib/i18n';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { title: collectionCopy[locale].title, description: collectionCopy[locale].status, robots: { index: false, follow: false, noarchive: true } };
}

export default async function CollectionPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = collectionCopy[locale];
  return <article className="collection-page">
    <header className="collection-heading">
      <p className="collection-eyebrow">{c.eyebrow}</p>
      <h1>{c.title}</h1>
    </header>
    <section className="collection-introduction" aria-label={c.gallery}>
      <PackagingGallery locale={locale} />
      <div className="collection-intro-copy">
        <p className="collection-status">{c.status}</p>
        <p className="collection-lead">{c.introduction}</p>
        <p className="collection-presented">{c.presented}</p>
        <aside className="collection-adults"><span aria-hidden="true">18+</span><p>{c.adults}</p></aside>
      </div>
    </section>
    <section className="collection-reveal" aria-labelledby="reveal-title">
      <div>
        <p className="collection-eyebrow">{c.revealLabel}</p>
        <h2 id="reveal-title">{c.revealTitle}</h2>
        <p>{c.revealText}</p>
      </div>
      <img src={packagingImage('open')} srcSet={packagingSrcSet('open')}
        sizes="(max-width: 760px) calc(100vw - 48px), 55vw"
        width="1536" height="1024" alt={c.openAlt} loading="lazy" />
    </section>
    <div className="collection-notes">
      <section aria-labelledby="craft-title"><h2 id="craft-title">{c.craftTitle}</h2><p>{c.craftText}</p></section>
      <section aria-labelledby="presentation-title"><h2 id="presentation-title">{c.presentationTitle}</h2><p>{c.presentationText}</p></section>
      <section aria-labelledby="storage-title"><h2 id="storage-title">{c.storageTitle}</h2><p>{c.storageText}</p></section>
    </div>
    <section className="collection-responsible" aria-labelledby="responsible-title">
      <h2 id="responsible-title">{c.responsibleTitle}</h2><p>{c.responsibleText}</p>
      <a href={c.informationUrl}>{c.informationLink}<span aria-hidden="true"> ↗</span></a>
    </section>
  </article>;
}
