import { useI18n, LanguageSelector, errorKey } from "./i18n";
import {
  useEffect,
  useState,
  useId,
  useRef,
  cloneElement,
  isValidElement,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { client, configured, db, rpc, invitationCallback } from "./api";
import type { Role } from "./domain";
import { formatMoney } from "./domain";
import { Products, Inventory } from "./products";
import { Customers } from "./customers";
import { Orders } from "./orders";
import { StoreSettings, Audit, Access } from "./settings";
export function Field({
  label,
  children,
  incomplete = false,
}: {
  label: string;
  children: ReactNode;
  incomplete?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{t(label)}</label>
      {isValidElement<{ id?: string; "aria-describedby"?: string }>(children)
        ? cloneElement(children, {
            id,
            ...(incomplete ? { "aria-describedby": `${id}-incomplete` } : {}),
          })
        : children}
      {incomplete && (
        <small className="incomplete" id={`${id}-incomplete`}>
          {t("Incomplete — verified content required")}
        </small>
      )}
    </div>
  );
}
export function ErrorMessage({ error }: { error: string }) {
  const { t } = useI18n();
  return error ? (
    <p className="error" role="alert">
      {t(errorKey(error))}
    </p>
  ) : null;
}
export function message(error: unknown) {
  return errorKey(error);
}
function Brand() {
  const { t } = useI18n();
  return (
    <div className="brand">
      <img
        src="/varathans25/brand/varathans25-original.png"
        alt="Varathans25"
      />
      <div>
        <strong>VARATHANS25</strong>
        <span>{t("Store administration · Sursee")}</span>
      </div>
    </div>
  );
}
export function App() {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null),
    [role, setRole] = useState<Role | null>(null),
    [aal, setAal] = useState(""),
    [error, setError] = useState(""),
    [view, setView] = useState("Dashboard"),
    [invite, setInvite] = useState(invitationCallback),
    [version, setVersion] = useState(0);
  useEffect(() => {
    if (!client) return;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (_event === "PASSWORD_RECOVERY") setInvite(true);
      if (!s) {
        setRole(null);
        setView("Dashboard");
        setError("");
        setAal("");
      }
    });
    client.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let live = true;
    if (!session) {
      return;
    }
    Promise.all([
      db()
        .from("v25_profiles")
        .select("role,enabled")
        .eq("id", session.user.id)
        .single(),
      db().auth.mfa.getAuthenticatorAssuranceLevel(),
    ])
      .then(([profile, assurance]) => {
        if (!live) return;
        if (profile.error || !profile.data?.enabled) {
          setError(
            "This account does not have an active administrator invitation.",
          );
          setRole(null);
          return;
        }
        setRole(profile.data.role as Role);
        setAal(assurance.data?.currentLevel ?? "aal1");
        setError("");
      })
      .catch((e) => setError(message(e)));
    return () => {
      live = false;
    };
  }, [session, version]);
  // Close unattended consoles. Backend session expiry and live session checks remain authoritative.
  useEffect(() => {
    if (!session) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void db().auth.signOut(), 15 * 60 * 1000);
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [session]);
  const ready = !!role && (role !== "owner" || aal === "aal2") && !invite;
  const productRole =
      role && ["owner", "administrator", "product_editor"].includes(role),
    orderRole =
      role && ["owner", "administrator", "order_manager"].includes(role),
    adminRole = role && ["owner", "administrator"].includes(role);
  const tabs = [
    "Dashboard",
    ...(productRole ? ["Products", "Inventory"] : []),
    ...(orderRole ? ["Orders", "Customers"] : []),
    ...(adminRole
      ? [
          "Delivery settings",
          "Discounts",
          "Cigar-box configuration",
          "Settings",
          "Audit",
        ]
      : []),
    ...(role === "owner" ? ["Access"] : []),
  ];
  return (
    <>
      <a className="skip" href="#main">
        {t("Skip to content")}
      </a>
      <header>
        <Brand />
        <div className="header-actions">
          <LanguageSelector />
          {session && (
            <button onClick={() => void db().auth.signOut()}>
              {t("Sign out")}
            </button>
          )}
        </div>
      </header>
      {ready && (
        <nav aria-label={t("Administration")}>
          {tabs.map((tab) => (
            <button
              aria-current={view === tab ? "page" : undefined}
              key={tab}
              onClick={() => setView(tab)}
            >
              {t(tab)}
            </button>
          ))}
        </nav>
      )}
      <main id="main" className={!ready ? "login" : "workspace"}>
        <ErrorMessage error={error} />
        {!configured ? (
          <section className="panel">
            <h1>{t("Administration")}</h1>
            <p>{t("The secured backend has not been connected yet.")}</p>
            <p>
              {t(
                "Administrator access will be available after backend deployment and invitation.",
              )}
            </p>
          </section>
        ) : !session ? (
          <Login />
        ) : invite ? (
          <SetPassword
            done={() => {
              setInvite(false);
              history.replaceState(null, "", "/adminpage/");
            }}
          />
        ) : !role ? (
          <p role="status">{t("Checking administrator access…")}</p>
        ) : role === "owner" && aal !== "aal2" ? (
          <Mfa done={() => setVersion((v) => v + 1)} />
        ) : ready ? (
          <>
            <div className="heading">
              <div>
                <p className="eyebrow">VARATHANS25 / {t(role)}</p>
                <h1>{t(view)}</h1>
              </div>
              <span className="badge">{t("Secure administration")}</span>
            </div>
            {view === "Dashboard" ? (
              <Dashboard />
            ) : view === "Products" ? (
              <Products role={role} />
            ) : view === "Inventory" ? (
              <Inventory />
            ) : view === "Orders" ? (
              <Orders />
            ) : view === "Customers" ? (
              <Customers />
            ) : [
                "Settings",
                "Delivery settings",
                "Discounts",
                "Cigar-box configuration",
              ].includes(view) ? (
              <StoreSettings key={view} role={role} section={view} />
            ) : view === "Audit" ? (
              <Audit />
            ) : (
              <Access />
            )}
          </>
        ) : null}
      </main>
      <footer>{t("Varathans25 · Swiss store operations · CHF")}</footer>
    </>
  );
}
function Login() {
  const { t } = useI18n();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const { error } = await db().auth.signInWithPassword({
        email: String(f.get("email")),
        password: String(f.get("password")),
      });
      if (error)
        throw new Error(
          "Sign-in failed. Check your invitation and credentials.",
        );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <p className="eyebrow">{t("PRIVATE ACCESS")}</p>
      <h1>{t("Welcome back")}</h1>
      <p>{t("Sign in with your invited administrator account.")}</p>
      <form onSubmit={submit}>
        <Field label="Email">
          <input name="email" type="email" autoComplete="username" required />
        </Field>
        <Field label="Password">
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <ErrorMessage error={error} />
        <button className="primary" disabled={busy}>
          {t(busy ? "Signing in…" : "Sign in")}
        </button>
      </form>
      <p className="muted">
        {t(
          "Access is invitation only. Owners verify their identity with an authenticator app.",
        )}
      </p>
    </section>
  );
}
function SetPassword({ done }: { done: () => void }) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  return (
    <section className="panel">
      <h1>{t("Set your password")}</h1>
      <p>
        {t(
          "Use at least 14 characters with upper and lower case letters, a number and a symbol.",
        )}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const password = String(
            new FormData(e.currentTarget).get("password"),
          );
          const { error } = await db().auth.updateUser({ password });
          if (error) setError(error.message);
          else done();
        }}
      >
        <Field label="New password">
          <input
            name="password"
            type="password"
            minLength={14}
            autoComplete="new-password"
            required
          />
        </Field>
        <ErrorMessage error={error} />
        <button className="primary">{t("Save password")}</button>
      </form>
    </section>
  );
}
function Mfa({ done }: { done: () => void }) {
  const { t } = useI18n();
  const [factor, setFactor] = useState(""),
    [qr, setQr] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    db()
      .auth.mfa.listFactors()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setError(error.message);
        else
          setFactor(data?.totp.find((f) => f.status === "verified")?.id ?? "");
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  async function enroll() {
    setError("");
    const { data, error } = await db().auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Varathans25 ${new Date().toISOString()}`,
    });
    if (error) setError(error.message);
    else {
      setFactor(data.id);
      setQr(data.totp.qr_code);
    }
  }
  return (
    <section className="panel">
      <h1>{t("Owner verification")}</h1>
      <p>
        {t("An authenticator code is required before owner access is granted.")}
      </p>
      {loading ? (
        <p>{t("Loading…")}</p>
      ) : !factor ? (
        <button onClick={() => void enroll()}>
          {t("Set up authenticator")}
        </button>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const code = String(new FormData(e.currentTarget).get("code"));
            const { error } = await db().auth.mfa.challengeAndVerify({
              factorId: factor,
              code,
            });
            if (error) setError(error.message);
            else done();
          }}
        >
          {qr && (
            <img
              className="qr"
              src={qr}
              alt={t("Scan this QR code with your authenticator app")}
            />
          )}
          <Field label="Authenticator code">
            <input
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
          </Field>
          <button className="primary">{t("Verify")}</button>
        </form>
      )}
      <ErrorMessage error={error} />
    </section>
  );
}
type DashboardData = {
  active?: number;
  draft?: number;
  low_stock?: number;
  incomplete_translations?: number;
  orders?: number;
  pending_fulfillment?: number;
  revenue_rappen?: number;
  warnings: Record<string, boolean>;
  recent_orders?: {
    id: string;
    number: number;
    status: string;
    total_rappen: number;
  }[];
};
function Dashboard() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    rpc<DashboardData>("v25_dashboard")
      .then(setData)
      .catch((e) => setError(message(e)));
  }, []);
  const names: Record<string, string> = {
    delivery_unconfigured: "Standard delivery charge needs confirmation.",
    payments_disabled: "Payments are disabled.",
    tobacco_disabled: "Tobacco checkout and delivery are disabled.",
    maintenance: "Maintenance mode is active.",
    store_closed: "The store is not accepting orders.",
  };
  return (
    <>
      <ErrorMessage error={error} />
      {data ? (
        <>
          <div className="stats">
            {Object.entries({
              active: "Active products",
              draft: "Draft products",
              low_stock: "Low-stock products",
              incomplete_translations: "Incomplete translations",
              orders: "Orders",
              pending_fulfillment: "Pending fulfilment",
            }).map(
              ([k, label]) =>
                data[k as keyof DashboardData] !== undefined && (
                  <article className="panel" key={k}>
                    <span>{t(label)}</span>
                    <strong>{String(data[k as keyof DashboardData])}</strong>
                  </article>
                ),
            )}
            {!!data.orders && (
              <article className="panel">
                <span>{t("Paid revenue · all time")}</span>
                <strong>{formatMoney(data.revenue_rappen ?? 0, locale)}</strong>
              </article>
            )}
          </div>
          <section className="panel">
            <h2>{t("System status")}</h2>
            <ul>
              {Object.entries(data.warnings)
                .filter(([, on]) => on)
                .map(([k]) => (
                  <li key={k}>{t(names[k])}</li>
                ))}
            </ul>
          </section>
          {data.recent_orders && (
            <section className="panel">
              <h2>{t("Recent orders")}</h2>
              {data.recent_orders.length ? (
                <ul>
                  {data.recent_orders.map((o) => (
                    <li key={o.id}>
                      #{o.number} · {t(o.status)} ·{" "}
                      {formatMoney(o.total_rappen, locale)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {t("No orders yet. Revenue appears when real orders exist.")}
                </p>
              )}
            </section>
          )}
        </>
      ) : (
        <p role="status">{t("Loading dashboard…")}</p>
      )}
    </>
  );
}

// Native browser confirm-button labels follow the browser locale, so admin confirmations
// use an accessible modal with labels from the selected interface language.
export function useConfirmation() {
  const { t } = useI18n();
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<{
    key: string;
    resolve: (confirmed: boolean) => void;
  } | null>(null);
  useEffect(() => {
    if (pending) ref.current?.showModal();
    return () => pending?.resolve(false);
  }, [pending]);
  function finish(confirmed: boolean) {
    pending?.resolve(confirmed);
    ref.current?.close();
    setPending(null);
  }
  return {
    confirm: (key: string) =>
      new Promise<boolean>((resolve) => setPending({ key, resolve })),
    dialog: pending && (
      <dialog
        ref={ref}
        className="confirmation"
        aria-labelledby={id}
        onCancel={(e) => {
          e.preventDefault();
          finish(false);
        }}
      >
        <h2 id={id}>{t(pending.key)}</h2>
        <div className="actions">
          <button autoFocus onClick={() => finish(false)}>
            {t("Cancel")}
          </button>
          <button className="primary" onClick={() => finish(true)}>
            {t("Confirm")}
          </button>
        </div>
      </dialog>
    ),
  };
}
