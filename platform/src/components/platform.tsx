"use client";
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useRef,
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  ShoppingBag,
  UserRound,
  Plus,
  Minus,
  ShieldCheck,
} from "lucide-react";
import {
  locales,
  money,
  type Line,
  type Locale,
  type Product,
  type Quote,
} from "@/lib/domain";
import { t, stateName, type MessageKey } from "@/lib/messages";
import {
  action,
  api,
  errorCode,
  type AccountState,
  type DbRow,
} from "@/lib/client";
import catalogue from "@/data/catalogue.json";
import Admin from "./admin";
import { useEditorial } from "./cinematic";
import {
  Gateway,
  StoreHome,
  ClubEntrance,
  MemberArea,
} from "./final-experience";
import { et } from "@/lib/experience";
import {
  guestCart,
  mergeCart,
  pendingCart,
  clearPendingCart,
} from "@/lib/cart";
type Context = {
  locale: Locale;
  page: string;
  tr: (k: MessageKey, v?: Record<string, string | number>) => string;
  products: Product[];
  plans: DbRow[];
  delivery: number;
  goldBps: number;
  state: AccountState | null;
  cart: Line[];
  setCart: (v: Line[]) => void;
  reload: () => Promise<void>;
  ready: boolean;
  busy: boolean;
  run: (job: () => Promise<void>) => Promise<void>;
  notice: (s: string) => void;
};
const C = createContext<Context | null>(null);
export const usePlatform = () => useContext(C)!;
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        typeof child.type === "string" &&
        ["input", "select", "textarea"].includes(child.type)
          ? cloneElement(child as ReactElement<{ id?: string }>, { id })
          : child,
      )}
    </div>
  );
}
const asset = "/varathans25/";
function remember(locale: Locale) {
  try {
    localStorage.setItem("v25_language", locale);
  } catch {
    /* Optional preference. */
  }
}
export default function Platform({
  locale,
  page,
}: {
  locale: Locale;
  page: string;
}) {
  const editorial = useEditorial();
  const tr = (k: MessageKey, v?: Record<string, string | number>) =>
    t(locale, k, v);
  const [products, setProducts] = useState<Product[]>(
    catalogue.map((p) => ({
      ...p,
      id: p.slug,
      price_rappen: null,
      is_test: false,
      gold_eligible: false,
    })),
  );
  const [delivery, setDelivery] = useState(1000);
  const [plans, setPlans] = useState<DbRow[]>([]),
    [state, setState] = useState<AccountState | null>(null),
    [cart, setLines] = useState<Line[]>([]),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function reload() {
    const auth = await api<{ authenticated: boolean }>("/api/auth");
    if (auth.authenticated) {
      const s = await api<AccountState>("/api/state");
      setState(s);
      return;
    }
    setState(null);
  }
  useEffect(() => {
    setReady(false);
    document.documentElement.lang = locale;
    if (page !== "entrance") remember(locale);
    let mounted = true;
    async function init() {
      try {
        const c = await api<{
          products: Product[];
          plans: DbRow[];
          delivery: { standard_rappen: number };
        }>("/api/catalogue");
        if (mounted) {
          setProducts(c.products);
          setPlans(c.plans);
          setDelivery(c.delivery?.standard_rappen ?? 1000);
        }
        const auth = await api<{ authenticated: boolean }>("/api/auth");
        if (auth.authenticated) {
          const s = await api<AccountState>("/api/state");
          if (mounted) {
            setState(s);
            const saved = (s.rows.cart_items || []).map((r) => ({
              product_id: r.product_id,
              quantity: r.quantity,
            }));
            const pending = pendingCart(s.user.id);
            const guest = guestCart(false);
            const lines = pending?.lines || mergeCart(saved, guest);
            setLines(lines);
            if (s.identity.active && (pending || guest.length)) {
              await action("cart", { lines });
              if (pending) clearPendingCart(s.user.id, pending.revision);
              try {
                localStorage.setItem("v25_guest_cart", "[]");
              } catch {}
            }
            try {
              localStorage.setItem("v25_cart_owner", s.user.id);
            } catch {}
          }
        } else if (mounted) {
          setState(null);
          const guest = guestCart();
          setLines(guest);
          try {
            localStorage.setItem("v25_guest_cart", JSON.stringify(guest));
          } catch {}
        }
      } catch (e) {
        if (mounted) setError(errorCode(e));
      } finally {
        if (mounted) setReady(true);
      }
    }
    void init();
    return () => {
      mounted = false;
    };
  }, [locale, page]);
  async function run(job: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await job();
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  }
  const cartWrites = useRef(Promise.resolve());
  function setCart(lines: Line[]) {
    setLines(lines);
    if (state?.identity.active) {
      const user = state.user.id;
      const revision = crypto.randomUUID();
      try {
        localStorage.setItem(
          `v25_pending_cart_${user}`,
          JSON.stringify({ lines, revision }),
        );
      } catch {}
      cartWrites.current = cartWrites.current
        .then(async () => {
          await action("cart", { lines });
          clearPendingCart(user, revision);
        })
        .catch((e) => setError(errorCode(e)));
    } else {
      try {
        localStorage.setItem("v25_guest_cart", JSON.stringify(lines));
        localStorage.setItem("v25_cart_owner", "guest");
      } catch {}
    }
  }
  return (
    <C.Provider
      value={{
        locale,
        page,
        tr,
        products,
        plans,
        delivery,
        goldBps:
          plans.find(
            (p) =>
              p.id ===
              (state?.rows.memberships?.[0]?.plan_id || "gold-monthly"),
          )?.discount_bps ?? 1000,
        state,
        cart,
        setCart,
        reload,
        ready,
        busy,
        run,
        notice: setNotice,
      }}
    >
      <a className="skip" href="#content">
        {tr("skip")}
      </a>
      {page === "entrance" || page === "" ? (
        <Gateway config={editorial.experience} />
      ) : (
        <>
          <Header />
          {page === "bag" && (
            <div className="review-label">{et(locale, "preview")}</div>
          )}
          <main id="content" className={page === "club" ? "club-page" : ""}>
            {(error || notice) && (
              <div className="container">
                <p
                  className={error ? "alert" : "notice"}
                  role={error ? "alert" : "status"}
                >
                  {error ? tr(`error_${error}` as MessageKey) : notice}
                </p>
              </div>
            )}
            {!ready &&
            ["account", "admin", "bag", "club/member"].includes(page) ? (
              <p className="container section" role="status">
                {tr("loading")}
              </p>
            ) : page === "store" ? (
              <StoreHome config={editorial.experience} />
            ) : ["shop", "tea", "pantry"].includes(page) ? (
              <Collection
                category={
                  page === "tea" || page === "pantry" ? page : undefined
                }
              />
            ) : page.startsWith("product/") ? (
              <ProductPage slug={page.slice(8)} />
            ) : page === "club" ? (
              <ClubEntrance config={editorial.experience} />
            ) : page === "club/member" ? (
              <MemberArea />
            ) : page === "membership" ? (
              <Membership />
            ) : page === "bag" ? (
              <Bag />
            ) : ["login", "register", "reset"].includes(page) ? (
              <Auth mode={page} />
            ) : page === "account" ? (
              <Account />
            ) : page === "admin" ? (
              <Admin />
            ) : (
              <Privacy />
            )}
          </main>
          <Footer />
        </>
      )}
    </C.Provider>
  );
}
function Logo() {
  return (
    <img
      src={`${asset}brand/varathans25-original.png`}
      width="180"
      height="98"
      alt="Varathans25"
      className="logo"
    />
  );
}
export function LanguageLinks() {
  const { locale, page, tr } = usePlatform();
  const [query, setQuery] = useState("");
  useEffect(() => setQuery(window.location.search), [page]);
  return (
    <nav aria-label={tr("language")} className="language-links">
      {locales.map((l) => (
        <a
          key={l}
          href={`/${l}/${page === "entrance" ? "" : page}${query}`}
          aria-current={l === locale ? "page" : undefined}
          lang={l}
          onClick={() => remember(l)}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
function Header() {
  const { locale, tr, cart, state } = usePlatform();
  const [open, setOpen] = useState(false);
  return (
    <header className="header">
      <div className="container header-inner">
        <a href={`/${locale}/`} aria-label="Varathans25">
          <Logo />
        </a>
        <nav className="desktop-nav" aria-label={tr("menu")}>
          {(["store", "shop", "club"] as const).map((p) => (
            <a key={p} href={`/${locale}/${p}`}>
              {p === "store"
                ? et(locale, "store")
                : p === "shop"
                  ? et(locale, "catalogue")
                  : tr(p)}
            </a>
          ))}
        </nav>
        <div className="header-tools">
          <LanguageLinks />
          <a href={`/${locale}/account`} aria-label={tr("account")}>
            <UserRound size={21} />
          </a>
          <a
            href={`/${locale}/bag`}
            className="bag-link"
            aria-label={`${tr("bag")} ${cart.reduce((n, l) => n + l.quantity, 0)}`}
          >
            <ShoppingBag size={21} />
            <span aria-live="polite">
              {cart.reduce((n, l) => n + l.quantity, 0)}
            </span>
          </a>
          <button
            className="icon mobile-menu"
            aria-label={tr(open ? "close" : "menu")}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-navigation container"
          aria-label={tr("menu")}
        >
          {(["store", "shop", "club", "account", "bag"] as const).map((p) => (
            <a key={p} href={`/${locale}/${p}`}>
              {p === "store"
                ? et(locale, "store")
                : p === "shop"
                  ? et(locale, "catalogue")
                  : tr(p)}
            </a>
          ))}
          {state?.identity.staff && (
            <a href={`/${locale}/admin`}>{tr("admin")}</a>
          )}
        </nav>
      )}
    </header>
  );
}
function Footer() {
  const { tr, locale } = usePlatform();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <a href={`/${locale}/`} aria-label="Varathans25">
            <Logo />
          </a>
          <p>Varathans25 · Switzerland</p>
        </div>
        <nav aria-label="Varathans25">
          <a href={`/${locale}/store`}>{et(locale, "store")}</a>
          <a href={`/${locale}/shop`}>{et(locale, "catalogue")}</a>
          <a href={`/${locale}/membership`}>{tr("membership")}</a>
          <a href={`/${locale}/privacy`}>{tr("privacy")}</a>
        </nav>
        <div>
          <p>{tr("delivery")}</p>
          <small>{tr("deliveryScope")}</small>
          <p className="muted">{et(locale, "preview")}</p>
        </div>
      </div>
    </footer>
  );
}
function Quantity({
  value,
  change,
  max = 20,
  label,
}: {
  value: number;
  change: (v: number) => void;
  max?: number;
  label: string;
}) {
  const { tr } = usePlatform();
  return (
    <div className="quantity" role="group" aria-label={label}>
      <button
        type="button"
        disabled={value <= 1}
        onClick={() => change(value - 1)}
        aria-label={tr("minus")}
      >
        <Minus size={16} />
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => change(value + 1)}
        aria-label={tr("plus")}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
function ProductCard({
  product,
  detail = false,
}: {
  product: Product;
  detail?: boolean;
}) {
  const { locale, tr, cart, setCart, state, notice, goldBps, ready } =
    usePlatform();
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const translation = product.translations.find((t) => t.locale === locale);
  const name = translation?.name || product.slug;
  const price = product.promotion_rappen ?? product.price_rappen;
  const stock = product.available_quantity ?? 0;
  const existingQuantity =
    cart.find((line) => line.product_id === product.id)?.quantity || 0;
  const limit = Math.max(0, Math.min(20, stock) - existingQuantity);
  const available = ready && price !== null && limit >= quantity;
  const gold = !!state?.identity.gold && product.gold_eligible;
  const photos = product.images?.length
    ? product.images
    : [{ url: product.image, alt: { [locale]: name } }];
  const photo = photos[imageIndex] || photos[0];
  return (
    <article className={`product-card ${detail ? "detail" : ""}`}>
      <div className="product-gallery">
        <a
          href={detail ? photo.url : `/${locale}/product/${product.slug}`}
          className="product-photo"
          aria-label={name}
        >
          <img
            src={photo.url}
            width="640"
            height="640"
            alt={photo.alt[locale] || name}
            loading={detail ? "eager" : "lazy"}
          />
        </a>
        {detail && photos.length > 1 && (
          <div className="product-thumbnails">
            {photos.map((im, i) => (
              <button
                key={im.url}
                onClick={() => setImageIndex(i)}
                aria-label={`${tr("imageCount", { n: i + 1 })}`}
                aria-pressed={i === imageIndex}
              >
                <img src={im.url} alt="" width="70" height="70" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-copy">
        <p className="eyebrow">
          VARATHANS25 ·{" "}
          {et(locale, product.category === "tea" ? "tea" : "curry")}
        </p>
        {detail ? (
          <h1>{name}</h1>
        ) : (
          <h3>
            <a href={`/${locale}/product/${product.slug}`}>{name}</a>
          </h3>
        )}
        <p className="product-variant">
          {translation?.short_description || name}
        </p>
        <p className="product-weight">
          {et(locale, "weight")}:{" "}
          {product.weight_grams
            ? `${product.weight_grams} g`
            : et(locale, "pending")}
        </p>
        {detail && translation?.description && <p>{translation.description}</p>}
        <p className="price">
          {price === null ? tr("pricePending") : money(price, locale)}
        </p>
        {price !== null && gold && (
          <p className="member-price">
            {tr("goldPrice")}:{" "}
            {money(
              Math.min(
                price,
                product.price_rappen! -
                  Math.floor((product.price_rappen! * goldBps + 5000) / 10000),
              ),
              locale,
            )}
          </p>
        )}
        <p
          className={`stock-status ${stock > 0 && price !== null ? "stock-available" : ""}`}
        >
          {stock > 0 && price !== null
            ? et(locale, product.stock_confirmed ? "stock" : "previewStock")
            : et(locale, "out")}
        </p>
        <div className="purchase-row">
          <Quantity
            value={quantity}
            change={setQuantity}
            max={limit}
            label={`${tr("quantity")} · ${name}`}
          />
          <button
            className="button"
            disabled={!available}
            onClick={() => {
              setCart([
                ...cart.filter((l) => l.product_id !== product.id),
                {
                  product_id: product.id,
                  quantity: existingQuantity + quantity,
                },
              ]);
              notice(tr("added"));
            }}
          >
            {tr("add")}
          </button>
        </div>
        {!detail && (
          <a
            className="product-detail-link"
            href={`/${locale}/product/${product.slug}`}
          >
            {tr("details")} <span aria-hidden="true">↗</span>
          </a>
        )}
        {detail && (
          <p className="delivery-note">
            {tr("delivery")}
            <br />
            <small>{tr("deliveryScope")}</small>
          </p>
        )}
      </div>
    </article>
  );
}
function Collection({ category }: { category?: "tea" | "pantry" }) {
  const { products, locale } = usePlatform();
  const [filter, setFilter] = useState(category || "all");
  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get(
      "category",
    );
    setFilter(
      category ||
        (selected === "tea" || selected === "pantry" ? selected : "all"),
    );
  }, [category]);
  return (
    <section className="container section catalogue">
      <div className="catalogue-heading">
        <div>
          <p className="eyebrow">VARATHANS25 COLLECTION</p>
          <h1>
            {et(
              locale,
              filter === "tea"
                ? "tea"
                : filter === "pantry"
                  ? "curry"
                  : "catalogue",
            )}
          </h1>
        </div>
        <p>{et(locale, "preview")}</p>
      </div>
      <nav className="catalogue-filters" aria-label={et(locale, "catalogue")}>
        {(["all", "tea", "pantry"] as const).map((key) => (
          <a
            key={key}
            href={`/${locale}/shop${key === "all" ? "" : `?category=${key}`}`}
            aria-current={filter === key ? "page" : undefined}
          >
            {et(locale, key === "pantry" ? "curry" : key)}
          </a>
        ))}
      </nav>
      <div className="product-grid">
        {products
          .filter((p) => filter === "all" || p.category === filter)
          .map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
      </div>
    </section>
  );
}
function ProductPage({ slug }: { slug: string }) {
  const { products, tr, locale } = usePlatform();
  const product = products.find((p) => p.slug === slug);
  if (!product)
    return (
      <section className="container section">
        <h1>{tr("noRecords")}</h1>
      </section>
    );
  const translation = product.translations.find((t) => t.locale === locale);
  const facts = [
    [et(locale, "ingredients"), translation?.ingredients],
    [et(locale, "allergens"), translation?.allergens],
    [
      et(locale, "weight"),
      product.weight_grams ? `${product.weight_grams} g` : "",
    ],
    [et(locale, "origin"), product.origin],
    [et(locale, "preparation"), translation?.preparation_instructions],
    [et(locale, "storage"), translation?.storage_instructions],
  ];
  return (
    <section className="container section product-page">
      <a className="breadcrumb" href={`/${locale}/shop`}>
        ← {et(locale, "catalogue")}
      </a>
      <ProductCard product={product} detail />
      <div className="product-facts">
        <div>
          <p className="eyebrow">VARATHANS25</p>
          <h2>{et(locale, "description")}</h2>
          <p>{translation?.description || tr("factsPending")}</p>
          <p className="muted">{et(locale, "preview")}</p>
        </div>
        <dl>
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || et(locale, "pending")}</dd>
            </div>
          ))}
          <div>
            <dt>{et(locale, "nutrition")}</dt>
            <dd>
              {product.nutrition && Object.keys(product.nutrition).length ? (
                <dl>
                  {Object.entries(product.nutrition).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>
                        {typeof value === "string" || typeof value === "number"
                          ? String(value)
                          : JSON.stringify(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                et(locale, "pending")
              )}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
export function Membership() {
  const { tr, plans, state, locale, run, reload, notice, busy, delivery } =
    usePlatform();
  const router = useRouter();
  async function select(id: string) {
    if (!state) {
      router.push(`/${locale}/register`);
      return;
    }
    await run(async () => {
      await action("membership", { plan_id: id });
      await reload();
      notice(tr("saved"));
      router.push(`/${locale}/account`);
    });
  }
  return (
    <section className="container section">
      <p className="eyebrow">VARATHANS25 · HOSPITALITY</p>
      <h1>{tr("tiers")}</h1>
      <p className="lede narrow">{tr("tierIntro")}</p>
      <div className="tier-grid">
        <article className="tier">
          <p className="eyebrow">SILVER</p>
          <h2>CHF 0</h2>
          <p>{tr("free")}</p>
          <ul>
            <li>
              {tr("silverDelivery", { delivery: money(delivery, locale) })}
            </li>
            <li>{tr("adult")}</li>
          </ul>
          <button
            className="button"
            disabled={busy}
            onClick={() => void select("silver")}
          >
            {tr("choose")}
          </button>
        </article>
        <article className="tier gold">
          <p className="eyebrow">GOLD · VARATHANS25</p>
          <h2>
            {money(
              plans.find((p) => p.id === "gold-monthly")?.fee_rappen ?? 6900,
              locale,
            )}{" "}
            <small>{tr("month")}</small>
          </h2>
          <p>
            {money(
              plans.find((p) => p.id === "gold-yearly")?.fee_rappen ?? 50000,
              locale,
            )}{" "}
            {tr("year")}
          </p>
          <ul>
            <li>{tr("goldDelivery")}</li>
            <li>
              {tr("goldBenefit", {
                percent:
                  (plans.find((p) => p.id === "gold-monthly")?.discount_bps ??
                    1000) / 100,
              })}
            </li>
            <li>{tr("drink")}</li>
            <li>{tr("passBenefit")}</li>
          </ul>
          <div className="actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => void select("gold-monthly")}
            >
              {tr("chooseMonthly")}
            </button>
            <button disabled={busy} onClick={() => void select("gold-yearly")}>
              {tr("chooseYearly")}
            </button>
          </div>
        </article>
      </div>
      <p>{tr("cancelPolicy")}</p>
      <p>{tr("testOnly")}</p>
    </section>
  );
}
function Auth({ mode }: { mode: string }) {
  const router = useRouter();
  const { tr, locale, run, busy, notice } = usePlatform();
  const destination = () =>
    new URLSearchParams(window.location.search).get("next") === "club/member"
      ? `/${locale}/club/member`
      : `/${locale}/account`;
  const [challenge, setChallenge] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(async () => {
      const response = await api<{ factors?: { id: string }[] }>("/api/auth", {
        action: mode,
        email: f.get("email"),
        password: f.get("password"),
        name: f.get("name"),
        locale,
      });
      if (mode === "login") {
        if (response.factors?.length) setChallenge(response.factors[0].id);
        else router.push(destination());
      } else notice(tr(mode === "register" ? "confirmEmail" : "resetSent"));
    });
  }
  if (challenge)
    return (
      <section className="container section auth-layout">
        <div>
          <h1>{tr("mfa")}</h1>
        </div>
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void run(async () => {
              await api("/api/auth", {
                action: "mfa_verify",
                factor_id: challenge,
                code: f.get("code"),
              });
              router.push(destination());
            });
          }}
        >
          <Field label={tr("mfaCode")}>
            <input
              name="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              autoFocus
            />
          </Field>
          <button className="button" disabled={busy}>
            {tr("mfaVerify")}
          </button>
        </form>
      </section>
    );
  return (
    <section className="container section auth-layout">
      <div>
        <p className="eyebrow">VARATHANS25</p>
        <h1>{tr(mode as "login" | "register" | "reset")}</h1>
        <p>{tr("tierIntro")}</p>
        <ShieldCheck size={32} />
      </div>
      <form className="panel auth-form" onSubmit={submit}>
        {mode === "register" && (
          <Field label={tr("name")}>
            <input name="name" autoComplete="name" required maxLength={120} />
          </Field>
        )}
        <Field label={tr("email")}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </Field>
        {mode !== "reset" && (
          <Field label={tr("password")}>
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              minLength={14}
              maxLength={128}
            />
            <small>{tr("passwordRule")}</small>
          </Field>
        )}
        {mode === "register" && (
          <label className="check">
            <input type="checkbox" required />
            {tr("consent")}
          </label>
        )}
        <button className="button" disabled={busy}>
          {tr(
            busy
              ? "working"
              : mode === "reset"
                ? "sendReset"
                : (mode as "login" | "register"),
          )}
        </button>
        <div className="auth-links">
          {["login", "register", "reset"]
            .filter((x) => x !== mode)
            .map((x) => (
              <a href={`/${locale}/${x}`} key={x}>
                {tr(x as "login" | "register" | "reset")}
              </a>
            ))}
        </div>
      </form>
    </section>
  );
}
function Bag() {
  const {
    tr,
    products,
    cart,
    setCart,
    state,
    locale,
    run,
    notice,
    busy,
    reload,
  } = usePlatform();
  const known = cart
    .map((l) => ({
      line: l,
      product: products.find((p) => p.id === l.product_id),
    }))
    .filter((x) => x.product && x.product.price_rappen !== null);
  const orderKey = useRef<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null),
    [address, setAddress] = useState("");
  const [serverQuote, setServerQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const q = quote || serverQuote;
  useEffect(() => {
    let live = true;
    setQuote(null);
    setServerQuote(null);
    setQuoteError("");
    orderKey.current = null;
    const timer = setTimeout(() => {
      if (cart.length)
        void api<Quote>("/api/quote", { lines: cart })
          .then((result) => {
            if (live) setServerQuote(result);
          })
          .catch((error) => {
            if (live) setQuoteError(errorCode(error));
          });
    }, 180);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [cart]);
  return (
    <section className="container section">
      <p className="eyebrow">VARATHANS25</p>
      <h1>{tr("bag")}</h1>
      {!known.length ? (
        <p>{tr("emptyBag")}</p>
      ) : (
        <div className="bag-layout">
          <div>
            {known.map(({ line, product }) => (
              <article className="bag-item" key={line.product_id}>
                <img src={product!.image} alt="" width="140" height="140" />
                <div>
                  <h2>
                    {
                      product!.translations.find((t) => t.locale === locale)
                        ?.name
                    }
                  </h2>
                  <p>{money(product!.price_rappen!, locale)}</p>
                  <div className="actions">
                    <Quantity
                      value={line.quantity}
                      label={tr("quantity")}
                      change={(n) =>
                        setCart(
                          cart.map((l) =>
                            l.product_id === line.product_id
                              ? { ...l, quantity: n }
                              : l,
                          ),
                        )
                      }
                    />
                    <button
                      onClick={() =>
                        setCart(
                          cart.filter((l) => l.product_id !== line.product_id),
                        )
                      }
                    >
                      {tr("remove")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="panel bag-summary">
            <h2>{tr("total")}</h2>
            {quoteError && (
              <p role="alert">{tr(`error_${quoteError}` as MessageKey)}</p>
            )}
            {!q && !quoteError && <p role="status">{tr("loading")}</p>}
            {q && (
              <>
                <dl className="totals">
                  <div>
                    <dt>{tr("subtotal")}</dt>
                    <dd>{money(q.subtotal_rappen, locale)}</dd>
                  </div>
                  <div>
                    <dt>{tr("discount")}</dt>
                    <dd>− {money(q.discount_rappen, locale)}</dd>
                  </div>
                  <div>
                    <dt>{tr("shipping")}</dt>
                    <dd>{money(q.delivery_rappen, locale)}</dd>
                  </div>
                  <div className="grand-total">
                    <dt>{tr("total")}</dt>
                    <dd>{money(q.total_rappen, locale)}</dd>
                  </div>
                </dl>
                <p className="delivery-progress" aria-live="polite">
                  {q.gold || !q.remaining_rappen
                    ? tr("unlocked")
                    : tr("remaining", {
                        amount: money(q.remaining_rappen, locale),
                      })}
                </p>
                <progress
                  max={10000}
                  value={
                    q.gold
                      ? 10000
                      : Math.min(10000, q.subtotal_rappen - q.discount_rappen)
                  }
                  aria-label={tr("delivery")}
                />
              </>
            )}
            <p>{tr("deliveryScope")}</p>
            <p className="muted">{et(locale, "preview")}</p>
            {state?.identity.active ? (
              <>
                <Field label={tr("deliveryAddress")}>
                  <select
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  >
                    <option value="">—</option>
                    {state.rows.member_addresses?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.street} {a.house_number}, {a.city}
                      </option>
                    ))}
                  </select>
                </Field>
                {!state.rows.member_addresses?.length && (
                  <a href={`/${locale}/account`}>{tr("addressRequired")}</a>
                )}
                <button
                  disabled={busy || !address || !serverQuote || !!quoteError}
                  className="button"
                  onClick={() =>
                    void run(async () => {
                      const server = await action<Quote>("quote", {
                        lines: cart,
                      });
                      setQuote(server);
                      orderKey.current = crypto.randomUUID();
                    })
                  }
                >
                  {tr("checkout")}
                </button>
                {quote && (
                  <button
                    className="button maroon"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await action(
                          "order",
                          {
                            lines: cart,
                            address_id: address,
                          },
                          orderKey.current || crypto.randomUUID(),
                        );
                        setCart([]);
                        await reload();
                        notice(tr("orderCreated"));
                      })
                    }
                  >
                    {tr("orderTest")}
                  </button>
                )}
              </>
            ) : (
              <a className="button" href={`/${locale}/login`}>
                {tr("loginToOrder")}
              </a>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
function Account() {
  const router = useRouter();
  const { tr, state, locale, run, reload, notice, busy } = usePlatform();
  const [pass, setPass] = useState<{ qr: string; expires_at: string } | null>(
      null,
    ),
    [factor, setFactor] = useState<{
      id: string;
      totp: { qr_code: string };
    } | null>(null);
  if (!state) return <Auth mode="login" />;
  const member = state.rows.members?.[0],
    m = state.rows.memberships?.[0],
    v = state.rows.member_verifications?.[0];
  const act = async (name: string, document: Record<string, unknown>) => {
    await action(name, document);
    await reload();
    notice(tr("saved"));
  };
  if (!member)
    return (
      <section className="container section">
        <h1>{tr("finishProfile")}</h1>
        <form
          className="panel narrow"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void run(() =>
              act("onboard", { name: f.get("name"), locale, consent: true }),
            );
          }}
        >
          <Field label={tr("name")}>
            <input
              name="name"
              defaultValue={state.user.name}
              required
              maxLength={120}
            />
          </Field>
          <label className="check">
            <input type="checkbox" required />
            {tr("consent")}
          </label>
          <button className="button">{tr("save")}</button>
        </form>
      </section>
    );
  return (
    <section className="container section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">VARATHANS25 · {tr("account")}</p>
          <h1>{member.name}</h1>
        </div>
        <div className="actions">
          {(state.identity.staff || state.identity.role) && (
            <a className="button" href={`/${locale}/admin`}>
              {tr("admin")}
            </a>
          )}
          <button
            onClick={() =>
              void run(async () => {
                await api("/api/auth", { action: "logout" });
                router.push(`/${locale}/login`);
              })
            }
          >
            {tr("logout")}
          </button>
        </div>
      </div>
      <div className="account-grid">
        <section className="panel">
          <h2>{tr("membership")}</h2>
          <p className="status-pill">
            {stateName(locale, m?.plan_id || "silver")} ·{" "}
            {stateName(locale, m?.status || "pending")}
          </p>
          {m?.period_end && (
            <p>
              {tr("periodEnd")}:{" "}
              {new Date(m.period_end).toLocaleDateString(`${locale}-CH`)}
            </p>
          )}
          {m?.cancel_at_period_end && <p>{tr("cancelScheduled")}</p>}
          <a href={`/${locale}/membership`}>{tr("choose")} →</a>
          {m?.plan_id !== "silver" && (
            <button
              disabled={busy || m?.cancel_at_period_end}
              onClick={() => void run(() => act("cancel_membership", {}))}
            >
              {tr("cancelMembership")}
            </button>
          )}
          <h3>{tr("verification")}</h3>
          <p data-testid="verification-status">
            {stateName(locale, v?.status || "unverified")}
          </p>
          <p>{tr("verifyText")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(() =>
                act("test_verification", { scenario: f.get("scenario") }),
              );
            }}
          >
            <Field label={tr("scenario")}>
              <select name="scenario">
                {[
                  ["adult", "adultTest"],
                  ["underage", "underageTest"],
                  ["expired", "expiredTest"],
                  ["review", "reviewTest"],
                ].map(([value, key]) => (
                  <option key={value} value={value}>
                    {tr(key as MessageKey)}
                  </option>
                ))}
              </select>
            </Field>
            <button disabled={busy}>{tr("runVerify")}</button>
          </form>
        </section>
        <section className="panel">
          <h2>{tr("pass")}</h2>
          <p>{tr("passExplanation")}</p>
          {state.identity.gold ? (
            <>
              <button
                className="button"
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
              {pass && (
                <div className="pass">
                  <img
                    src={pass.qr}
                    alt={tr("passAlt")}
                    width="256"
                    height="256"
                  />
                  <strong>{member.name} · GOLD</strong>
                  <p>
                    {tr("expires")}:{" "}
                    {new Date(pass.expires_at).toLocaleTimeString(
                      `${locale}-CH`,
                    )}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p>{tr("passLocked")}</p>
          )}
        </section>
        <section className="panel">
          <h2>{tr("addresses")}</h2>
          {state.rows.member_addresses?.map((a) => (
            <div key={a.id}>
              <p>
                {a.name}
                <br />
                {a.street} {a.house_number}
                <br />
                {a.postal_code} {a.city}
              </p>
              <button
                onClick={() =>
                  void run(() => act("address_remove", { id: a.id }))
                }
              >
                {tr("remove")}
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(() => act("address", Object.fromEntries(f)));
            }}
          >
            {[
              ["name", "name"],
              ["street", "street"],
              ["house_number", "house"],
              ["postal_code", "postal"],
              ["city", "city"],
            ].map(([name, key]) => (
              <Field key={name} label={tr(key as MessageKey)}>
                <input
                  name={name}
                  required
                  maxLength={name === "postal_code" ? 4 : 100}
                  pattern={name === "postal_code" ? "[1-9][0-9]{3}" : undefined}
                  defaultValue={name === "name" ? member.name : ""}
                />
              </Field>
            ))}
            <button disabled={busy}>{tr("addAddress")}</button>
          </form>
        </section>
        <section className="panel">
          <h2>{tr("profile")}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(() => act("profile", { name: f.get("name"), locale }));
            }}
          >
            <Field label={tr("name")}>
              <input
                name="name"
                defaultValue={member.name}
                required
                maxLength={120}
              />
            </Field>
            <p>{state.user.email}</p>
            <button disabled={busy}>{tr("save")}</button>
          </form>
          <h3>{tr("password")}</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                await api("/api/auth", {
                  action: "password",
                  password: f.get("password"),
                });
                notice(tr("saved"));
              });
            }}
          >
            <Field label={tr("password")}>
              <input
                name="password"
                type="password"
                required
                minLength={14}
                autoComplete="new-password"
              />
            </Field>
            <button disabled={busy}>{tr("save")}</button>
          </form>
          <h3>{tr("mfa")}</h3>
          <button
            onClick={() =>
              void run(async () =>
                setFactor(await api("/api/auth", { action: "mfa_enroll" })),
              )
            }
          >
            {tr("mfaSetup")}
          </button>
          {factor && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run(async () => {
                  await api("/api/auth", {
                    action: "mfa_verify",
                    factor_id: factor.id,
                    code: f.get("code"),
                  });
                  notice(tr("saved"));
                  setFactor(null);
                  await reload();
                });
              }}
            >
              <img
                src={
                  factor.totp.qr_code.startsWith("data:")
                    ? factor.totp.qr_code
                    : `data:image/svg+xml;utf8,${encodeURIComponent(factor.totp.qr_code)}`
                }
                width="200"
                height="200"
                alt={tr("mfa")}
              />
              <Field label={tr("mfaCode")}>
                <input
                  name="code"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                />
              </Field>
              <button>{tr("mfaVerify")}</button>
            </form>
          )}
        </section>
      </div>
      <section className="section">
        <h2>{tr("orders")}</h2>
        {!state.rows.orders?.length && <p>{tr("noRecords")}</p>}
        {state.rows.orders?.map((o) => (
          <div className="record" key={o.id}>
            <strong>#{o.number}</strong>
            <span>{stateName(locale, o.status)}</span>
            <span>{money(o.total_rappen, locale)}</span>
            <details>
              <summary>{tr("items")}</summary>
              <ul>
                {state.rows.order_items
                  ?.filter((item) => item.order_id === o.id)
                  .map((item) => (
                    <li key={item.id}>
                      {item.quantity} × {item.name} ·{" "}
                      {money(item.unit_rappen, locale)}
                    </li>
                  ))}
              </ul>
            </details>
          </div>
        ))}
        <h2>{tr("payments")}</h2>
        {!state.rows.payments?.length && <p>{tr("noRecords")}</p>}
        {state.rows.payments?.map((p) => (
          <article className="record" key={p.id}>
            <div>
              <strong>{p.reference}</strong>
              <p>
                {stateName(locale, p.state)} · {money(p.amount_rappen, locale)}
              </p>
            </div>
            <a href={`/api/payment?id=${p.id}`}>{tr("downloadBill")}</a>
          </article>
        ))}
      </section>
      <Privacy />
    </section>
  );
}
function Privacy() {
  const router = useRouter();
  const { tr, state, run, notice } = usePlatform();
  return (
    <section className="container section">
      <h2>{tr("privacy")}</h2>
      <p className="narrow">{tr("privacyText")}</p>
      {state && (
        <div className="actions">
          <button
            onClick={() =>
              void run(async () => {
                const data = await api("/api/state?export=1");
                const href = URL.createObjectURL(
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = href;
                a.download = "varathans25-personal-data.json";
                a.click();
                URL.revokeObjectURL(href);
              })
            }
          >
            {tr("exportData")}
          </button>
          <button
            onClick={() => {
              if (window.confirm(tr("deleteConfirm")))
                void run(async () => {
                  await action("privacy", { kind: "deletion" });
                  await api("/api/auth", { action: "logout" });
                  router.push("/");
                });
            }}
          >
            {tr("deleteRequest")}
          </button>
          <button
            onClick={() =>
              void run(async () => {
                await action("consent", { granted: true });
                notice(tr("saved"));
              })
            }
          >
            {tr("messagesConsent")}
          </button>
          <button
            onClick={() =>
              void run(async () => {
                await action("consent", { granted: false });
                notice(tr("saved"));
              })
            }
          >
            {tr("revokeConsent")}
          </button>
        </div>
      )}
    </section>
  );
}
