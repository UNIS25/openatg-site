"use client";
import Link from "./document-link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ShoppingBag,
  Search,
  X,
  Plus,
  Minus,
  Menu,
  MapPin,
  Check,
  Truck,
  UserRound,
  Globe,
} from "lucide-react";
import { z } from "zod";
import { storefront } from "@/messages/storefront";
import { brand } from "@/lib/brand";
import { messages } from "@/lib/i18n";
import {
  type Locale,
  type Product,
  type Category,
  type Zone,
  type CartItem,
  translation,
  money,
  price,
} from "@/lib/types";
import { regulatoryWarnings } from "@/messages/regulatory";
import type { PublicCigar } from "@/lib/cigar-catalogue";
import type { EditorialData } from "@/lib/editorial-data";
import type { Messages } from "@/messages/en";
import { deliveryEligibility } from "@/lib/delivery";
import { saveLocale } from "./gateway";
import { isStaticReview, storageKey } from "@/lib/review-mode";
export type Collection = {
  id: string;
  slug: string;
  names: unknown;
  descriptions: unknown;
  productIds: unknown;
  active: boolean;
};
type Store = {
  editorial: EditorialData;
  regulatedCart: {
    restrictedIds: string[];
    products: PublicCigar[];
    expiresAt: string | null;
  };
  addRestricted: (product: PublicCigar) => void;
  locale: Locale;
  t: Messages;
  products: Product[];
  categories: Category[];
  zones: Zone[];
  collections: Collection[];
  cart: CartItem[];
  postcode: string;
  setPostcode: (p: string) => void;
  add: (id: string, quantity?: number) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
  openBag: () => void;
  closeBag: () => void;
  bagOpen: boolean;
  ready: boolean;
};
const StoreContext = createContext<Store | null>(null);
export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Store provider missing");
  return store;
}
const savedCartSchema = z
  .array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .max(30);
