import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import {
  lineSchema,
  formatMoney,
  deliveryMessages,
  calculateCart,
  delivery,
  type CartLine,
  type Locale,
} from "./domain";
import {
  publicCatalogue,
  closedSettings,
  type PublishedProduct,
  type PublicSettings,
  type Quote,
  type StoreAPI,
} from "./catalogue";
import bundledFallback from "./published-fallback.json";
const copy = {
  en: {
    box: "Build your cigar box",
    four: "Box of 4",
    six: "Box of 6",
    add: "Add",
    addBox: "Add complete box",
    remove: "Remove",
    empty: "Empty slot",
    progress: "cigars selected",
    summary: "Your selection",
    single: "per single cigar",
    cart: "Shopping bag",
    quantity: "Quantity",
    total: "Merchandise subtotal",
    checkout: "Checkout unavailable",
    offline:
      "The live catalogue is temporarily unavailable. Ordering is paused.",
    age: "Confirm that you are 18 or older to select cigars.",
    stock:
      "Selection could not be confirmed. Check availability and quantities.",
    confirmed: "Selection added to your bag.",
    free: "Free-delivery progress",
  },
  de: {
    box: "Eigene Zigarrenkiste zusammenstellen",
    four: "Kiste mit 4",
    six: "Kiste mit 6",
    add: "Hinzufügen",
    addBox: "Vollständige Kiste hinzufügen",
    remove: "Entfernen",
    empty: "Freier Platz",
    progress: "Zigarren ausgewählt",
    summary: "Ihre Auswahl",
    single: "pro einzelne Zigarre",
    cart: "Warenkorb",
    quantity: "Menge",
    total: "Warenzwischensumme",
    checkout: "Bestellung noch nicht verfügbar",
    offline:
      "Der Live-Katalog ist vorübergehend nicht verfügbar. Bestellungen sind pausiert.",
    age: "Bestätigen Sie, dass Sie mindestens 18 Jahre alt sind, um Zigarren auszuwählen.",
    stock:
      "Die Auswahl konnte nicht bestätigt werden. Verfügbarkeit und Mengen prüfen.",
    confirmed: "Auswahl zum Warenkorb hinzugefügt.",
    free: "Fortschritt zur kostenlosen Lieferung",
  },
  fr: {
    box: "Composez votre boîte de cigares",
    four: "Boîte de 4",
    six: "Boîte de 6",
    add: "Ajouter",
    addBox: "Ajouter la boîte complète",
    remove: "Retirer",
    empty: "Emplacement libre",
    progress: "cigares sélectionnés",
    summary: "Votre sélection",
    single: "par cigare à l’unité",
    cart: "Panier",
    quantity: "Quantité",
    total: "Sous-total des articles",
    checkout: "Commande indisponible",
    offline:
      "Le catalogue en ligne est temporairement indisponible. Les commandes sont suspendues.",
    age: "Confirmez avoir au moins 18 ans pour sélectionner des cigares.",
    stock:
      "La sélection n’a pas pu être confirmée. Vérifiez la disponibilité et les quantités.",
    confirmed: "Sélection ajoutée au panier.",
    free: "Progression vers la livraison gratuite",
  },
};
const CART = "varathans25_commerce_cart_v1",
  BOX = "varathans25_commerce_box_v1";
