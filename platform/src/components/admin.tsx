"use client";
import { useEffect, useState } from "react";
import { Field, usePlatform } from "./platform";
import { api, action, type AccountState, type DbRow } from "@/lib/client";
import { money } from "@/lib/domain";
import { stateName, type MessageKey } from "@/lib/messages";
import { Products, Inventory } from "@/legacy-admin/products";
import { I18nProvider } from "@/legacy-admin/i18n";
import EditorialAdmin from "./editorial-admin";
import { VerificationAdmin } from "./verification-admin";
import PolishAdmin from "./polish-admin";
import type { Role } from "@/legacy-admin/domain";
const screens = [
  "dashboard",
  "members",
  "verification",
  "products",
  "inventory",
  "orders",
  "payments",
  "reconciliation",
  "subscriptions",
  "benefits",
  "staff",
  "audit",
  "settings",
  "media",
] as const;
type Screen = (typeof screens)[number];
export default function Admin() {
  const { locale, tr, state, run, busy, notice, page } = usePlatform();
  const [screen, setScreen] = useState<Screen>(
      page === "admin/verification" ? "verification" : "dashboard",
    ),
    [data, setData] = useState<AccountState | null>(null),
    [search, setSearch] = useState(""),
    [pass, setPass] = useState<{ name: string; eligible: boolean } | null>(
      null,
    ),
    [token, setToken] = useState(""),
    [venue, setVenue] = useState("restaurant");
  const access =
    !!state &&
    (state.identity.admin || state.identity.staff || !!state.identity.role);
  async function refresh() {
    setData(await api<AccountState>("/api/state?admin=1"));
  }
  useEffect(() => {
    if (access) void refresh();
  }, [access]);
  async function mutate(name: string, doc: Record<string, unknown>) {
    await action(name, doc);
    await refresh();
    notice(tr("saved"));
  }
  if (!state)
    return (
      <section className="container section">
        <h1>{tr("admin")}</h1>
        <p>{tr("adminAccess")}</p>
        <a className="button" href={`/${locale}/login?next=admin`}>
          {tr("login")}
        </a>
      </section>
    );
  if (!access)
    return (
      <section className="container section">
        <h1>{tr("admin")}</h1>
        <p>{tr("denied")}</p>
      </section>
    );
  const rows = (name: string) => data?.rows[name] || [];
  const allowed = state.identity.admin
    ? screens
    : state.identity.role === "product_editor"
      ? (["products", "inventory"] as Screen[])
      : state.identity.role === "order_manager"
        ? (["orders"] as Screen[])
        : (["benefits"] as Screen[]);
  const current = allowed.includes(screen) ? screen : allowed[0];
  const table = (name: string, fields: string[]) =>
    !rows(name).length ? (
      <p>{tr("noRecords")}</p>
    ) : (
      <div
        className="table-wrap"
        role="region"
        aria-label={tr(current)}
        tabIndex={0}
      >
        <table>
          <caption>
            {tr(current)} · {rows(name).length}
          </caption>
          <thead>
            <tr>
              {fields.map((f) => (
                <th key={f}>
                  {tr(
                    (
                      {
                        created_at: "history",
                        member_id: "memberId",
                        entity: "audit",
                        event: "subscriptions",
                        action: "action",
                        role: "role",
                        status: "status",
                        state: "status",
                        id: "reference",
                        name: "name",
                        plan_id: "plan",
                        provider_reference: "reference",
                        expires_at: "expires",
                        amount_rappen: "amount",
                      } as Record<string, MessageKey>
                    )[f] || "reference",
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows(name)
              .filter(
                (r) =>
                  !search ||
                  JSON.stringify(r)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .map((r, i) => (
                <tr key={r.id || i}>
                  {fields.map((f) => (
                    <td key={f}>
                      {["status", "state", "event", "role", "plan_id"].includes(
                        f,
                      )
                        ? stateName(locale, String(r[f as keyof DbRow]))
                        : f.endsWith("_at") && r[f as keyof DbRow]
                          ? new Date(
                              String(r[f as keyof DbRow]),
                            ).toLocaleString(`${locale}-CH`, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : String(r[f as keyof DbRow] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <section className="admin-shell container">
      <aside className="admin-sidebar">
        <p className="eyebrow">VARATHANS25</p>
        <h1>{tr("admin")}</h1>
        <p className="muted">
          {stateName(locale, state.identity.role || "staff_member")}
        </p>
        <nav aria-label={tr("admin")}>
          {allowed.map((s) => (
            <button
              key={s}
              aria-current={current === s ? "page" : undefined}
              onClick={() => {
                setScreen(s);
                setSearch("");
              }}
            >
              {tr(s)}
            </button>
          ))}
        </nav>
      </aside>
      <div className="admin-content">
        <div className="section-heading">
          <h2>{tr(current)}</h2>
          <a href={`/${locale}/account`}>{tr("account")}</a>
        </div>
        <p className="system-warning">{tr("reviewFlags")}</p>
        <I18nProvider initialLocale={locale}>
          {current === "media" ? (
            <EditorialAdmin />
          ) : current === "products" ? (
            <Products role={state.identity.role as Role} />
          ) : current === "inventory" ? (
            <Inventory />
          ) : current === "dashboard" ? (
            <>
              <div className="metrics">
                {[
                  [
                    "activeMembers",
                    rows("members").filter((r) => r.state === "active").length,
                  ],
                  [
                    "pendingPayments",
                    rows("payments").filter(
                      (r) => r.state === "awaiting_payment",
                    ).length,
                  ],
                  ["orders", rows("orders").length],
                  ["auditEntries", rows("audit_events").length],
                ].map(([label, value]) => (
                  <article key={label} className="panel">
                    <p>{tr(label as MessageKey)}</p>
                    <strong>{value}</strong>
                  </article>
                ))}
              </div>
              <div className="panel">
                <h3>{tr("testRevenue")}</h3>
                <p>
                  {money(
                    rows("payments")
                      .filter((p) => ["paid", "matched"].includes(p.state))
                      .reduce((n, p) => n + p.amount_rappen, 0),
                    locale,
                  )}
                </p>
                <p>{tr("noLiveRevenue")}</p>
              </div>
              <h3>{tr("history")}</h3>
              {table("membership_events", ["created_at", "event"])}
            </>
          ) : current === "verification" ? (
            <VerificationAdmin />
          ) : current === "members" ? (
            <>
              <Field label={tr("search")}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Field>
              {rows("members")
                .filter((m) =>
                  m.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((m) => {
                  const v = rows("member_verifications").find(
                      (v) => v.member_id === m.id,
                    ),
                    plan = rows("memberships").find(
                      (v) => v.member_id === m.id,
                    );
                  return (
                    <article className="panel record" key={m.id}>
                      <div>
                        <h3>{m.name}</h3>
                        <p>{m.id}</p>
                        <p>
                          {stateName(locale, m.state)} ·{" "}
                          {stateName(locale, plan?.plan_id || "silver")} ·{" "}
                          {stateName(locale, v?.status || "pending")}
                        </p>
                        <small>
                          {v?.expires_at &&
                            new Date(v.expires_at).toLocaleString(
                              `${locale}-CH`,
                            )}
                        </small>
                      </div>
                      <div className="actions">
                        <button
                          disabled={busy || m.id === state.user.id}
                          onClick={() =>
                            void run(() =>
                              mutate("member_state", {
                                id: m.id,
                                state:
                                  m.state === "active" ? "suspended" : "active",
                              }),
                            )
                          }
                        >
                          {tr(m.state === "active" ? "suspend" : "restore")}
                        </button>
                        <a href={`/${locale}/admin/verification`}>
                          {tr("verification")}
                        </a>
                      </div>
                    </article>
                  );
                })}
            </>
          ) : current === "orders" ? (
            <>
              {rows("orders").map((o) => (
                <article className="panel" key={o.id}>
                  <h3>
                    #{o.number} · {money(o.total_rappen, locale)}
                  </h3>
                  <p>{stateName(locale, o.status)}</p>
                  <details>
                    <summary>
                      {tr("items")} · {tr("deliveryAddress")}
                    </summary>
                    <ul>
                      {rows("order_items")
                        .filter((item) => item.order_id === o.id)
                        .map((item) => (
                          <li key={item.id}>
                            {item.quantity} × {item.name} ·{" "}
                            {money(item.unit_rappen, locale)}
                          </li>
                        ))}
                    </ul>
                    <address>
                      {o.address_snapshot?.name}
                      <br />
                      {o.address_snapshot?.street}{" "}
                      {o.address_snapshot?.house_number}
                      <br />
                      {o.address_snapshot?.postal_code}{" "}
                      {o.address_snapshot?.city}
                    </address>
                  </details>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void run(() =>
                        mutate("order_status", {
                          id: o.id,
                          ...Object.fromEntries(f),
                        }),
                      );
                    }}
                  >
                    <div className="grid">
                      <Field label={tr("status")}>
                        <select name="status" defaultValue={o.status}>
                          {[
                            "pending",
                            "paid",
                            "preparing",
                            "dispatched",
                            "completed",
                            "cancelled",
                          ].map((s) => (
                            <option key={s} value={s}>
                              {stateName(locale, s)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label={tr("tracking")}>
                        <input
                          name="tracking"
                          defaultValue={o.tracking_number}
                          maxLength={250}
                        />
                      </Field>
                      <Field label={tr("notes")}>
                        <input
                          name="notes"
                          defaultValue={o.fulfillment_notes}
                          maxLength={5000}
                        />
                      </Field>
                    </div>
                    <button disabled={busy}>{tr("updateOrder")}</button>
                  </form>
                </article>
              ))}
              {!rows("orders").length && <p>{tr("noRecords")}</p>}
            </>
          ) : current === "payments" || current === "reconciliation" ? (
            <>
              {current === "reconciliation" && (
                <form
                  className="panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const file = f.get("csv") as File;
                    void run(async () => {
                      await api("/api/admin/reconciliation", {
                        csv: await file.text(),
                      });
                      await refresh();
                      notice(tr("saved"));
                    });
                  }}
                >
                  <Field label={tr("importBank")}>
                    <input
                      type="file"
                      name="csv"
                      accept=".csv,text/csv"
                      required
                    />
                  </Field>
                  <p className="muted">{tr("bankFormat")}</p>
                  <button disabled={busy}>{tr("importBank")}</button>
                </form>
              )}
              {rows("payments").map((p) => (
                <article className="panel" key={p.id}>
                  <h3>{p.reference}</h3>
                  <p>
                    {money(p.amount_rappen, locale)} ·{" "}
                    {stateName(locale, p.state)}
                  </p>
                  <a href={`/api/payment?id=${p.id}`}>{tr("downloadBill")}</a>
                  {["awaiting_payment", "processing"].includes(p.state) && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void run(() =>
                          mutate("reconcile", {
                            payment_id: p.id,
                            state: "matched",
                            amount_rappen: p.amount_rappen,
                            event_id: crypto.randomUUID(),
                            reason: f.get("reason"),
                          }),
                        );
                      }}
                    >
                      <Field label={tr("reason")}>
                        <input
                          name="reason"
                          required
                          minLength={3}
                          maxLength={500}
                        />
                      </Field>
                      <button className="button" disabled={busy}>
                        {tr("match")}
                      </button>
                    </form>
                  )}
                </article>
              ))}
              {!rows("payments").length && <p>{tr("noRecords")}</p>}
            </>
          ) : current === "subscriptions" ? (
            table("membership_events", ["created_at", "event", "member_id"])
          ) : current === "audit" ? (
            <>
              <Field label={tr("search")}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Field>
              {table("audit_events", [
                "created_at",
                "action",
                "entity",
                "entity_id",
              ])}
            </>
          ) : current === "staff" ? (
            <>
              {table("staff_roles", ["member_id", "role"])}
              <p>{tr("ownerMfa")}</p>
              {state.identity.role === "owner" && (
                <form
                  className="panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(() =>
                      mutate("staff", {
                        id: f.get("id"),
                        role: f.get("role"),
                        enabled: f.get("enabled") === "on",
                      }),
                    );
                  }}
                >
                  <Field label={tr("memberId")}>
                    <input name="id" required pattern="[a-f0-9-]{36}" />
                  </Field>
                  <Field label={tr("role")}>
                    <select name="role">
                      <option value="staff">{tr("staff_member")}</option>
                      <option value="manager">{tr("manager")}</option>
                    </select>
                  </Field>
                  <label className="check">
                    <input type="checkbox" name="enabled" defaultChecked />
                    {tr("enabled")}
                  </label>
                  <button>{tr("saveStaff")}</button>
                </form>
              )}
            </>
          ) : current === "benefits" ? (
            <>
              <form
                className="panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    setPass(
                      await api("/api/pass", {
                        action: "pass_check",
                        token,
                        venue,
                        key: crypto.randomUUID(),
                      }),
                    );
                  });
                }}
              >
                <Field label={tr("token")}>
                  <input
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      setPass(null);
                    }}
                    required
                    maxLength={100}
                    autoComplete="off"
                  />
                </Field>
                <Field label={tr("venue")}>
                  <select
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                  >
                    <option value="restaurant">Varathans25 Restaurant</option>
                    <option value="lounge">Varathans25 Lounge</option>
                  </select>
                </Field>
                <button disabled={busy}>{tr("checkPass")}</button>
              </form>
              {pass && (
                <form
                  className="panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await api("/api/pass", {
                        action: "redeem",
                        token,
                        venue,
                        identity_confirmed: true,
                        key: crypto.randomUUID(),
                      });
                      setPass({ ...pass, eligible: false });
                      notice(tr("redeemed"));
                      await refresh();
                    });
                  }}
                >
                  <h3>{pass.name} · GOLD</h3>
                  <p>{tr(pass.eligible ? "eligible" : "notEligible")}</p>
                  <label className="check">
                    <input type="checkbox" required />
                    {tr("identityConfirm")}
                  </label>
                  <button className="button" disabled={!pass.eligible || busy}>
                    {tr("redeem")}
                  </button>
                </form>
              )}
              {table("benefit_redemptions", ["created_at", "member_id"])}
            </>
          ) : current === "settings" ? (
            <>
              <h3>{tr("membership")}</h3>
              {rows("membership_plans").map((p) => (
                <form
                  key={p.id}
                  className="panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(() =>
                      mutate("plan_settings", {
                        id: p.id,
                        revision: p.revision,
                        fee_rappen: Number(f.get("fee")),
                        discount_bps: Number(f.get("discount")),
                      }),
                    );
                  }}
                >
                  <h3>{stateName(locale, p.id)}</h3>
                  <div className="grid">
                    <Field label={tr("fee")}>
                      <input
                        name="fee"
                        type="number"
                        min="0"
                        max="1000000"
                        step="1"
                        defaultValue={p.fee_rappen}
                        required
                        readOnly={p.id === "silver"}
                      />
                    </Field>
                    <Field label={tr("discountBps")}>
                      <input
                        name="discount"
                        type="number"
                        min="0"
                        max="10000"
                        step="1"
                        defaultValue={p.discount_bps}
                        required
                        readOnly={p.id === "silver"}
                      />
                    </Field>
                  </div>
                  <button disabled={busy}>{tr("save")}</button>
                </form>
              ))}
              <form
                className="panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run(() =>
                    mutate("delivery_settings", {
                      standard_rappen: Number(f.get("price")),
                      threshold_rappen: Number(f.get("threshold")),
                      revision: rows("delivery_methods")[0]?.revision,
                    }),
                  );
                }}
              >
                <h3>{tr("shipping")}</h3>
                <Field label={tr("amount")}>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    max="100000"
                    step="1"
                    defaultValue={
                      rows("delivery_methods")[0]?.standard_rappen || 1000
                    }
                    required
                  />
                </Field>
                <Field
                  label={
                    {
                      de: "Versandfreigrenze (Rappen)",
                      fr: "Seuil de livraison offerte (centimes)",
                      en: "Free delivery threshold (rappen)",
                    }[locale]
                  }
                >
                  <input
                    name="threshold"
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    required
                    defaultValue={
                      rows("delivery_methods")[0]?.threshold_rappen ?? 10000
                    }
                  />
                </Field>
                <button>{tr("save")}</button>
              </form>
              <form
                className="panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run(() =>
                    mutate("benefit_settings", {
                      minutes: Number(f.get("minutes")),
                      enabled: f.get("enabled") === "on",
                    }),
                  );
                }}
              >
                <h3>{tr("visitPolicy")}</h3>
                <Field label={tr("minutes")}>
                  <input
                    name="minutes"
                    type="number"
                    min="30"
                    max="1440"
                    step="1"
                    defaultValue={
                      rows("benefit_definitions")[0]
                        ?.minimum_visit_gap_minutes || 120
                    }
                    required
                  />
                </Field>
                <label className="check">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={rows("benefit_definitions")[0]?.enabled}
                  />
                  {tr("enabled")}
                </label>
                <button>{tr("save")}</button>
              </form>
              <PolishAdmin />
              <h3>{tr("productEligibility")}</h3>
              {rows("product_presentations").map((p) => (
                <label className="check" key={p.product_id}>
                  <input
                    type="checkbox"
                    checked={p.gold_eligible}
                    onChange={(e) =>
                      void run(() =>
                        mutate("eligibility", {
                          id: p.product_id,
                          gold_eligible: e.target.checked,
                        }),
                      )
                    }
                  />
                  {p.product_id}
                </label>
              ))}
            </>
          ) : null}
        </I18nProvider>
      </div>
    </section>
  );
}
