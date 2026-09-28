import "server-only";
import { config } from "@/lib/config";
import { notFound } from "next/navigation";
import { verifiedClubSession } from "@/lib/club-access";
import { collectionCopy } from "@/lib/restricted-editorial-copy";
import { referenceBrands, referenceLibrary } from "@/lib/restricted-references";
import { rt } from "@/lib/reference-copy";
import { vt } from "@/lib/verification-copy";
import type { Locale } from "@/lib/domain";
import { ExperienceFilm } from "./final-experience";
import "@/app/restricted-references.css";

export async function RestrictedEditorial({ locale, query }: {
  locale: Locale;
  query: Record<string, string | string[] | undefined>;
}) {
  await verifiedClubSession();
  const brand = query.brand;
  if (brand !== undefined && !referenceBrands.some((value) => value === brand)) notFound();
  if (query.reference !== undefined && typeof query.reference !== "string") notFound();
  const references = referenceLibrary.filter((reference) => !brand || reference.brand === brand);
  const selected = query.reference
    ? references.find((reference) => reference.slug === query.reference)
    : references[0];
  if (!selected) notFound();
  const href = (selectedBrand?: string, slug?: string) => {
    const params = new URLSearchParams();
    if (selectedBrand) params.set("brand", selectedBrand);
    if (slug) params.set("reference", slug);
    const query = params.toString();
    return `/${locale}/club/collection${query ? `?${query}` : ""}#reference-library`;
  };
  const copy = collectionCopy[locale];
  return (
    <div className="restricted-editorial">
      {config().local && (
        <div className="review-label">{vt(locale, "testBadge")}</div>
      )}
      <section className="club-account-hero">
        <ExperienceFilm locale={locale} name="evening" />
        <div className="club-account-copy">
          <p className="film-eyebrow">VARATHANS25 · 18+</p>
          <h1>{rt(locale, "title")}</h1>
          <p>{rt(locale, "intro")}</p>
          <nav className="actions">
            <a className="button light" href="#reference-library">
              {rt(locale, "browse")}
            </a>
            <a className="film-link" href={`/${locale}/club`}>
              {vt(locale, "dashboard")}
            </a>
          </nav>
        </div>
      </section>
      <section className="container section restricted-study">
        <figure>
          <img
            src="/api/club/media/open"
            alt={copy.openAlt}
            width="1536"
            height="1024"
          />
          <figcaption>{copy.revealText}</figcaption>
        </figure>
        <div>
          <p className="eyebrow">{rt(locale, "packaging")}</p>
          <h2 className="reference-signature-title">{rt(locale, "signature")}</h2>
          <p>{copy.status}</p>
          <h2>{copy.craftTitle}</h2>
          <p>{copy.craftText}</p>
          <h2>{copy.storageTitle}</h2>
          <p>{copy.storageText}</p>
        </div>
      </section>
      <section className="container section reference-library" id="reference-library" tabIndex={-1} aria-labelledby="reference-library-title">
        <header className="reference-heading">
          <div>
            <p className="eyebrow">VARATHANS25 · 18+</p>
            <h2 id="reference-library-title">{rt(locale, "references")}</h2>
          </div>
          <p className="reference-count">{references.length} {rt(locale, "count")}</p>
        </header>
        <nav className="reference-filters" aria-label={rt(locale, "filter")}>
          <a href={href()} aria-current={!brand ? "page" : undefined}>{rt(locale, "all")}</a>
          {referenceBrands.map((value) => <a key={value} href={href(value)} aria-current={brand === value ? "page" : undefined}>{value}</a>)}
        </nav>
        <div className="reference-layout">
          <nav className="reference-index" aria-label={rt(locale, "index")}>
            <ol>
              {references.map((reference) => (
                <li key={reference.slug}>
                  <a href={href(typeof brand === "string" ? brand : undefined, reference.slug)} aria-current={selected.slug === reference.slug ? "true" : undefined}>
                    <span>{reference.name}</span>
                    <small>{reference.format}</small>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article className="reference-detail" aria-labelledby="reference-name" data-reference={selected.slug}>
            <figure>
              <img src={selected.image} alt={`${rt(locale, "image")} · ${selected.name}`} width="960" height="640" decoding="async" />
            </figure>
            <div className="reference-detail-copy">
              <p className="eyebrow">{selected.brand} · {rt(locale, "detail")}</p>
              <h3 id="reference-name">{selected.name}</h3>
              <dl>
                <div><dt>{rt(locale, "brand")}</dt><dd>{selected.brand}</dd></div>
                <div><dt>{rt(locale, "collection")}</dt><dd>{selected.collection}</dd></div>
                <div><dt>{rt(locale, "format")}</dt><dd>{selected.format}</dd></div>
                {selected.lengthMm !== null && <div><dt>{rt(locale, "length")}</dt><dd>{selected.lengthMm} mm</dd></div>}
                {selected.ringGauge !== null && <div><dt>{rt(locale, "ring")}</dt><dd>{selected.ringGauge}</dd></div>}
                <div><dt>{rt(locale, "status")}</dt><dd>{rt(locale, "preview")}</dd></div>
              </dl>
              <p>{rt(locale, "availability")}</p>
              {selected.lengthMm === null && selected.ringGauge === null && <p className="reference-note">{rt(locale, "unknownSize")}</p>}
              <p className="reference-note">{rt(locale, "readOnly")}</p>
            </div>
          </article>
        </div>
      </section>
      <section className="container section reference-concepts" aria-labelledby="reference-concepts-title">
        <p className="eyebrow">{rt(locale, "packaging")}</p>
        <h2 id="reference-concepts-title">{rt(locale, "concepts")}</h2>
        <div className="reference-concept-pair">
          {([4, 6] as const).map((size) => <article key={size} data-box-concept={size}>
            <span className="reference-concept-number" aria-hidden="true">0{size}</span>
            <div>
              <h3>{rt(locale, size === 4 ? "four" : "six")}</h3>
              <p>{rt(locale, size === 4 ? "fourText" : "sixText")}</p>
              <p className="reference-note">{rt(locale, "readOnly")}</p>
            </div>
          </article>)}
        </div>
        <aside className="reference-responsible">
          <h2>{copy.responsibleTitle}</h2>
          <p>{copy.responsibleText}</p>
        </aside>
      </section>
    </div>
  );
}
