import { useState } from "react";
import { createRoot } from "react-dom/client";
import { publicStore } from "../src/catalogue";
import {
  CommerceProvider,
  CommerceCart,
  CigarBoxBuilder,
  SingleCigarPurchase,
  useCommerce,
  FreeDeliveryProgress,
} from "../src/storefront";
import type { Locale } from "../src/domain";
import "../src/style.css";
import "../src/storefront.css";
const api = publicStore(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
function Products() {
  const c = useCommerce();
  return (
    <section>
      <h2>Single cigars</h2>
      {c.products
        .filter((p) => p.adult_only)
        .map((p) => (
          <article key={p.id}>
            <h3>{p.translations.find((t) => t.locale === c.locale)?.name}</h3>
            <SingleCigarPurchase product={p} />
          </article>
        ))}
    </section>
  );
}
function Harness() {
  const [locale, setLocale] = useState<Locale>("en"),
    [adult, setAdult] = useState(
      () => sessionStorage.getItem("varathans25_test_adult") === "yes",
    );
  return (
    <main className="workspace">
      <h1>Commerce integration test</h1>
      <p>Local synthetic data. This harness is not the approved storefront.</p>
      <label htmlFor="locale">Language</label>
      <select
        id="locale"
        value={locale}
        onChange={(e) => {
          setLocale(e.target.value as Locale);
          document.documentElement.lang = e.target.value;
        }}
      >
        <option>en</option>
        <option>de</option>
        <option>fr</option>
      </select>
      <button
        onClick={() => {
          setAdult(true);
          sessionStorage.setItem("varathans25_test_adult", "yes");
        }}
      >
        Confirm 18+
      </button>
      <CommerceProvider api={api} locale={locale} adultConfirmed={adult}>
        <Products />
        <CigarBoxBuilder />
        <CommerceCart />
      </CommerceProvider>
      <section>
        <h2>CHF 99.99</h2>
        <FreeDeliveryProgress locale={locale} subtotal={9999} standard={790} />
        <h2>CHF 100.00</h2>
        <FreeDeliveryProgress locale={locale} subtotal={10000} standard={790} />
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