export function StoreProvider({
  children,
  locale,
  products: sourceProducts,
  categories,
  zones,
  collections,
  editorial,
}: {
  children: React.ReactNode;
  editorial: EditorialData;
  locale: Locale;
  products: Product[];
  categories: Category[];
  zones: Zone[];
  collections: Collection[];
}) {
  const [pricingTime, setPricingTime] = useState(editorial.asOf);
  useEffect(() => {
    if (!editorial.offers.length) return;
    const timer = setInterval(() => setPricingTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [editorial.offers.length]);
  const products = sourceProducts.map((p) => {
    const offer = editorial.offers.find(
      (o) =>
        o.productId === p.id &&
        new Date(o.startsAt).getTime() <= pricingTime &&
        new Date(o.endsAt).getTime() > pricingTime,
    );
    return offer
      ? {
          ...p,
          priceCents: offer.originalPriceCents,
          launchPriceCents: offer.promotionalPriceCents,
        }
      : {
          ...p,
          // Preserve the existing quote price without claiming an unscheduled discount.
          priceCents: p.launchPriceCents ?? p.priceCents,
          launchPriceCents: null,
        };
  });
  const [regulatedCart, setRegulatedCart] = useState<{
    restrictedIds: string[];
    products: PublicCigar[];
    expiresAt: string | null;
  }>({ restrictedIds: [], products: [], expiresAt: null });
  const [cart, setCart] = useState<CartItem[]>([]),
    [postcode, setPostcodeState] = useState(""),
    [bagOpen, setBagOpen] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  /* eslint-disable react-hooks/set-state-in-effect -- One-time browser storage hydration must match the server-rendered empty state first. */
  useEffect(() => {
    try {
      const saved = savedCartSchema.safeParse(
        JSON.parse(localStorage.getItem(storageKey("cart")) ?? "[]"),
      );
      if (saved.success)
        setCart(
          saved.data.filter(
            (v, i, a) => v.productId !== 'coffee-powder' && a.findIndex((x) => x.productId === v.productId) === i,
          ),
        );
      const p = localStorage.getItem(storageKey("postcode")) ?? "";
      if (/^[1-9]\d{3}$/.test(p)) setPostcodeState(p);
    } catch {}
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(storageKey("cart"), JSON.stringify(cart));
      } catch {}
  }, [cart, ready]);
  useEffect(() => {
    if (!ready || isStaticReview) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () =>
      fetch("/api/cart-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: cart.map((i) => i.productId) }),
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          setRegulatedCart(data);
          if (data.expiresAt)
            timer = setTimeout(
              () => {
                setRegulatedCart((v) => ({
                  ...v,
                  products: [],
                  expiresAt: null,
                }));
              },
              Math.max(0, new Date(data.expiresAt).getTime() - Date.now()),
            );
        })
        .catch(() => {});
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [cart, ready, bagOpen]);
  const addRestricted = (product: PublicCigar) => {
    if (isStaticReview) return;
    if (product.inventory < 1) return;
    setCart((current) => {
      const existing = current.find((i) => i.productId === product.id);
      return existing
        ? current.map((i) =>
            i.productId === product.id
              ? {
                  ...i,
                  quantity: Math.min(i.quantity + 1, product.inventory, 20),
                }
              : i,
          )
        : [...current, { productId: product.id, quantity: 1 }];
    });
    setBagOpen(true);
  };
  const setPostcode = (p: string) => {
    setPostcodeState(p);
    try {
      localStorage.setItem(storageKey("postcode"), p);
    } catch {}
  };
  const add = (id: string, quantity = 1) => {
    const p = products.find((p) => p.id === id);
    if (
      !p ||
      !deliveryEligibility(p.fulfillment, postcode, zones).eligible ||
      p.stock < 1
    )
      return;
    setCart((current) => {
      const existing = current.find((i) => i.productId === id);
      const count = Math.min((existing?.quantity ?? 0) + quantity, p.stock, 20);
      return existing
        ? current.map((i) =>
            i.productId === id ? { ...i, quantity: count } : i,
          )
        : [...current, { productId: id, quantity: count }];
    });
    setBagOpen(true);
  };
  const update = (id: string, quantity: number) => {
    const stock =
      products.find((p) => p.id === id)?.stock ??
      regulatedCart.products.find((p) => p.id === id)?.inventory ??
      0;
    setCart((current) =>
      current
        .map((i) =>
          i.productId === id
            ? { ...i, quantity: Math.min(quantity, stock, 20) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };
  const closeBag = useCallback(() => setBagOpen(false), []);
  return (
    <StoreContext.Provider
      value={{
        locale,
        editorial,
        regulatedCart,
        addRestricted,
        t: messages[locale],
        products,
        categories,
        zones,
        collections,
        cart,
        postcode,
        setPostcode,
        add,
        update,
        clear: () => setCart([]),
        openBag: () => setBagOpen(true),
        closeBag,
        bagOpen,
        ready,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
export function BrandMark({
  large = false,
  tone = "navy",
}: {
  large?: boolean;
  tone?: "navy" | "white";
}) {
  return (
    <span
      className={`brand-mark ${large ? "large" : ""} ${tone === "white" ? "on-navy" : ""}`}
    >
      <img
        src="/varathans25/brand/varathans25-original.png"
        alt="Varathans25"
        width="368"
        height="200"
      />
    </span>
  );
}
export function LanguageSelector() {
  const { locale, t } = useStore();
  const path = usePathname();
  const router = useRouter();
  return (
    <label className="language-select">
      <span className="sr-only">{t.language}</span>
      <select
        value={locale}
        onChange={(e) => {
          const l = e.target.value as Locale;
          saveLocale(l);
          router.push(path.replace(/^\/(de|fr|en)(?=\/|$)/, `/${l}`));
          router.refresh();
        }}
      >
        <option value="de">DE</option>
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (open) {
      d?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      d?.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <dialog
      className={`drawer ${className}`}
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      {children}
    </dialog>
  );
}
export function StoreShell({ children }: { children: React.ReactNode }) {
  const { locale, t, cart, openBag } = useStore();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const close = useCallback(() => setMenu(false), []);
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  const path = usePathname();
  const s = storefront[locale];
  const nav = [
    ["shop", t.shop],
    ["kitchen", s.foodNav],
    ["shop?selection=tea", s.teaNav],
    ["cigars", t.lounge],
    ["story", t.story],
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <div className="header-reserve">
        <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
          <Link
            href={`/${locale}`}
            aria-label={brand.name}
            className="logo-link"
          >
            <BrandMark />
          </Link>
          <nav className="desktop-nav" aria-label={t.menu}>
            {nav.map(([url, label]) => (
              <Link
                aria-current={path === `/${locale}/${url}` ? "page" : undefined}
                key={url}
                href={`/${locale}/${url}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link
              className="search-link"
              aria-label={t.search}
              href={`/${locale}/shop?search=1`}
            >
              <Search size={17} />
              <span>{t.search}</span>
            </Link>
            <Link
              className="account-link"
              href={`/${locale}/account`}
              aria-label={t.account}
            >
              <UserRound size={18} />
              <span>{t.account}</span>
            </Link>
            <Link
              className="language-link"
              href="/language"
              aria-label={t.language}
            >
              <Globe size={17} />
              <span>{t.language}</span>
            </Link>
            <LanguageSelector />
            <button
              aria-label={`${t.bag} ${count}`}
              className="bag-toggle"
              onClick={openBag}
            >
              <ShoppingBag size={18} />
              <span>{t.bag}</span>
              <span className="bag-count">{count}</span>
            </button>
            <button
              className="mobile-menu icon-button"
              aria-label={t.menu}
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </header>
      </div>

      <main id="main">{children}</main>
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <BrandMark large tone="white" />

            <address>
              Varathans25
              <br />
              Kavalleriestrasse 2<br />
              CH-6210 Sursee
            </address>
            <a href="mailto:info@varathans25.ch">info@varathans25.ch</a>
            <a href="tel:+41419213060">+41 41 921 30 60</a>
            <a
              className="inline-link"
              href="https://www.varathans25.ch/"
              target="_blank"
              rel="noreferrer"
            >
              {t.visitRestaurant} ↗
            </a>
          </div>
          <div>
            <h3>{t.shop}</h3>
            <Link href={`/${locale}/shop`}>{t.shop}</Link>
            <Link href={`/${locale}/collections`}>{t.collections}</Link>
            <Link href={`/${locale}/kitchen`}>{t.kitchen}</Link>
            <Link href={`/${locale}/cigars`}>{t.lounge}</Link>
            <Link href={`/${locale}/story`}>{t.story}</Link>
          </div>
          <div>
            <h3>{t.customerCare}</h3>
            <Link href={`/${locale}/delivery`}>{t.delivery}</Link>
            <Link href={`/${locale}/legal/contact`}>{t.contact}</Link>

            <Link href={`/${locale}/legal/returns`}>{t.returns}</Link>
          </div>
          <div>
            <h3>{t.legal}</h3>
            <Link href={`/${locale}/legal/impressum`}>{t.impressum}</Link>
            <Link href={`/${locale}/legal/privacy`}>{t.privacy}</Link>
            <Link href={`/${locale}/legal/terms`}>{t.terms}</Link>
            <Link href={`/${locale}/tobacco-information`}>{t.tobaccoInfo}</Link>

            <LanguageSelector />
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {brand.name} · {t.copyright}
          </span>
          <span>
            Powered by{" "}
            <strong className="atg">
              ATG<span>↗</span>
            </strong>
          </span>
        </div>
      </footer>
      <CartDrawer />
      <Modal
        open={menu}
        onClose={close}
        title={t.menu}
        className="mobile-nav-drawer"
      >
        <div className="drawer-heading">
          <BrandMark />
          <button className="icon-button" onClick={close} aria-label={t.close}>
            <X />
          </button>
        </div>
        <nav>
          {[...nav, ["account", t.account]].map(([url, label]) => (
            <Link onClick={close} key={url} href={`/${locale}/${url}`}>
              {label}
              <ArrowUpRight />
            </Link>
          ))}
        </nav>
        <LanguageSelector />
      </Modal>
    </>
  );
}
export function Quantity({
  value,
  onChange,
  max = 20,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const { t } = useStore();
  return (
    <div className="quantity">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label={t.reduce}
      >
        <Minus size={15} />
      </button>
      <output aria-label={t.quantity}>{value}</output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={t.increase}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function DeliveryBadge({ product }: { product: Product }) {
  const { t, postcode, zones } = useStore();
  const allowed =
    postcode &&
    deliveryEligibility(product.fulfillment, postcode, zones).eligible;
  return (
    <span className={`delivery-badge ${allowed ? "eligible" : ""}`}>
      {allowed ? <Check size={12} /> : <span className="status-dot" />}
      {t[product.fulfillment as keyof Messages] ?? product.fulfillment}
    </span>
  );
}
export function PostcodeForm({ compact = false }: { compact?: boolean }) {
  const inputId = useId();
  const { t, postcode, setPostcode } = useStore();
  const [draft, setValue] = useState<string | null>(null),
    [error, setError] = useState(false),
    [saved, setSaved] = useState(false);
  const value = draft ?? postcode;
  return (
    <form
      className={`postcode-form ${compact ? "compact" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^[1-9]\d{3}$/.test(value)) {
          setError(true);
          return;
        }
        setPostcode(value);
        setSaved(true);
        setError(false);
      }}
    >
      <label className="sr-only" htmlFor={inputId}>
        {t.postcode}
      </label>
      <div className="postcode-input">
        <MapPin size={19} />
        <input
          id={inputId}
          name="postcode"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder={postcode || "8001"}
          maxLength={4}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
            if (/^[1-9]\d{3}$/.test(e.target.value)) {
              setPostcode(e.target.value);
              setError(false);
            }
          }}
          aria-invalid={error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <button aria-label={t.check} type="submit">
          <span>{t.check}</span>
          <ArrowRight size={20} />
        </button>
      </div>
      {error && (
        <p role="alert" className="error-text" id={`${inputId}-error`}>
          {t.postcodeInvalid}
        </p>
      )}
      {(saved || postcode) && !error && (
        <p className="postcode-success" role="status">
          <Check size={14} />
          {t.postcodeSaved} {postcode}
        </p>
      )}
    </form>
  );
}
export function AddButton({
  product,
  quantity = 1,
}: {
  product: Product;
  quantity?: number;
}) {
  const { t, postcode, zones, add } = useStore();
  const [checking, setChecking] = useState(false);
  const eligible = deliveryEligibility(
    product.fulfillment,
    postcode,
    zones,
  ).eligible;
  const intrinsicallyUnavailable =
    product.fulfillment === "DELIVERY_UNAVAILABLE" ||
    product.stock === 0 ||
    product.verification === "AWAITING_PARTNER_VERIFICATION";
  return (
    <div className="add-control">
      <button
        className="button add-button"
        disabled={intrinsicallyUnavailable || (!!postcode && !eligible)}
        onClick={() => {
          if (!postcode) setChecking((v) => !v);
          else {
            add(product.id, quantity);
            setChecking(false);
          }
        }}
      >
        {intrinsicallyUnavailable
          ? t.unavailable
          : postcode && !eligible
            ? t.unavailable
            : !postcode
              ? t.checkPostcode
              : t.add}
        {!intrinsicallyUnavailable && <Plus size={17} />}
      </button>
      {checking && (
        <div className="inline-postcode">
          <p>{t.deliveryBeforeAdd}</p>
          <PostcodeForm compact />
        </div>
      )}
    </div>
  );
}
export function ProductCard({ product }: { product: Product }) {
  const { locale, t } = useStore();
  const tr = translation(product, locale);
  return (
    <article className="product-card">
      <Link
        href={`/${locale}/product/${product.slug}`}
        className="product-image"
      >
        <img
          src={product.image}
          alt={`${tr.name} — ${t.illustration}`}
          width={600}
          height={660}
          loading="lazy"
        />
        {product.launchPriceCents && (
          <span className="product-badge">{t.launch}</span>
        )}
        <span className="image-arrow" aria-hidden="true">
          <ArrowUpRight size={20} />
        </span>
      </Link>
      <div className="product-meta">
        <DeliveryBadge product={product} />
        <span>{product.weight}</span>
      </div>
      <Link
        className="product-name"
        href={`/${locale}/product/${product.slug}`}
      >
        <h3>{tr.name}</h3>
      </Link>

      <div className="product-price">
        <span>{money(price(product), locale)}</span>
        {product.launchPriceCents && <s>{money(product.priceCents, locale)}</s>}
      </div>
      <p className="micro">{storefront[locale].provisionalPrice}</p>
      <p className="stock-status">
        {product.stock > 0 && product.fulfillment === "AMBIENT_NATIONAL"
          ? t.available
          : storefront[locale].comingSoon}
      </p>
      {product.verification === "AWAITING_PARTNER_VERIFICATION" && (
        <p className="micro warning">{t.partnerUnverified}</p>
      )}
      <AddButton product={product} />
    </article>
  );
}
export function CartDrawer() {
  const {
    bagOpen,
    closeBag,
    regulatedCart,
    cart,
    products,
    locale,
    t,
    update,
    postcode,
    zones,
  } = useStore();
  const items = cart.map((i) => ({
    ...i,
    product: products.find((p) => p.id === i.productId),
  }));
  const subtotal = items.reduce(
    (n, i) => n + (i.product ? price(i.product) * i.quantity : 0),
    0,
  );
  const mixed = new Set(items.map((i) => i.product?.fulfillment)).size > 1;
  const invalid = items.some(
    (i) =>
      !i.product ||
      i.product.stock < i.quantity ||
      !deliveryEligibility(i.product.fulfillment, postcode, zones).eligible,
  );
  return (
    <Modal open={bagOpen} onClose={closeBag} title={t.yourBag}>
      <div className="drawer-heading">
        <h2>
          {t.yourBag}{" "}
          <span className="muted">
            ({cart.reduce((n, i) => n + i.quantity, 0)})
          </span>
        </h2>
        <button aria-label={t.close} className="icon-button" onClick={closeBag}>
          <X />
        </button>
      </div>
      {!cart.length ? (
        <div className="empty-state">
          <ShoppingBag size={38} strokeWidth={1} />
          <h3>{t.emptyBag}</h3>
          <p>{t.emptyBagCopy}</p>
          <Link className="button" onClick={closeBag} href={`/${locale}/shop`}>
            {t.explore}
            <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <>
          {regulatedCart.restrictedIds.length > 0 && (
            <div className="restricted-cart-notice">
              <h3>{t.restrictedGroup}</h3>
              <p>{t.cigarCheckoutDisabled}</p>
              <p>{t.adultDelivery}</p>
              <p>{t.noMinors}</p>
              <p>{t.mixedAdult}</p>
              <p className="health-warning">{regulatoryWarnings[locale]}</p>
            </div>
          )}
          <div className="cart-lines">
            {regulatedCart.restrictedIds.length > 0 &&
              items.some((i) => i.product) && (
                <h3 className="cart-group-heading">{t.standardGroup}</h3>
              )}
            {items.map(({ product, quantity, productId }) =>
              product ? (
                <article className="cart-line" key={product.id}>
                  <img src={product.image} width={90} height={110} alt="" />
                  <div>
                    <Link
                      href={`/${locale}/product/${product.slug}`}
                      onClick={closeBag}
                    >
                      {translation(product, locale).name}
                    </Link>
                    <DeliveryBadge product={product} />
                    <div className="cart-controls">
                      <Quantity
                        value={quantity}
                        onChange={(q) => update(product.id, q)}
                        max={Math.min(product.stock, 20)}
                      />
                      <button
                        className="text-button"
                        onClick={() => update(product.id, 0)}
                      >
                        {t.remove}
                      </button>
                    </div>
                  </div>
                  <span>{money(price(product) * quantity, locale)}</span>
                </article>
              ) : (
                <div key={productId} className="notice unavailable-cart-line">
                  {regulatedCart.restrictedIds.includes(productId) ? (
                    <>
                      <h3>{t.restrictedGroup}</h3>
                      {regulatedCart.products.find(
                        (p) => p.id === productId,
                      ) ? (
                        <p>
                          {
                            regulatedCart.products.find(
                              (p) => p.id === productId,
                            )!.name
                          }{" "}
                          · {quantity} ·{" "}
                          {money(
                            regulatedCart.products.find(
                              (p) => p.id === productId,
                            )!.priceCents * quantity,
                            locale,
                          )}
                        </p>
                      ) : (
                        <Link
                          className="inline-link"
                          href={`/${locale}/cigars`}
                          onClick={closeBag}
                        >
                          {t.reviewAge}
                        </Link>
                      )}
                    </>
                  ) : (
                    t.PRODUCT_UNAVAILABLE
                  )}
                  <button onClick={() => update(productId, 0)}>
                    {t.remove}
                  </button>
                </div>
              ),
            )}
          </div>
          <div className="cart-bottom">
            {mixed && (
              <p role="alert" className="notice">
                {t.mixedWarning}
              </p>
            )}
            {invalid && (
              <p role="alert" className="notice">
                {t.DELIVERY_INELIGIBLE}
              </p>
            )}
            <div className="summary-row">
              <span>
                {regulatedCart.restrictedIds.length
                  ? `${t.standardGroup} · ${t.subtotal}`
                  : t.subtotal}
              </span>
              <strong>{money(subtotal, locale)}</strong>
            </div>
            <p className="micro">{t.cartNote}</p>
            {isStaticReview ? (
              <button className="button full disabled" disabled>
                {t.checkout}
                <ArrowRight size={18} />
              </button>
            ) : (
              <Link
                aria-disabled={mixed || invalid}
                className={`button full ${mixed || invalid ? "disabled" : ""}`}
                onClick={(e) => {
                  if (mixed || invalid) e.preventDefault();
                  else closeBag();
                }}
                href={`/${locale}/checkout`}
              >
                {t.checkout}
                <ArrowRight size={18} />
              </Link>
            )}
            <button className="text-button continue-link" onClick={closeBag}>
              {t.continueShopping}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
export function DeliverySection() {
  const { t, postcode, products, zones, locale } = useStore();
  const s = storefront[locale];
  return (
    <section className="section delivery-section" id="delivery-check">
      <div className="delivery-intro">
        <h2>{t.where}</h2>
        <p>{s.deliveryCopy}</p>
        <PostcodeForm />
      </div>
      <div className="delivery-options" aria-live="polite">
        {[
          [Truck, t.national, s.nationalCopy, "AMBIENT_NATIONAL"],
          [MapPin, t.regional, s.regionalCopy, "CHILLED_REGIONAL"],
          [ShoppingBag, t.pickup, s.pickupCopy, "RESTAURANT_PICKUP"],
        ].map(([Icon, title, copy, kind]) => {
          const C = Icon as typeof Truck;
          const matches = products.filter(
            (p) =>
              (p.fulfillment === kind ||
                (kind === "CHILLED_REGIONAL" &&
                  p.fulfillment === "FROZEN_REGIONAL")) &&
              p.stock > 0 &&
              deliveryEligibility(p.fulfillment, postcode, zones).eligible,
          );
          return (
            <div className="delivery-option" key={String(kind)}>
              <C size={28} strokeWidth={1.4} />
              <h3>{String(title)}</h3>
              <p>{String(copy)}</p>
              <span className="delivery-result">
                {postcode
                  ? matches.length
                    ? `${t.available} · ${matches.length} ${t.products}`
                    : s.noDelivery
                  : s.postcodePrompt}
              </span>
              {postcode && matches.length > 0 && (
                <Link
                  className="inline-link"
                  href={`/${locale}/shop?available=1`}
                >
                  {s.seeProducts}
                  <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
