import { useI18n } from "./i18n";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { products, saveProduct, rpc, db, imageUrl } from "./api";
import {
  blankProduct,
  translationFields,
  missingTranslationFields,
  formatMoney,
  moneyInput,
  parseMoney,
  locales,
  type Product,
  type ProductDocument,
  type Role,
  type ProductImage,
} from "./domain";
import { Field, ErrorMessage, message } from "./ui";
export function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(moneyInput(value));
  return (
    <Field label={label}>
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          try {
            const n = parseMoney(value);
            e.target.setCustomValidity("");
            onChange(n);
          } catch (error) {
            e.target.dataset.errorKey = message(error);
            e.target.setCustomValidity(t(message(error)));
          }
        }}
      />
    </Field>
  );
}
export function Products({ role }: { role: Role }) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Product[]>([]),
    [editor, setEditor] = useState<Product | "new" | null>(null),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [version, setVersion] = useState(0),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let live = true;
    products(search, page)
      .then((data) => {
        if (live) setRows(data);
      })
      .catch((e) => setError(message(e)));
    return () => {
      live = false;
    };
  }, [search, page, version]);
  if (editor)
    return (
      <ProductEditor
        key={editor === "new" ? "new" : editor.id}
        initial={editor === "new" ? null : editor}
        role={role}
        cancel={() => setEditor(null)}
        saved={() => {
          setEditor(null);
          setVersion((v) => v + 1);
          setNotice("Product saved.");
        }}
      />
    );
  return (
    <>
      <div className="toolbar">
        <Field label="Search product slug">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </Field>
        <button className="primary" onClick={() => setEditor("new")}>
          {t("Create product")}
        </button>
      </div>
      <ErrorMessage error={error} />
      <p role="status">{notice && t(notice)}</p>
      <div
        className="table-wrap"
        role="region"
        aria-label={t("Products")}
        tabIndex={0}
      >
        <table>
          <caption>
            {t("Products · page")} {page + 1}
          </caption>
          <thead>
            <tr>
              <th>{t("Name / SKU")}</th>
              <th>{t("Status")}</th>
              <th>CHF</th>
              <th>DE / FR / EN</th>
              <th>{t("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.translations.find((t) => t.locale === locale)?.name ||
                    p.slug}
                  <small>{p.sku ?? t("SKU pending")}</small>
                </td>
                <td>
                  <span className="badge">{p.status}</span>
                </td>
                <td>
                  {p.price_rappen === null
                    ? t("Unconfirmed")
                    : formatMoney(p.price_rappen, locale)}
                </td>
                <td>
                  {locales.map((l) => (
                    <span key={l}>
                      {l.toUpperCase()}{" "}
                      {p.translations.some(
                        (t) =>
                          t.locale === l && !missingTranslationFields(t).length,
                      )
                        ? "✓"
                        : "—"}{" "}
                    </span>
                  ))}
                </td>
                <td>
                  <button onClick={() => setEditor(p)}>
                    {t("Edit")} {p.slug}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p>{t("No matching products.")}</p>}
      <Pagination page={page} next={rows.length === 50} change={setPage} />
    </>
  );
}
export function Pagination({
  page,
  next,
  change,
}: {
  page: number;
  next: boolean;
  change: (p: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="toolbar">
      <button disabled={page === 0} onClick={() => change(page - 1)}>
        {t("Previous page")}
      </button>
      <span>
        {t("Page")} {page + 1}
      </span>
      <button disabled={!next} onClick={() => change(page + 1)}>
        {t("Next page")}
      </button>
    </div>
  );
}
function ProductEditor({
  initial,
  role,
  cancel,
  saved,
}: {
  initial: Product | null;
  role: Role;
  cancel: () => void;
  saved: () => void;
}) {
  const { t, locale } = useI18n();
  const [doc, setDoc] = useState<ProductDocument>(() =>
      initial ? structuredClone(initial) : blankProduct(),
    ),
    [nutrition, setNutrition] = useState(
      JSON.stringify(initial?.nutrition ?? {}, null, 2),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false),
    [lang, setLang] = useState<"de" | "fr" | "en">("de");
  const set = <K extends keyof ProductDocument>(
    key: K,
    value: ProductDocument[K],
  ) => setDoc((d) => ({ ...d, [key]: value }));
  const uploadInput = useRef<HTMLInputElement>(null);
  const translation = doc.translations.find((t) => t.locale === lang)!;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const parsed: unknown = JSON.parse(nutrition);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
        throw new Error("Nutrition must be an object.");
      await saveProduct(
        { ...doc, nutrition: parsed as Record<string, unknown> },
        initial?.revision ?? null,
      );
      saved();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      if (!initial) throw new Error("Save the draft before uploading images.");
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5242880
      )
        throw new Error("Choose a JPEG, PNG or WebP image of at most 5 MB.");
      const path = `${initial.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await db()
        .storage.from("v25-products")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      set("images", [
        ...doc.images,
        {
          storage_path: path,
          legacy_path: null,
          position: doc.images.length,
          alt: { de: "", fr: "", en: "" },
        },
      ]);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function move(index: number, delta: number) {
    const images = [...doc.images].sort((a, b) => a.position - b.position);
    [images[index], images[index + delta]] = [
      images[index + delta],
      images[index],
    ];
    set(
      "images",
      images.map((image, position) => ({ ...image, position })),
    );
  }
  return (
    <section className="panel">
      <div className="toolbar">
        <h2>{t(initial ? "Edit product" : "Create draft product")}</h2>
        <button onClick={cancel}>{t("Back to products")}</button>
      </div>
      <form onSubmit={submit}>
        <div className="grid">
          <Field label="Product slug">
            <input
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={doc.slug}
              onChange={(e) => set("slug", e.target.value)}
            />
          </Field>
          <Field label="SKU">
            <input
              value={doc.sku ?? ""}
              onChange={(e) => set("sku", e.target.value || null)}
            />
          </Field>
          <Field label="Barcode">
            <input
              value={doc.barcode ?? ""}
              onChange={(e) => set("barcode", e.target.value || null)}
            />
          </Field>
          {(["category", "brand", "origin", "supplier"] as const).map((k) => (
            <Field
              key={k}
              label={
                k === "origin"
                  ? "Country of origin"
                  : k[0].toUpperCase() + k.slice(1)
              }
            >
              <input value={doc[k]} onChange={(e) => set(k, e.target.value)} />
            </Field>
          ))}
          <MoneyField
            label="Price CHF"
            value={doc.price_rappen}
            onChange={(n) => set("price_rappen", n)}
          />
          <MoneyField
            label="Promotion price CHF"
            value={doc.promotion_rappen}
            onChange={(n) => set("promotion_rappen", n)}
          />
          <Field label="Weight in grams">
            <input
              type="number"
              min="1"
              step="1"
              value={doc.weight_grams ?? ""}
              onChange={(e) =>
                set(
                  "weight_grams",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </Field>
          <Field label="Status">
            <select
              value={doc.status}
              onChange={(e) =>
                set("status", e.target.value as ProductDocument["status"])
              }
            >
              <option value="draft">draft</option>
              <option value="active" disabled={role === "product_editor"}>
                active
              </option>
              <option value="archived">archived</option>
            </select>
          </Field>
        </div>
        <fieldset>
          <legend>{t("Product controls")}</legend>
          {(
            [
              "available",
              "featured",
              "most_picked",
              "adult_only",
              "information_confirmed",
              "price_confirmed",
            ] as const
          ).map((k) => (
            <label className="check" key={k}>
              <input
                type="checkbox"
                checked={doc[k]}
                onChange={(e) => set(k, e.target.checked)}
              />
              {t(
                {
                  available: "Available for sale",
                  featured: "Featured",
                  most_picked: "Most picked",
                  adult_only: "Cigar / adult product (18+)",
                  information_confirmed:
                    "Product information verified against the label",
                  price_confirmed: "Selling price confirmed",
                }[k],
              )}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>{t("DE / FR / EN product information")}</legend>
          <div
            className="tabs"
            role="group"
            aria-label={t("Product content language")}
          >
            {locales.map((l) => (
              <button
                type="button"
                key={l}
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="muted">
            {t(
              "Enter verified content separately for each language. Missing legal, ingredient and allergen information stays blank.",
            )}
          </p>
          <p role="status">
            {t("Missing fields in {language}: {count}", {
              language: lang.toUpperCase(),
              count: missingTranslationFields(translation).length,
            })}
          </p>
          {translationFields.map((k) => (
            <Field
              key={`${lang}-${k}`}
              label={`${lang.toUpperCase()} ${t(k)}`}
              incomplete={!translation?.[k]?.trim()}
            >
              <textarea
                lang={lang}
                value={translation?.[k] ?? ""}
                onChange={(e) =>
                  set(
                    "translations",
                    locales.map((locale) => {
                      const t = doc.translations.find(
                        (t) => t.locale === locale,
                      ) ?? {
                        locale,
                        name: "",
                        description: "",
                        short_description: "",
                        preparation_instructions: "",
                        seo_title: "",
                        seo_description: "",
                        ingredients: "",
                        allergens: "",
                        storage_instructions: "",
                      };
                      return locale === lang
                        ? { ...t, [k]: e.target.value }
                        : t;
                    }),
                  )
                }
              />
            </Field>
          ))}
        </fieldset>
        <Field label="Nutrition (verified JSON, including units)">
          <textarea
            className="code"
            value={nutrition}
            onChange={(e) => setNutrition(e.target.value)}
          />
        </Field>
        <fieldset>
          <legend>{t("Product images")}</legend>
          <p>
            {t(
              "Upload JPEG, PNG or WebP. Save the draft first. Image order and alt text are saved with the product.",
            )}
          </p>
          <Field label="Upload product image">
            <input
              ref={uploadInput}
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!initial || busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </Field>
          <button
            type="button"
            disabled={!initial || busy}
            onClick={() => uploadInput.current?.click()}
          >
            {t("Choose image")}
          </button>
          {[...doc.images]
            .sort((a, b) => a.position - b.position)
            .map((im, i) => (
              <div
                className="image-row"
                key={im.storage_path ?? im.legacy_path}
              >
                <ImagePreview image={im} />
                <div>
                  {locales.map((l) => (
                    <Field
                      key={l}
                      label={t("{language} image {number} alt text", {
                        language: l.toUpperCase(),
                        number: i + 1,
                      })}
                    >
                      <input
                        value={im.alt[l] ?? ""}
                        onChange={(e) =>
                          set(
                            "images",
                            doc.images.map((m, n) =>
                              n === i
                                ? {
                                    ...m,
                                    alt: { ...m.alt, [l]: e.target.value },
                                  }
                                : m,
                            ),
                          )
                        }
                      />
                    </Field>
                  ))}
                </div>
                <div className="actions">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    {t("Move up")}
                  </button>
                  <button
                    type="button"
                    disabled={i === doc.images.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    {t("Move down")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "images",
                        doc.images
                          .filter((_, n) => n !== i)
                          .map((m, position) => ({ ...m, position })),
                      )
                    }
                  >
                    {t("Remove image")} {i + 1}
                  </button>
                </div>
              </div>
            ))}
        </fieldset>
        <ErrorMessage error={error} />
        <div className="toolbar">
          <button className="primary" disabled={busy}>
            {t(busy ? "Saving…" : "Save product")}
          </button>
          <button type="button" onClick={() => setPreview((p) => !p)}>
            {t(preview ? "Close preview" : "Preview before publishing")}
          </button>
          {initial && (
            <button
              type="button"
              onClick={async () => {
                setError("");
                try {
                  await rpc("v25_duplicate_product", {
                    product: initial.id,
                    new_slug: `${initial.slug}-copy-${crypto.randomUUID().slice(0, 8)}`,
                    new_sku: null,
                  });
                  saved();
                } catch (e) {
                  setError(message(e));
                }
              }}
            >
              {t("Duplicate as draft")}
            </button>
          )}
          {initial && (
            <button
              type="button"
              onClick={() =>
                set("status", doc.status === "archived" ? "draft" : "archived")
              }
            >
              {t(
                doc.status === "archived"
                  ? "Restore as draft"
                  : "Archive on save",
              )}
            </button>
          )}
        </div>
        <p className="muted">
          {t(
            "Publishing requires confirmed price, inventory, complete translations and verified product information. Unconfirmed fields stay blank in drafts.",
          )}
        </p>
      </form>
      {preview && (
        <article className="preview" aria-label={t("Product preview")}>
          <p className="eyebrow">
            {t("PRIVATE PREVIEW ·")} {lang.toUpperCase()}
          </p>
          {doc.images[0] && <ImagePreview image={doc.images[0]} />}
          <h3>{translation?.name || doc.slug}</h3>
          <p>{translation?.short_description}</p>
          <p>{translation?.description}</p>
          <strong>
            {doc.price_rappen === null
              ? t("Price awaiting confirmation")
              : formatMoney(doc.promotion_rappen ?? doc.price_rappen, locale)}
          </strong>
          {doc.adult_only && <p>{t("18+ · Single cigar")}</p>}
          <p>{translation?.ingredients}</p>
          <p>{translation?.allergens}</p>
          <p>{translation?.preparation_instructions}</p>
          <p>{translation?.storage_instructions}</p>
        </article>
      )}
    </section>
  );
}
function ImagePreview({ image }: { image: ProductImage }) {
  const { t, locale } = useI18n();
  const [src, setSrc] = useState(image.legacy_path ?? "");
  useEffect(() => {
    let live = true;
    if (image.storage_path) {
      const load = () =>
        imageUrl(image.storage_path!)
          .then((url) => {
            if (live) setSrc(url);
          })
          .catch(() => {
            if (live) setSrc("");
          });
      void load();
      const timer = setInterval(() => void load(), 45000);
      return () => {
        live = false;
        clearInterval(timer);
      };
    }
  }, [image.storage_path]);
  return src ? (
    <img
      className="product-image"
      src={src}
      alt={image.alt[locale] || t("Product preview")}
    />
  ) : (
    <span>{t("Image preview unavailable")}</span>
  );
}
export function Inventory() {
  const { t, locale } = useI18n();
  const [notice, setNotice] = useState("");
  const [rows, setRows] = useState<Product[]>([]),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<Product | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [history, setHistory] = useState<
      {
        id: string;
        delta: number;
        new_quantity: number;
        reason: string;
        created_at: string;
      }[]
    >([]);
  useEffect(() => {
    products("", page)
      .then(setRows)
      .catch((e) => setError(message(e)));
  }, [page, version]);
  useEffect(() => {
    if (!selected) return;
    db()
      .from("v25_inventory_movements")
      .select("id,delta,new_quantity,reason,created_at")
      .eq("product_id", selected.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setHistory(data ?? []);
      });
  }, [selected, version]);
  return (
    <>
      <ErrorMessage error={error} />
      <div
        className="table-wrap"
        role="region"
        aria-label={t("Inventory")}
        tabIndex={0}
      >
        <table>
          <caption>{t("Stock inventory")}</caption>
          <thead>
            <tr>
              <th>{t("Product")}</th>
              <th>{t("Quantity")}</th>
              <th>{t("Low-stock threshold")}</th>
              <th>{t("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.sku || p.slug}</td>
                <td>
                  {p.inventory?.quantity ?? 0}
                  {!p.inventory?.confirmed && ` · ${t("Unconfirmed")}`}
                </td>
                <td>{p.inventory?.low_stock_threshold}</td>
                <td>
                  <button onClick={() => setSelected(p)}>
                    {t("Adjust")} {p.slug}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} next={rows.length === 50} change={setPage} />
      {selected && (
        <section className="panel" key={selected.id}>
          <h2>
            {t("Adjust")} {selected.slug}
          </h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                await rpc("v25_adjust_inventory", {
                  product: selected.id,
                  delta: Number(f.get("delta")),
                  reason: String(f.get("reason")),
                  threshold: Number(f.get("threshold")),
                });
                setVersion((v) => v + 1);
                setNotice("Inventory updated.");
              } catch (e) {
                setError(message(e));
              }
            }}
          >
            <div className="grid">
              <Field label="Quantity change (+ or −)">
                <input
                  name="delta"
                  type="number"
                  step="1"
                  defaultValue="0"
                  required
                />
              </Field>
              <Field label="Low-stock threshold">
                <input
                  name="threshold"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={selected.inventory?.low_stock_threshold ?? 5}
                  required
                />
              </Field>
              <Field label="Adjustment reason">
                <input name="reason" minLength={3} maxLength={500} required />
              </Field>
            </div>
            <button className="primary">{t("Record adjustment")}</button>
            <p>
              {t(
                "Use zero to confirm an opening quantity of zero. Negative stock is rejected.",
              )}
            </p>
          </form>
          <p role="status">{notice && t(notice)}</p>
          <h3>{t("Inventory history · latest 50")}</h3>
          {!history.length && <p>{t("No inventory movements yet.")}</p>}
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                {new Date(h.created_at).toLocaleString(`${locale}-CH`)} ·{" "}
                {h.delta > 0 ? "+" : ""}
                {h.delta} → {h.new_quantity} · {h.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
