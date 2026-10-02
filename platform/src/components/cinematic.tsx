"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import { ArrowRight, Pause, Play, X } from "lucide-react";
import { type Locale, locales } from "@/lib/domain";
import { t } from "@/lib/messages";
import { ct, type CinemaKey } from "@/lib/cinematic-copy";
import {
  defaultEditorial,
  editorialSchema,
  invitationScheduled,
  invitationPage,
  motionPermitted,
  type EditorialConfig,
} from "@/lib/cinematic";
import { defaultExperience } from "@/lib/experience";
const root = "/varathans25/";
let playing: HTMLVideoElement | null = null;
let dialogOpen = false;
type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };
type Battery = EventTarget & { charging: boolean; level: number };
export function Film({
  locale,
  enabled = true,
  gateway = false,
}: {
  locale: Locale;
  enabled?: boolean;
  gateway?: boolean;
}) {
  const container = useRef<HTMLElement>(null),
    video = useRef<HTMLVideoElement>(null),
    visible = useRef(false),
    paused = useRef(false);
  const [permitted, setPermitted] = useState(false),
    [failed, setFailed] = useState(false),
    [running, setRunning] = useState(false),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
      mobile = matchMedia("(max-width: 760px), (pointer: coarse)");
    const nav = navigator as Navigator & {
      connection?: Connection;
      getBattery?: () => Promise<Battery>;
    };
    let battery: Battery | undefined,
      cancelled = false;
    const update = () => {
      if (!cancelled)
        setPermitted(
          enabled &&
            motionPermitted({
              reduced: reduced.matches,
              mobile: mobile.matches,
              saveData: nav.connection?.saveData,
              effectiveType: nav.connection?.effectiveType,
              lowBattery: battery
                ? !battery.charging && battery.level < 0.2
                : false,
            }),
        );
    };
    reduced.addEventListener("change", update);
    mobile.addEventListener("change", update);
    nav.connection?.addEventListener("change", update);
    update();
    nav
      .getBattery?.()
      .then((b) => {
        if (cancelled) return;
        battery = b;
        b.addEventListener("levelchange", update);
        b.addEventListener("chargingchange", update);
        update();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      reduced.removeEventListener("change", update);
      mobile.removeEventListener("change", update);
      nav.connection?.removeEventListener("change", update);
      battery?.removeEventListener("levelchange", update);
      battery?.removeEventListener("chargingchange", update);
    };
  }, [enabled]);
  useEffect(() => {
    const host = container.current;
    const currentVideo = video.current;
    if (!host) return;
    const control = () => {
      const v = video.current;
      if (!v) return;
      if (
        visible.current &&
        !document.hidden &&
        !dialogOpen &&
        !paused.current &&
        permitted &&
        !failed
      ) {
        if (playing && playing !== v) playing.pause();
        playing = v;
        v.muted = true;
        void v.play().catch(() => {
          setRunning(false);
        });
      } else v.pause();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible.current = entries[0].intersectionRatio >= 0.35;
        if (visible.current && permitted) setLoaded(true);
        control();
      },
      { threshold: [0, 0.35] },
    );
    observer.observe(host);
    document.addEventListener("visibilitychange", control);
    window.addEventListener("v25:dialog", control);
    window.addEventListener("v25:play-control", control);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", control);
      window.removeEventListener("v25:dialog", control);
      window.removeEventListener("v25:play-control", control);
      if (currentVideo) {
        currentVideo.pause();
        if (playing === currentVideo) playing = null;
      }
    };
  }, [permitted, failed, loaded]);
  return (
    <figure
      ref={container}
      className={`cinema-film ${gateway ? "gateway-film" : ""}`}
      data-motion={permitted && !failed ? "eligible" : "poster"}
    >
      <picture>
        <source
          media="(max-width:760px)"
          srcSet={`${root}media/daylight-poster-mobile.webp`}
        />
        <img
          src={`${root}media/daylight-poster-1280.webp`}
          width="1280"
          height="720"
          alt={gateway ? t(locale, "restaurantAlt") : ct(locale, "filmAlt")}
          fetchPriority="high"
        />
      </picture>
      {permitted && loaded && !failed && (
        <video
          ref={video}
          muted
          playsInline
          loop
          autoPlay
          preload="none"
          width="1280"
          height="720"
          poster={`${root}media/daylight-poster-1280.webp`}
          aria-hidden="true"
          tabIndex={-1}
          onPlay={() => setRunning(true)}
          onPause={() => setRunning(false)}
          onError={(event) => {
            if (event.target === event.currentTarget) {
              setFailed(true);
              setRunning(false);
            }
          }}
        >
          <source
            src={`${root}media/daylight-study-960.mp4`}
            type="video/mp4"
            media="(max-width:1100px)"
          />
          <source
            src={`${root}media/daylight-study-1280.webm`}
            type="video/webm"
          />
          <source
            src={`${root}media/daylight-study-1280.mp4`}
            type="video/mp4"
            onError={() => {
              setFailed(true);
              setRunning(false);
            }}
          />
        </video>
      )}
      <figcaption className="film-caption">
        <span>{ct(locale, "study")}</span>
        {permitted && !failed ? (
          <button
            type="button"
            className="film-control"
            aria-label={ct(locale, running ? "pause" : "play")}
            onClick={() => {
              paused.current = running;
              window.dispatchEvent(new Event("v25:play-control"));
            }}
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
            <span>{ct(locale, running ? "pause" : "play")}</span>
          </button>
        ) : (
          <span>{ct(locale, "poster")}</span>
        )}
      </figcaption>
      {failed && (
        <span className="visually-hidden" role="status">
          {ct(locale, "fallback")}
        </span>
      )}
    </figure>
  );
}
export function CinematicEntrance({ locale }: { locale: Locale }) {
  const [preferred, setPreferred] = useState<Locale | null>(null);
  useEffect(() => {
    try {
      const l = localStorage.getItem("v25_language") as Locale;
      if (locales.includes(l)) setPreferred(l);
    } catch {}
  }, []);
  return (
    <main id="content" className="cinematic-gateway">
      <Film locale={locale} gateway enabled={false} />
      <section className="gateway-card" aria-labelledby="gateway-title">
        <img
          src={`${root}brand/varathans25-original.png`}
          className="logo"
          width="180"
          height="98"
          alt="Varathans25"
        />
        <h1 id="gateway-title">Deutsch. Français. English.</h1>
        <nav
          aria-label="Sprache · Langue · Language"
          className="gateway-languages"
        >
          {(
            [
              ["de", "Deutsch"],
              ["fr", "Français"],
              ["en", "English"],
            ] as const
          ).map(([l, name]) => (
            <a
              key={l}
              lang={l}
              href={`/${l}/`}
              onClick={() => {
                try {
                  localStorage.setItem("v25_language", l);
                } catch {}
              }}
            >
              {name}
              <ArrowRight size={18} />
            </a>
          ))}
        </nav>
        {preferred && (
          <a className="gateway-continue" href={`/${preferred}/`}>
            {t(preferred, "continue")} →
          </a>
        )}
      </section>
    </main>
  );
}
export function CinematicHome({
  locale,
  collection,
  config,
}: {
  locale: Locale;
  collection: ReactNode;
  config: EditorialConfig;
}) {
  const copy = (key: CinemaKey) =>
    config.copy?.[locale]?.[
      key as keyof NonNullable<EditorialConfig["copy"]>["en"]
    ] || ct(locale, key);
  const chapter = {
    tea: (
      <section className="cinema-chapter chapter-tea" id="chapter-tea">
        <div className="container chapter-intro">
          <p className="eyebrow">{ct(locale, "teaLabel")}</p>
          <h2>{copy("teaTitle")}</h2>
          <p className="lede">{copy("teaText")}</p>
        </div>
        {collection}
      </section>
    ),
    spice: (
      <section className="cinema-chapter chapter-spice" id="chapter-spice">
        <div className="container chapter-grid">
          <figure className="spice-still">
            <img
              src={`${root}images/gelber-curry-kokos.webp`}
              width="640"
              height="640"
              loading="lazy"
              alt="Gelber Curry Kokos"
            />
          </figure>
          <div className="chapter-copy">
            <p className="eyebrow">{ct(locale, "spiceLabel")}</p>
            <h2>{copy("spiceTitle")}</h2>
            <p className="lede">{copy("spiceText")}</p>
            <a className="text-link" href={`/${locale}/pantry`}>
              {ct(locale, "pantry")} <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>
    ),
    evening: (
      <section className="cinema-chapter chapter-evening" id="chapter-evening">
        <div className="container chapter-grid">
          <div className="chapter-copy">
            <p className="eyebrow">{ct(locale, "eveningLabel")}</p>
            <h2>{copy("eveningTitle")}</h2>
            <p className="lede">{copy("eveningText")}</p>
            <a className="text-link" href={`/${locale}/club`} data-club-entry>
              {ct(locale, "enter")} <ArrowRight size={18} />
            </a>
          </div>
          <figure>
            <img
              src={`${root}images/restaurant/bar-evening.webp`}
              width="1024"
              height="768"
              loading="lazy"
              alt={t(locale, "restaurantAlt")}
            />
            <figcaption>{ct(locale, "study")}</figcaption>
          </figure>
        </div>
      </section>
    ),
    restaurant: (
      <section
        className="cinema-chapter chapter-restaurant"
        id="chapter-restaurant"
      >
        <div className="container chapter-intro">
          <p className="eyebrow">{ct(locale, "restaurantLabel")}</p>
          <h2>{copy("restaurantTitle")}</h2>
          <p className="lede">{copy("restaurantText")}</p>
        </div>
        <div className="restaurant-diptych container">
          <figure>
            <img
              src={`${root}images/restaurant/dining-interior.webp`}
              width="768"
              height="1024"
              loading="lazy"
              alt={t(locale, "restaurantAlt")}
            />
          </figure>
          <figure>
            <img
              src={`${root}images/restaurant/rooftop-panorama.webp`}
              width="1280"
              height="720"
              loading="lazy"
              alt={t(locale, "rooftopAlt")}
            />
            <figcaption>{ct(locale, "study")}</figcaption>
          </figure>
        </div>
      </section>
    ),
  };
  return (
    <div className="cinematic-home">
      <section className="cinema-hero" aria-labelledby="cinema-title">
        <Film
          locale={locale}
          enabled={config.active_film === "daylight-study"}
        />
        <div className="container cinema-hero-copy">
          <div>
            <p className="eyebrow">{ct(locale, "heroEyebrow")}</p>
            <h1 id="cinema-title">{copy("heroTitle")}</h1>
            <p>{copy("heroText")}</p>
            <div className="actions">
              <a className="button light" href={`/${locale}/tea`}>
                {ct(locale, "discover")}
              </a>
              <a
                className="cinema-link"
                href={`/${locale}/club`}
                data-club-entry
              >
                {ct(locale, "enter")}
              </a>
            </div>
          </div>
        </div>
      </section>
      {config.chapter_order.map((key) => (
        <div key={key}>{chapter[key]}</div>
      ))}
    </div>
  );
}
export function ClubInvitation({
  locale,
  page,
  member,
  config,
}: {
  locale: Locale;
  page: string;
  member: boolean;
  config: EditorialConfig;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    previous = useRef<HTMLElement | null>(null),
    [open, setOpen] = useState(false);
  const eligible =
    !member && invitationPage(page) && invitationScheduled(config);
  const dismissed = () => {
    try {
      return sessionStorage.getItem("v25_editorial_invitation") === "dismissed";
    } catch {
      return true;
    }
  };
  const close = () => {
    try {
      sessionStorage.setItem("v25_editorial_invitation", "dismissed");
    } catch {}
    setOpen(false);
  };
  useEffect(() => {
    if (!eligible) return;
    const show = () => {
      if (
        !dismissed() &&
        document.visibilityState === "visible" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName || "",
        )
      ) {
        previous.current = document.activeElement as HTMLElement;
        setOpen(true);
      }
    };
    const timer = setTimeout(show, config.invitation_delay_ms);
    const click = (e: globalThis.MouseEvent) => {
      const a = (e.target as Element)?.closest<HTMLAnchorElement>("a[href]");
      if (
        !a ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0 ||
        dismissed()
      )
        return;
      if (a.pathname === `/${locale}/club`) {
        e.preventDefault();
        previous.current = a;
        setOpen(true);
      }
    };
    document.addEventListener("click", click);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", click);
    };
  }, [eligible, locale, config.invitation_delay_ms]);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && eligible) {
      d.showModal();
      document.body.classList.add("invitation-open");
      dialogOpen = true;
      window.dispatchEvent(new Event("v25:dialog"));
    } else {
      d.close();
      document.body.classList.remove("invitation-open");
      dialogOpen = false;
      window.dispatchEvent(new Event("v25:dialog"));
      previous.current?.focus({ preventScroll: true });
    }
    return () => {
      d.close();
      document.body.classList.remove("invitation-open");
      dialogOpen = false;
      window.dispatchEvent(new Event("v25:dialog"));
    };
  }, [open, eligible]);
  const backdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget) return;
    const b = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < b.left ||
      e.clientX > b.right ||
      e.clientY < b.top ||
      e.clientY > b.bottom
    )
      close();
  };
  return (
    <dialog
      ref={dialog}
      className="club-invitation"
      data-eligible={eligible}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invitation-title"
      aria-describedby="invitation-description"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={backdrop}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const focus = [
          ...e.currentTarget.querySelectorAll<HTMLElement>("button,a[href]"),
        ];
        const first = focus[0],
          last = focus.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <button
        className="invitation-close"
        autoFocus
        aria-label={ct(locale, "close")}
        onClick={close}
      >
        <X size={22} />
      </button>
      <div className="invitation-image">
        <img
          src={`${root}images/restaurant/dining-interior.webp`}
          width="768"
          height="1024"
          alt={t(locale, "restaurantAlt")}
        />
        <span>VARATHANS25 · {ct(locale, "study")}</span>
      </div>
      <section className="invitation-copy">
        <div className="invitation-brand">
          <img
            src={`${root}brand/varathans25-original.png`}
            width="150"
            height="82"
            alt="Varathans25"
          />
          <span className="adult-marker">18+</span>
        </div>
        <p className="eyebrow">{ct(locale, "account")}</p>
        <h2 id="invitation-title">VARATHANS25 PREMIUM CIGAR CLUB</h2>
        <p id="invitation-description">{ct(locale, "popupText")}</p>
        <p className="verification-notice">{ct(locale, "verifyNotice")}</p>
        <a
          className="button light invitation-join"
          href={`/${locale}/register`}
          onClick={close}
        >
          {ct(locale, "join")} <ArrowRight size={17} />
        </a>
        <a
          className="invitation-signin"
          href={`/${locale}/login`}
          onClick={close}
        >
          {ct(locale, "signin")}
        </a>
        <p className="invitation-legal">
          {ct(locale, "popupFooter")}{" "}
          <a href={`/${locale}/privacy`} onClick={close}>
            {ct(locale, "privacy")}
          </a>{" "}
          ·{" "}
          <a href={`/${locale}/membership`} onClick={close}>
            {ct(locale, "terms")}
          </a>
        </p>
        <a
          className="invitation-editorial"
          href={`/${locale}/club`}
          onClick={close}
        >
          {ct(locale, "editorial")} →
        </a>
      </section>
    </dialog>
  );
}
export function useEditorial() {
  const [config, setConfig] = useState<EditorialConfig>({
    ...defaultEditorial,
    experience: {
      ...defaultExperience,
      gateway_film: "evening",
      store_film: "tea",
      club_film: "evening",
    },
    invitation_enabled: false,
    active_film: "poster-only",
  });
  useEffect(() => {
    let mounted = true;
    fetch("/api/editorial")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const parsed = editorialSchema.safeParse(data);
        if (mounted && parsed.success) setConfig(parsed.data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  return config;
}
