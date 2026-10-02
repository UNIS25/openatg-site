"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { usePlatform, LanguageLinks, ProductCard } from "./platform";
import {
  defaultExperience,
  et,
  experienceText,
  type ExperienceConfig,
} from "@/lib/experience";
import { stateName } from "@/lib/messages";
import { api } from "@/lib/client";
import { money, type Locale } from "@/lib/domain";
import { vt } from "@/lib/verification-copy";
import { polishText } from "@/lib/polish";
import { MembershipComparison } from "./membership-comparison";

const root = "/varathans25/visual-reset";
const logo = "/varathans25/brand/varathans25-transparent.png";
const premiumHero = "/varathans25/media/v25-premium-hero-1600.webp";
const premiumHeroMobile =
  "/varathans25/media/v25-premium-hero-mobile.webp";
const premiumHeroFilm =
  "/varathans25/media/v25-premium-hero-1600.mp4";
type Connection = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (event: string, callback: () => void) => void;
  removeEventListener?: (event: string, callback: () => void) => void;
};

export function ExperienceFilm({
  name,
  posterOnly = false,
  locale,
}: {
  name: "highlands" | "tea" | "evening" | "kitchen";
  posterOnly?: boolean;
  locale: Locale;
}) {
  const premiumGateway = name === "evening";
  const poster = premiumGateway ? premiumHero : `${root}/${name}-poster.webp`;
  const mobilePoster = premiumGateway
    ? premiumHeroMobile
    : `${root}/${name}-poster.webp`;
  const player = useRef<HTMLVideoElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [source, setSource] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 700px)");
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    const update = () =>
      setAllowed(
        !posterOnly &&
          !motion.matches &&
          !mobile.matches &&
          !connection?.saveData &&
          !["slow-2g", "2g", "3g"].includes(connection?.effectiveType || ""),
      );
    update();
    motion.addEventListener("change", update);
    mobile.addEventListener("change", update);
    connection?.addEventListener?.("change", update);
    return () => {
      motion.removeEventListener("change", update);
      mobile.removeEventListener("change", update);
      connection?.removeEventListener?.("change", update);
    };
  }, [posterOnly]);
  useEffect(() => {
    if (allowed)
      setSource(
        premiumGateway ? premiumHeroFilm : `${root}/${name}-1600.mp4`,
      );
    else {
      setSource(undefined);
      setStarted(false);
    }
  }, [allowed, name, premiumGateway]);
  useEffect(() => {
    const video = player.current;
    if (!video) return;
    let inView = true;
    const update = () => {
      if (!allowed || paused || document.hidden || !inView || failed)
        video.pause();
      else if (source) void video.play().catch(() => setPlaying(false));
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(video);
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      video.pause();
    };
  }, [source, allowed, paused, failed]);
  const toggle = () => {
    if (playing) {
      setPaused(true);
      player.current?.pause();
    } else {
      setPaused(false);
      void player.current?.play().catch(() => setPlaying(false));
    }
  };
  return (
    <div
      className="experience-film"
      data-film={name}
      data-playing={playing}
      data-premium-hero={premiumGateway ? "true" : undefined}
    >
      <picture>
        <source media="(max-width: 700px)" srcSet={mobilePoster} />
        <img
          className="film-poster"
          src={poster}
          alt=""
          width="1600"
          height="900"
          fetchPriority="high"
        />
      </picture>
      <video
        ref={player}
        src={source}
        className={`film-video ${started && !failed ? "film-started" : ""}`}
        poster={poster}
        muted
        playsInline
        loop
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => {
          setPlaying(true);
          setStarted(true);
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setFailed(true);
          setPlaying(false);
        }}
      />
      <div className="film-shade" />
      <div className="film-controls">
        {allowed && !failed ? (
          <button
            type="button"
            onClick={toggle}
            aria-label={et(locale, playing ? "pause" : "play")}
          >
            <span>{et(locale, playing ? "pause" : "play")}</span>
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
        ) : (
          <span>{et(locale, "still")}</span>
        )}
      </div>
    </div>
  );
}
export function Gateway({
  config = defaultExperience,
}: {
  config?: ExperienceConfig;
}) {
  const { locale, tr } = usePlatform();
  return (
    <main id="content" className="gateway">
      <ExperienceFilm
        name="evening"
        posterOnly={config.gateway_film === "poster-only"}
        locale={locale}
      />
      <header className="gateway-nav">
        <LanguageLinks />
        <a className="gateway-account" href={`/${locale}/login`}>
          {tr("login")} <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </header>
      <div className="gateway-copy">
        <a
          className="gateway-logo"
          href={`/${locale}/`}
          aria-label="Varathans25"
        >
          <img src={logo} alt="Varathans25" width="368" height="200" />
        </a>
        <h1>{experienceText(locale, "gatewayTitle", config)}</h1>
        <div className="gateway-choices">
          <a href={`/${locale}/store`}>
            {et(locale, "explore")}
            <ArrowUpRight size={19} aria-hidden="true" />
          </a>
          <a href={`/${locale}/club`}>
            {et(locale, "enter")}
            <ArrowUpRight size={19} aria-hidden="true" />
          </a>
        </div>
      </div>
    </main>
  );
}
export function StoreHome({
  config = defaultExperience,
}: {
  config?: ExperienceConfig;
}) {
  const { locale, products, polish, threshold } = usePlatform();
  const text = (key: Parameters<typeof experienceText>[1]) =>
    experienceText(locale, key, config);
  const teas = products.filter((p) => p.category === "tea");
  const curry = products.find((p) => p.slug === "gelber-curry-kokos");
  return (
    <div className="store-home">
      <section className="store-film-hero">
        <ExperienceFilm
          name="highlands"
          posterOnly={config.store_film === "poster-only"}
          locale={locale}
        />
        <div className="store-hero-copy">
          <p className="film-eyebrow">VARATHANS25 · {et(locale, "store")}</p>
          <h1>{text("storeTitle")}</h1>
          <p>{text("storeText")}</p>
          <a className="film-link" href="#tea-collection">
            {et(locale, "tea")} <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
      <section className="tea-pouring-chapter" aria-labelledby="tea-pouring-heading">
        <ExperienceFilm name="tea" locale={locale} />
        <div className="tea-pouring-copy">
          <p className="film-eyebrow">VARATHANS25 · 02</p>
          <h2 id="tea-pouring-heading">{et(locale, "teaPouring")}</h2>
          <p>{et(locale, "teaPouringText")}</p>
          <a className="film-link" href="#tea-collection">{et(locale, "tea")} <ArrowUpRight size={18} aria-hidden="true" /></a>
        </div>
      </section>
      <section
        className="store-chapter tea-editorial container"
        id="tea-collection"
        aria-labelledby="tea-heading"
      >
        <div className="chapter-heading">
          <div>
            <p className="eyebrow">03 / PREMIUM TEA COLLECTION</p>
            <h2 id="tea-heading">{text("teaTitle")}</h2>
          </div>
          <div>
            <p>{text("teaText")}</p>
            <a className="editorial-link" href={`/${locale}/shop?category=tea`}>
              {et(locale, "tea")} <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="product-grid store-tea-grid">
          {teas.map((p) => <ProductCard product={p} key={p.slug} />)}
        </div>
      </section>
      <section className="spice-film-chapter" aria-labelledby="spice-heading">
        <ExperienceFilm
          name="kitchen"
          posterOnly={polish.spice_film === "poster-only"}
          locale={locale}
        />
        <div className="spice-film-copy">
          <p className="film-eyebrow">04 / VARATHANS25</p>
          <h2 id="spice-heading">{polishText(polish, locale, "spiceTitle")}</h2>
          <p>{polishText(polish, locale, "spiceText")}</p>
        </div>
      </section>
      <section className="curry-editorial" aria-labelledby="curry-heading">
        <div className="container curry-layout">
          <div>
            <p className="eyebrow">05 / VARATHANS25 CURRY</p>
            <h2 id="curry-heading">{text("curryTitle")}</h2>
            <p>{text("curryText")}</p>
          </div>
          {curry && <ProductCard product={curry} />}
        </div>
      </section>
      <section className="store-service-line container" id="delivery">
        <a className="editorial-link" href={`/${locale}/shop`}>
          {et(locale, "catalogue")}{" "}
          <ArrowUpRight size={17} aria-hidden="true" />
        </a>
        <p>
          {polishText(polish, locale, "silverThreshold", {
            threshold: money(threshold, locale),
          })}{" "}
          · {et(locale, "delivery")}
        </p>
      </section>
      <section
        className="restaurant-closing"
        aria-labelledby="restaurant-heading"
      >
        <img
          src={`/varathans25/images/restaurant/${polish.restaurant_image}.webp`}
          alt={polishText(polish, locale, "restaurantAlt")}
          width="768"
          height="1024"
          loading="lazy"
        />
        <div>
          <p className="eyebrow">06 / VARATHANS25 · RESTAURANT</p>
          <h2 id="restaurant-heading">
            {polishText(polish, locale, "restaurantTitle")}
          </h2>
          <p>{polishText(polish, locale, "restaurantText")}</p>
          <a
            className="editorial-link"
            href={polish.restaurant_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {polishText(polish, locale, "restaurantCta")}{" "}
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}

export function ClubEntrance({
  config = defaultExperience,
}: {
  config?: ExperienceConfig;
}) {
  const { locale } = usePlatform();
  return (
    <div className="club-entrance">
      <section className="club-account-hero">
        <ExperienceFilm
          name="evening"
          posterOnly={config.club_film === "poster-only"}
          locale={locale}
        />
        <div className="club-account-copy">
          <p className="film-eyebrow">VARATHANS25 · 18+</p>
          <h1>{experienceText(locale, "clubTitle", config)}</h1>
          <p>{experienceText(locale, "clubText", config)}</p>
          <div className="actions">
            <a className="button light" href={`/${locale}/club/collection#reference-library`}>{et(locale, "viewProducts")}</a>
            <a className="film-link" href={`/${locale}/membership`}>{et(locale, "joinClub")} <ArrowUpRight size={16} aria-hidden="true" /></a>
            <a className="film-link" href={`/${locale}/login?next=club/member`}>{et(locale, "existingMember")} <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
          <p className="club-age">{et(locale, "age")}</p>
        </div>
      </section>
      <MembershipComparison />
      <section className="club-access club-account-access container">
        <a className="editorial-link" href={`/${locale}/club/member`}>
          {et(locale, "member")} <ArrowUpRight size={18} aria-hidden="true" />
        </a>
        <p className="club-lock-note">{et(locale, "disabled")}</p>
      </section>
    </div>
  );
}

export function MemberArea() {
  const { state, locale, tr, run, polish, delivery, threshold } = usePlatform();
  const [pass, setPass] = useState<{ qr: string; expires_at: string } | null>(
    null,
  );
  if (!state?.identity.active || !state.identity.verified)
    return (
      <section className="container section member-locked">
        <p className="eyebrow">VARATHANS25 · 18+</p>
        <h1>{et(locale, "member")}</h1>
        <p>{et(locale, "verificationRequired")}</p>
        <a
          className="button"
          href={
            state ? `/${locale}/account` : `/${locale}/login?next=club/member`
          }
        >
          {state ? tr("account") : tr("login")}
        </a>
        <p>{et(locale, "age")}</p>
      </section>
    );
  const member = state.rows.members?.[0];
  const membership = state.rows.memberships?.[0];
  const tier = vt(locale, state.identity.membership_state);
  const orders = state.rows.orders || [];
  return (
    <section className="member-area container section">
      <div className="member-welcome">
        <div>
          <p className="eyebrow">VARATHANS25 · {et(locale, "member")}</p>
          <h1>{member?.name}</h1>
          <p>
            {tr("verification")}:{" "}
            <strong>
              {vt(locale, state.identity.account_state)}{" "}
              {state.rows.member_verifications?.[0]?.is_test &&
                `· ${vt(locale, "testBadge")}`}
            </strong>
          </p>
        </div>
        <a className="editorial-link" href={`/${locale}/account`}>
          {et(locale, "privacy")} <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </div>
      <div className="member-overview">
        <section className="digital-pass">
          <a href={`/${locale}/`} aria-label="Varathans25">
            <img src={logo} alt="Varathans25" width="184" height="100" />
          </a>
          <p>{et(locale, "pass")}</p>
          <h2>{member?.name}</h2>
          <div>
            <strong>{tier}</strong>
            <span>{stateName(locale, membership?.status || "pending")}</span>
          </div>
          {state.identity.gold && (
            <button
              onClick={() =>
                void run(async () =>
                  setPass(
                    await api("/api/pass", {
                      action: "pass",
                      key: crypto.randomUUID(),
                    }),
                  ),
                )
              }
            >
              {tr("createPass")}
            </button>
          )}
          {pass && (
            <div className="member-qr">
              <img src={pass.qr} alt={tr("passAlt")} width="180" height="180" />
              <p>
                {tr("expires")}:{" "}
                {new Date(pass.expires_at).toLocaleTimeString(`${locale}-CH`)}
              </p>
            </div>
          )}
        </section>
        <section className="member-status">
          <p className="eyebrow">{tr("membership")}</p>
          <h2>{tier}</h2>
          <dl>
            <div>
              <dt>{tr("status")}</dt>
              <dd>{stateName(locale, membership?.status || "pending")}</dd>
            </div>
            {membership?.period_end && (
              <div>
                <dt>{tr("periodEnd")}</dt>
                <dd>
                  {new Date(membership.period_end).toLocaleDateString(
                    `${locale}-CH`,
                  )}
                </dd>
              </div>
            )}
          </dl>
          {membership?.cancel_at_period_end && <p>{tr("cancelScheduled")}</p>}
          <div className="verification-links">
            <a href={`/${locale}/club/membership`}>{vt(locale, "choose")} →</a>
            <a href={`/${locale}/club/collection`}>
              {vt(locale, "collection")} →
            </a>
            <a href={`/${locale}/club/account`}>{tr("account")} →</a>
          </div>
          <p>{vt(locale, "benefits")}</p>
          <h3>{et(locale, "benefits")}</h3>
          <ul className="member-benefits">
            {(!["silver", "gold"].includes(state.identity.membership_state)
              ? []
              : state.identity.gold
                ? ([
                    "goldDelivery",
                    "goldDiscount",
                    "goldDrink",
                    "goldPass",
                    "goldBenefits",
                  ] as const)
                : ([
                    "silverRecurring",
                    "silverDelivery",
                    "silverThreshold",
                    "silverProfile",
                    "silverPreferences",
                  ] as const)
            ).map((key) => (
              <li key={key}>
                {polishText(polish, locale, key, {
                  delivery: money(delivery, locale),
                  threshold: money(threshold, locale),
                  discount: String(
                    (state.rows.membership_plans?.find(
                      (p) => p.id === membership?.plan_id,
                    )?.discount_bps || 0) / 100,
                  ),
                })}
              </li>
            ))}
          </ul>
          <p className="staging-terms">{polishText(polish, locale, "terms")}</p>
          <h3>{et(locale, "redemptions")}</h3>
          <p>
            {state.rows.benefit_redemptions?.length
              ? `${state.rows.benefit_redemptions.length} · ${tr("saved")}`
              : et(locale, "noRedemptions")}
          </p>
        </section>
      </div>
      <section className="member-orders">
        <h2>{tr("orders")}</h2>
        {orders.length ? (
          <p>
            {orders.length} ·{" "}
            <a href={`/${locale}/account`}>{tr("orders")} →</a>
          </p>
        ) : (
          <p>{tr("noRecords")}</p>
        )}
      </section>
      <p className="muted">{et(locale, "disabled")}</p>
    </section>
  );
}