type Commerce = {
  products: PublishedProduct[];
  settings: PublicSettings;
  online: boolean;
  cart: CartLine[];
  quote: Quote | null;
  locale: Locale;
  adult: boolean;
  busy: boolean;
  error: string;
  remove: (index: number) => void;
  change: (lines: CartLine[]) => Promise<boolean>;
};
const Context = createContext<Commerce | null>(null);
export function useCommerce() {
  const value = useContext(Context);
  if (!value) throw Error("CommerceProvider required");
  return value;
}
// Mount inside the approved storefront provider. Pass the existing compact gate's
// confirmed state; do not replace the established design or create another gate.
export function CommerceProvider({
  api,
  locale,
  adultConfirmed,
  children,
}: {
  api: StoreAPI | null;
  locale: Locale;
  adultConfirmed: boolean;
  children: ReactNode;
}) {
  const [products, setProducts] = useState<PublishedProduct[]>(() =>
      publicCatalogue
        .parse(bundledFallback.products)
        .map((p) => ({ ...p, available: false })),
    ),
    [settings, setSettings] = useState(closedSettings),
    [online, setOnline] = useState(false),
    [cart, setCart] = useState<CartLine[]>([]),
    [quote, setQuote] = useState<Quote | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    version = useRef(0);
  useEffect(() => {
    try {
      setCart(
        z
          .array(lineSchema)
          .max(30)
          .parse(JSON.parse(localStorage.getItem(CART) ?? "[]")),
      );
    } catch {
      /* Ignore tampered browser data. Server quotes remain authoritative. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(CART, JSON.stringify(cart));
      } catch {
        /* Private browsing may disable persistence. */
      }
  }, [cart, ready]);
  useEffect(() => {
    let live = true;
    const refresh = async () => {
      if (!api) return;
      try {
        const [p, s] = await Promise.all([api.catalogue(), api.settings()]);
        if (live) {
          setProducts(p);
          setSettings(s);
          setOnline(true);
        }
      } catch {
        if (live) {
          setOnline(false);
          setQuote(null);
        }
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 60000);
    window.addEventListener("focus", refresh);
    return () => {
      live = false;
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [api]);
  useEffect(() => {
    const rev = ++version.current;
    setQuote(null);
    if (!online || !api || !cart.length) return;
    api
      .quote(cart, adultConfirmed)
      .then((q) => {
        if (rev === version.current) {
          setQuote(q);
          setError("");
        }
      })
      .catch(() => {
        if (rev === version.current) setError(copy[locale].stock);
      });
  }, [api, cart, adultConfirmed, online, products, locale]);
  async function change(lines: CartLine[]) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (lines.length) {
        if (!api || !online) throw Error();
        calculateCart(
          lines,
          products,
          adultConfirmed,
          settings.bundle_discount_bps,
        );
        const q = await api.quote(lines, adultConfirmed);
        setQuote(q);
      } else setQuote(null);
      setCart(lines);
      return true;
    } catch {
      setError(
        !online
          ? copy[locale].offline
          : !adultConfirmed &&
              lines.some(
                (l) =>
                  l.kind === "box" ||
                  products.find((p) => p.id === l.product_id)?.adult_only,
              )
            ? copy[locale].age
            : copy[locale].stock,
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        products,
        settings,
        online,
        cart,
        quote,
        locale,
        adult: adultConfirmed,
        busy,
        error,
        remove: (index: number) => {
          setCart((lines) => lines.filter((_, i) => i !== index));
          setQuote(null);
          setError("");
        },
        change,
      }}
    >
      {!online && <p role="status">{copy[locale].offline}</p>}
      {children}
    </Context.Provider>
  );
}
export function SingleCigarPurchase({
  product,
}: {
  product: PublishedProduct;
}) {
  const c = useCommerce(),
    t = copy[c.locale];
  return (
    <div className="cigar-purchase">
      <p>
        {formatMoney(
          product.promotion_rappen ?? product.price_rappen,
          c.locale,
        )}{" "}
        <span>{t.single}</span>
      </p>
      <button
        disabled={!c.adult || !c.online || !product.available || c.busy}
        onClick={() => {
          const match = c.cart.findIndex(
            (l) => l.kind === "single" && l.product_id === product.id,
          );
          const lines = [...c.cart];
          if (match >= 0)
            lines[match] = {
              ...lines[match],
              quantity: lines[match].quantity + 1,
            };
          else
            lines.push({ kind: "single", product_id: product.id, quantity: 1 });
          void c.change(lines);
        }}
      >
        {t.add}
      </button>
      {!c.adult && <p>{t.age}</p>}
    </div>
  );
}
const boxSchema = z.object({
  size: z.union([z.literal(4), z.literal(6)]),
  ids: z.array(z.string().uuid()).max(6),
});
export function CigarBoxBuilder() {
  const c = useCommerce(),
    t = copy[c.locale],
    [box, setBox] = useState<{ size: 4 | 6; ids: string[] }>({
      size: 4,
      ids: [],
    }),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const saved = boxSchema.parse(
        JSON.parse(localStorage.getItem(BOX) ?? "null"),
      );
      setBox({ ...saved, ids: saved.ids.slice(0, saved.size) });
    } catch {
      /* Start empty. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(BOX, JSON.stringify(box));
      } catch {
        /* No storage available. */
      }
  }, [box, ready]);
  const cigars = c.products.filter(
    (p) => p.adult_only && ["Patoro", "Davidoff"].includes(p.brand),
  );
  const groups: Record<string, number> = {};
  for (const id of box.ids) groups[id] = (groups[id] ?? 0) + 1;
  const sum = box.ids.reduce((n, id) => {
    const p = cigars.find((p) => p.id === id);
    return n + (p ? (p.promotion_rappen ?? p.price_rappen) : 0);
  }, 0);
  return (
    <section className="cigar-box-builder" aria-label={t.box}>
      <h2>{t.box}</h2>
      <div className="box-sizes">
        {([4, 6] as const).map((size) => (
          <button
            key={size}
            aria-pressed={box.size === size}
            onClick={() => {
              setBox((b) => ({ size, ids: b.ids.slice(0, size) }));
              setNotice("");
            }}
          >
            {size === 4 ? t.four : t.six}
          </button>
        ))}
      </div>
      <p aria-live="polite">
        {box.ids.length} / {box.size} {t.progress}
      </p>
      <ol className="box-slots">
        {Array.from({ length: box.size }, (_, i) => {
          const p = cigars.find((p) => p.id === box.ids[i]);
          return (
            <li key={i}>
              {box.ids[i] ? (
                <>
                  {p?.translations.find((tr) => tr.locale === c.locale)?.name ??
                    t.stock}
                  <button
                    aria-label={`${t.remove} ${i + 1}`}
                    onClick={() =>
                      setBox((b) => ({
                        ...b,
                        ids: b.ids.filter((_, n) => n !== i),
                      }))
                    }
                  >
                    {t.remove}
                  </button>
                </>
              ) : (
                t.empty
              )}
            </li>
          );
        })}
      </ol>
      {!c.adult ? (
        <p>{t.age}</p>
      ) : (
        <div className="box-catalogue">
          {cigars.map((p) => (
            <div key={p.id}>
              <span>
                {p.translations.find((tr) => tr.locale === c.locale)?.name}
              </span>
              <span>
                {formatMoney(p.promotion_rappen ?? p.price_rappen, c.locale)}
              </span>
              <button
                disabled={
                  box.ids.length === box.size || !p.available || !c.online
                }
                onClick={() => {
                  setBox((b) =>
                    b.ids.length < b.size ? { ...b, ids: [...b.ids, p.id] } : b,
                  );
                  setNotice("");
                }}
                aria-label={`${t.add} ${p.translations.find((tr) => tr.locale === c.locale)?.name}`}
              >
                {t.add}
              </button>
            </div>
          ))}
        </div>
      )}
      <h3>{t.summary}</h3>
      <ul>
        {Object.entries(groups).map(([id, count]) => (
          <li key={id}>
            {count} ×{" "}
            {cigars
              .find((p) => p.id === id)
              ?.translations.find((tr) => tr.locale === c.locale)?.name ??
              t.stock}
          </li>
        ))}
      </ul>
      <p>
        {formatMoney(
          sum - Math.floor((sum * c.settings.bundle_discount_bps) / 10000),
          c.locale,
        )}
      </p>
      <button
        disabled={
          box.ids.length !== box.size || !c.adult || !c.online || c.busy
        }
        onClick={async () => {
          if (
            await c.change([
              ...c.cart,
              {
                kind: "box",
                size: box.size,
                product_ids: [...box.ids],
                quantity: 1,
              },
            ])
          ) {
            setBox((b) => ({ ...b, ids: [] }));
            setNotice(t.confirmed);
          }
        }}
      >
        {t.addBox}
      </button>
      <p role="status">{notice}</p>
      {c.error && <p role="alert">{c.error}</p>}
    </section>
  );
}
export function FreeDeliveryProgress({
  subtotal,
  discount = 0,
  standard = null,
  adult = 0,
  locale,
}: {
  subtotal: number;
  discount?: number;
  standard?: number | null;
  adult?: number | null;
  locale: Locale;
}) {
  const q = delivery(subtotal, discount, standard, adult),
    t = deliveryMessages[locale];
  return (
    <div className="free-delivery" aria-live="polite">
      <p>
        {q.remaining ? t.remaining(formatMoney(q.remaining, locale)) : t.free}
      </p>
      <progress
        max={10000}
        value={Math.min(q.net, 10000)}
        aria-label={copy[locale].free}
      />
      {q.standard === null && <p>{t.unconfigured}</p>}
      {adult !== 0 && <p>{t.adult}</p>}
    </div>
  );
}
export function CommerceCart() {
  const c = useCommerce(),
    t = copy[c.locale];
  return (
    <section className="commerce-cart" aria-label={t.cart}>
      <h2>{t.cart}</h2>
      <ul>
        {c.cart.map((line, i) => (
          <li key={i}>
            {line.kind === "box"
              ? `${line.size} · ${t.box}`
              : (c.products
                  .find((p) => p.id === line.product_id)
                  ?.translations.find((tr) => tr.locale === c.locale)?.name ??
                t.stock)}
            {line.kind === "box" && (
              <ul>
                {Object.entries(
                  line.product_ids.reduce<Record<string, number>>(
                    (a, id) => ({ ...a, [id]: (a[id] ?? 0) + 1 }),
                    {},
                  ),
                ).map(([id, n]) => (
                  <li key={id}>
                    {n} ×{" "}
                    {c.products
                      .find((p) => p.id === id)
                      ?.translations.find((tr) => tr.locale === c.locale)
                      ?.name ?? t.stock}
                  </li>
                ))}
              </ul>
            )}
            <label>
              {t.quantity}
              <input
                aria-label={`${t.quantity} ${i + 1}`}
                type="number"
                min="1"
                max="100"
                step="1"
                value={line.quantity}
                disabled={c.busy}
                onChange={(e) => {
                  const quantity = Number(e.target.value);
                  if (Number.isInteger(quantity) && quantity > 0)
                    void c.change(
                      c.cart.map((l, n) => (n === i ? { ...l, quantity } : l)),
                    );
                }}
              />
            </label>
            <button onClick={() => c.remove(i)}>{t.remove}</button>
          </li>
        ))}
      </ul>
      {c.quote && (
        <>
          <p>
            {t.total}: {formatMoney(c.quote.net_rappen, c.locale)}
          </p>
          <FreeDeliveryProgress
            subtotal={c.quote.subtotal_rappen}
            discount={c.quote.discount_rappen}
            standard={c.settings.standard_delivery_rappen}
            adult={c.quote.adult_delivery_rappen}
            locale={c.locale}
          />
        </>
      )}
      {c.error && <p role="alert">{c.error}</p>}
      <button disabled>{t.checkout}</button>
    </section>
  );
}
