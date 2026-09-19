import { useEffect, useState } from "react";
import { db, rpc, settings } from "./api";
import { type Settings, type Role } from "./domain";
import { MoneyField, Pagination } from "./products";
import { ErrorMessage, Field, message } from "./ui";
export function StoreSettings({ role }: { role: Role }) {
  const [data, setData] = useState<Settings | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    settings()
      .then(setData)
      .catch((e) => setError(message(e)));
  }, []);
  if (!data)
    return (
      <>
        <ErrorMessage error={error} />
        <p>Loading settings…</p>
      </>
    );
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setData({ ...data, [key]: value });
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setNotice("");
        try {
          await rpc("v25_save_settings", {
            document: data,
            expected_revision: data.revision,
          });
          setData(await settings());
          setNotice("Settings saved.");
        } catch (e) {
          setError(message(e));
        }
      }}
    >
      <h2>Delivery</h2>
      <p>
        Standard delivery is free from CHF 100.00 after discounts. The
        adult-delivery surcharge remains separate.
      </p>
      <div className="grid">
        <MoneyField
          label="Standard delivery CHF"
          value={data.standard_delivery_rappen}
          onChange={(n) => set("standard_delivery_rappen", n)}
        />
        <Field label="Free standard delivery threshold CHF">
          <input readOnly value="100.00" />
        </Field>
        <MoneyField
          label="Adult-delivery surcharge CHF"
          value={data.adult_delivery_rappen}
          onChange={(n) => set("adult_delivery_rappen", n)}
        />
      </div>
      <p className="muted">
        Leave unconfirmed delivery charges blank. Zero means an explicitly
        confirmed free charge.
      </p>
      <h2>Tax / VAT</h2>
      <label className="check">
        <input
          type="checkbox"
          checked={data.tax_configuration_confirmed}
          onChange={(e) => set("tax_configuration_confirmed", e.target.checked)}
        />
        Tax configuration verified
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={data.vat_registered}
          onChange={(e) => set("vat_registered", e.target.checked)}
        />
        VAT registered
      </label>
      <div className="grid">
        <Field label="VAT number">
          <input
            value={data.vat_number}
            onChange={(e) => set("vat_number", e.target.value)}
          />
        </Field>
        <Field label="VAT basis points (100 = 1%)">
          <input
            type="number"
            min="0"
            max="10000"
            step="1"
            value={data.vat_bps ?? ""}
            onChange={(e) =>
              set(
                "vat_bps",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>
      </div>
      <p>
        Entered prices include VAT. Confirm the correct tax configuration before
        opening checkout.
      </p>
      <h2>Contact</h2>
      <div className="grid">
        {(
          [
            "contact_name",
            "contact_address",
            "contact_phone",
            "support_email",
          ] as const
        ).map((k) => (
          <Field key={k} label={k.replaceAll("_", " ")}>
            <input
              type={k === "support_email" ? "email" : "text"}
              value={data[k]}
              onChange={(e) => set(k, e.target.value)}
            />
          </Field>
        ))}
      </div>
      <h2>Availability and promotions</h2>
      {(["store_available", "maintenance_mode"] as const).map((k) => (
        <label className="check" key={k}>
          <input
            type="checkbox"
            checked={data[k]}
            onChange={(e) => set(k, e.target.checked)}
          />
          {k.replaceAll("_", " ")}
        </label>
      ))}
      <Field label="Cigar box discount basis points (0 = no discount)">
        <input
          type="number"
          step="1"
          min="0"
          max="10000"
          value={data.bundle_discount_bps}
          onChange={(e) => set("bundle_discount_bps", Number(e.target.value))}
        />
      </Field>
      <fieldset disabled={role !== "owner"}>
        <legend>Owner controls · MFA required</legend>
        <p>
          Activation requires documented approval and a deployed provider
          adapter. Flags alone cannot start payments.
        </p>
        {(["payment_enabled", "tobacco_checkout_enabled"] as const).map((k) => (
          <label className="check" key={k}>
            <input
              type="checkbox"
              checked={data[k]}
              onChange={(e) => set(k, e.target.checked)}
            />
            {k.replaceAll("_", " ")}
          </label>
        ))}
        {(
          [
            "payment_provider_reference",
            "legal_review_reference",
            "age_verification_reference",
            "adult_delivery_reference",
          ] as const
        ).map((k) => (
          <Field key={k} label={k.replaceAll("_", " ")}>
            <input value={data[k]} onChange={(e) => set(k, e.target.value)} />
          </Field>
        ))}
      </fieldset>
      <ErrorMessage error={error} />
      <p role="status">{notice}</p>
      <button className="primary">Save settings</button>
    </form>
  );
}
export function Audit() {
  const [rows, setRows] = useState<
      {
        id: number;
        created_at: string;
        actor: string | null;
        action: string;
        entity: string;
        entity_id: string;
        detail: Record<string, unknown>;
      }[]
    >([]),
    [page, setPage] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    db()
      .from("v25_audit_events")
      .select("*")
      .order("id", { ascending: false })
      .range(page * 50, page * 50 + 49)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data ?? []);
      });
  }, [page]);
  return (
    <>
      <p>
        Append-only records. Customer contact information and session secrets
        are excluded.
      </p>
      <ErrorMessage error={error} />
      <div className="table-wrap">
        <table>
          <caption>Audit records</caption>
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.actor ?? "Server operation"}</td>
                <td>{r.action}</td>
                <td>
                  {r.entity}
                  <small>{r.entity_id}</small>
                </td>
                <td>
                  <code>{JSON.stringify(r.detail)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} next={rows.length === 50} change={setPage} />
    </>
  );
}
export function Access() {
  const [profiles, setProfiles] = useState<
      { id: string; role: Role; enabled: boolean }[]
    >([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    db()
      .from("v25_profiles")
      .select("id,role,enabled")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setProfiles(data ?? []);
      });
  }, [version]);
  return (
    <>
      <section className="panel">
        <h2>Invite an administrator</h2>
        <p>
          Invitation emails are sent through the configured authentication
          service.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setNotice("");
            const f = new FormData(e.currentTarget);
            const { data, error } = await db().functions.invoke(
              "invite-admin",
              {
                body: {
                  email: String(f.get("email")),
                  role: String(f.get("role")),
                },
              },
            );
            if (error || !data?.invited)
              setError(error?.message ?? "Invitation failed.");
            else {
              setNotice("Invitation sent.");
              setVersion((v) => v + 1);
            }
          }}
        >
          <div className="grid">
            <Field label="Administrator email">
              <input name="email" type="email" required />
            </Field>
            <Field label="Administrator role">
              <select name="role" defaultValue="product_editor">
                {(
                  [
                    "owner",
                    "administrator",
                    "product_editor",
                    "order_manager",
                  ] as const
                ).map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>
          <button className="primary">Send invitation</button>
        </form>
      </section>
      <ErrorMessage error={error} />
      <p role="status">{notice}</p>
      <section className="panel">
        <h2>Administrator access</h2>
        {profiles.map((p) => (
          <form
            key={p.id}
            className="toolbar"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await rpc("v25_change_access", {
                  profile_id: p.id,
                  new_role: String(f.get("role")),
                  is_enabled: f.get("enabled") === "on",
                });
                setVersion((v) => v + 1);
              } catch (e) {
                setError(message(e));
              }
            }}
          >
            <code>{p.id}</code>
            <Field label={`Role for ${p.id}`}>
              <select name="role" defaultValue={p.role}>
                {[
                  "owner",
                  "administrator",
                  "product_editor",
                  "order_manager",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <label className="check">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={p.enabled}
              />
              Enabled
            </label>
            <button>Save access</button>
          </form>
        ))}
      </section>
    </>
  );
}
