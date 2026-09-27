import "server-only";
import { config } from "@/lib/config";
import { identity } from "@/lib/server";
import { collectionCopy } from "@/lib/restricted-editorial-copy";
import { vt } from "@/lib/verification-copy";
import type { Locale } from "@/lib/domain";
import { ExperienceFilm } from "./final-experience";
export async function RestrictedEditorial({ locale }: { locale: Locale }) {
  const s = await identity();
  if (s.identity.account_state !== "verified_18_plus")
    throw Error("Verified access required");
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
          <h1>{copy.eyebrow}</h1>
          <p>{copy.adults}</p>
          <nav className="actions">
            <a className="button light" href={`/${locale}/club/membership`}>
              {vt(locale, "choose")}
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
          <h2>{copy.craftTitle}</h2>
          <p>{copy.craftText}</p>
          <h2>{copy.storageTitle}</h2>
          <p>{copy.storageText}</p>
          <h2>{copy.responsibleTitle}</h2>
          <p>{copy.responsibleText}</p>
        </div>
      </section>
    </div>
  );
}
