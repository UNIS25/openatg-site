import { useI18n } from "./i18n";
import { useEffect, useState } from "react";
import { orders, db, rpc, updateOrder } from "./api";
import {
  orderStatuses,
  formatMoney,
  orderCsv,
  type Order,
  type OrderStatus,
} from "./domain";
import { Field, ErrorMessage, message, useConfirmation } from "./ui";
import { Pagination } from "./products";
type Detail = {
  customer: { name: string; email: string };
  address: {
    line1: string;
    line2: string;
    postal_code: string;
    city: string;
    country: string;
  };
  items: {
    id: string;
    name: string;
    quantity: number;
    unit_rappen: number;
    composition: { position: number; name: string; unit_rappen: number }[];
  }[];
};
export function Orders() {
  const { t, locale } = useI18n();
  const { confirm, dialog } = useConfirmation();
  const [rows, setRows] = useState<Order[]>([]),
    [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Order | null>(null),
    [detail, setDetail] = useState<Detail | null>(null),
    [version, setVersion] = useState(0),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let live = true;
    orders(status, search, page)
      .then((data) => {
        if (live) setRows(data);
      })
      .catch((e) => {
        if (live) setError(message(e));
      });
    return () => {
      live = false;
    };
  }, [status, search, page, version]);
  async function show(order: Order) {
    setError("");
    setDetail(null);
    setSelected(order);
    try {
      const results = await Promise.all([
        db()
          .from("v25_customers")
          .select("name,email")
          .eq("id", order.customer_id)
          .single(),
        db()
          .from("v25_addresses")
          .select("line1,line2,postal_code,city,country")
          .eq("id", order.address_id)
          .single(),
        db()
          .from("v25_order_items")
          .select(
            "id,name,quantity,unit_rappen,composition:v25_cigar_bundle_items(position,name,unit_rappen)",
          )
          .eq("order_id", order.id),
      ]);
      for (const r of results) if (r.error) throw r.error;
      setDetail({
        customer: results[0].data,
        address: results[1].data,
        items: results[2].data,
      } as unknown as Detail);
    } catch (e) {
      setError(message(e));
    }
  }
  async function download() {
    try {
      await rpc("v25_record_export", { order_ids: rows.map((o) => o.id) });
      const url = URL.createObjectURL(
        new Blob(
          [
            orderCsv(rows, [
              t("Order"),
              t("Date"),
              t("Status"),
              t("Total CHF"),
              t("Refund"),
            ]),
          ],
          { type: "text/csv;charset=utf-8" },
        ),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "varathans25-orders.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <>
      {dialog}
      <div className="toolbar">
        <Field label="Search order number or ID">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </Field>
        <Field label="Order status">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">{t("All states")}</option>
            {orderStatuses.map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </Field>
        <button disabled={!rows.length} onClick={() => void download()}>
          {t("Export this page to CSV")}
        </button>
      </div>
      <p className="muted">
        {t(
          "Customer details are opened only when needed. CSV includes order totals and status, without contact details.",
        )}
      </p>
      <ErrorMessage error={error} />
      <p role="status">{notice && t(notice)}</p>
      <div
        className="table-wrap"
        role="region"
        aria-label={t("Orders")}
        tabIndex={0}
      >
        <table>
          <caption>{t("Orders")}</caption>
          <thead>
            <tr>
              <th>{t("Order")}</th>
              <th>{t("Date")}</th>
              <th>{t("Status")}</th>
              <th>{t("Total")}</th>
              <th>{t("Refund")}</th>
              <th>{t("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>#{o.number}</td>
                <td>
                  {new Date(o.created_at).toLocaleDateString(`${locale}-CH`)}
                </td>
                <td>{t(o.status)}</td>
                <td>{formatMoney(o.total_rappen, locale)}</td>
                <td>{t(o.refund_status)}</td>
                <td>
                  <button onClick={() => void show(o)}>
                    {t("View order")} {o.number}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p>{t("No matching orders.")}</p>}
      <Pagination page={page} next={rows.length === 50} change={setPage} />
      {selected && (
        <section className="panel" key={`${selected.id}-${selected.revision}`}>
          <div className="toolbar">
            <h2>
              {t("Order #")}
              {selected.number}
            </h2>
            <button
              onClick={() => {
                setSelected(null);
                setDetail(null);
              }}
            >
              {t("Close order")}
            </button>
          </div>
          {detail ? (
            <>
              <div className="grid">
                <div>
                  <h3>{t("Customer")}</h3>
                  <p>
                    {detail.customer.name}
                    <br />
                    {detail.customer.email}
                  </p>
                </div>
                <div>
                  <h3>{t("Delivery address")}</h3>
                  <p>
                    {detail.address.line1}
                    <br />
                    {detail.address.line2}
                    <br />
                    {detail.address.postal_code} {detail.address.city}
                    <br />
                    {detail.address.country}
                  </p>
                </div>
              </div>
              <h3>{t("Items and cigar composition")}</h3>
              <ul>
                {detail.items.map((i) => (
                  <li key={i.id}>
                    {i.quantity} × {i.name} ·{" "}
                    {formatMoney(i.unit_rappen, locale)}
                    {i.composition.length > 0 && (
                      <ul>
                        {i.composition
                          .sort((a, b) => a.position - b.position)
                          .map((c) => (
                            <li key={c.position}>
                              {c.position + 1}. {c.name} ·{" "}
                              {formatMoney(c.unit_rappen, locale)}
                            </li>
                          ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <dl className="totals">
                {(
                  [
                    ["Merchandise", selected.subtotal_rappen],
                    ["Discount", -selected.discount_rappen],
                    ["Standard delivery", selected.delivery_rappen],
                    ["Adult delivery", selected.adult_delivery_rappen],
                    ["Included VAT", selected.tax_rappen],
                    ["Total", selected.total_rappen],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt>{t(label)}</dt>
                    <dd>{formatMoney(value, locale)}</dd>
                  </div>
                ))}
              </dl>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (
                    f.get("status") === "cancelled" &&
                    selected.status !== "cancelled" &&
                    !(await confirm("Confirm order cancellation?"))
                  )
                    return;
                  if (
                    f.get("refund") === "on" &&
                    !(await confirm("Confirm refund review request?"))
                  )
                    return;
                  setError("");
                  try {
                    await updateOrder(
                      selected.id,
                      String(f.get("status")) as OrderStatus,
                      String(f.get("notes")),
                      String(f.get("tracking")),
                      selected.revision,
                      f.get("refund") === "on",
                    );
                    setSelected(null);
                    setDetail(null);
                    setVersion((v) => v + 1);
                    setNotice("Order updated.");
                  } catch (e) {
                    setError(message(e));
                  }
                }}
              >
                <Field label="New order status">
                  <select name="status" defaultValue={selected.status}>
                    {orderStatuses.map((s) => (
                      <option
                        key={s}
                        value={s}
                        disabled={
                          ["paid", "refunded"].includes(s) &&
                          s !== selected.status
                        }
                      >
                        {t(s)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fulfilment notes">
                  <textarea
                    name="notes"
                    maxLength={5000}
                    defaultValue={selected.fulfillment_notes}
                  />
                </Field>
                <Field label="Tracking number">
                  <input
                    name="tracking"
                    maxLength={250}
                    defaultValue={selected.tracking_number}
                  />
                </Field>
                <label className="check">
                  <input type="checkbox" name="refund" />
                  {t("Request refund review")}
                </label>
                <p>
                  {t(
                    "Paid and refunded states require verified provider confirmation. Cancellation returns reserved stock once.",
                  )}
                </p>
                <button className="primary">{t("Save order update")}</button>
              </form>
            </>
          ) : (
            <p>{t("Loading order details…")}</p>
          )}
        </section>
      )}
    </>
  );
}
