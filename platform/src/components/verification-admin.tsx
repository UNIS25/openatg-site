"use client";
import { useEffect, useState } from "react";
import { Field, usePlatform } from "./platform";
import { api, type DbRow } from "@/lib/client";
import { vt, type VerificationKey } from "@/lib/verification-copy";
type ReviewRow = DbRow & {
  expired: boolean;
  member?: { name: string; state: string };
};
type Response = {
  rows: ReviewRow[];
  settings: { admin_mfa_required: boolean };
  hasMore: boolean;
};
const reasons = {
  approve: "age_confirmed",
  reject: "age_not_confirmed",
  resubmit: "evidence_incomplete",
  revoke: "access_revoked",
  expire: "expired",
  suspend: "account_suspended",
} as const;
type Decision = keyof typeof reasons;
function Review({
  row,
  refresh,
}: {
  row: ReviewRow;
  refresh: () => Promise<void>;
}) {
  const { locale, tr, run, busy, state } = usePlatform();
  const [decision, setDecision] = useState<Decision>("reject");
  const [events, setEvents] = useState<DbRow[] | null>(null);
  const canApprove =
    row.is_test &&
    row.method === "local-review" &&
    ["pending", "manual_review"].includes(row.status) &&
    !!row.submitted_at &&
    row.member?.state === "active";
  return (
    <article className="panel">
      <h3>{row.member?.name || row.member_id}</h3>
      <p>{row.member_id}</p>
      <dl>
        <dt>{vt(locale, "status")}</dt>
        <dd>
          {vt(
            locale,
            row.member?.state !== "active"
              ? "suspended"
              : row.status === "verified"
                ? !row.expired
                  ? "verified_18_plus"
                  : "verification_expired"
                : ["pending", "manual_review"].includes(row.status)
                  ? row.submitted_at
                    ? "verification_pending"
                    : "registered_unverified"
                  : row.status === "expired"
                    ? "verification_expired"
                    : "verification_rejected",
          )}
        </dd>
        <dt>{vt(locale, "reference")}</dt>
        <dd>{row.provider_reference || "—"}</dd>
        <dt>{vt(locale, "method")}</dt>
        <dd>
          {row.method
            ? vt(
                locale,
                row.method === "local-review"
                  ? "localReview"
                  : row.method === "legacy-test"
                    ? "legacyTest"
                    : "provider",
              )
            : "—"}
        </dd>
        <dt>{vt(locale, "submitted")}</dt>
        <dd>
          {row.submitted_at
            ? new Date(row.submitted_at).toLocaleString(`${locale}-CH`)
            : "—"}
        </dd>
      </dl>
      {row.is_test && <p className="verification-test">{vt(locale, "test")}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api("/api/verification", {
              action: "review",
              member: row.member_id,
              decision,
              reason: reasons[decision],
              revision: row.revision,
            });
            setEvents(null);
            await refresh();
          });
        }}
      >
        <Field label={vt(locale, "decision")}>
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value as Decision)}
          >
            {(Object.keys(reasons) as Decision[]).map((key) => (
              <option
                key={key}
                value={key}
                disabled={key === "approve" && !canApprove}
              >
                {vt(locale, key === "resubmit" ? "resubmitDecision" : key)}
              </option>
            ))}
          </select>
        </Field>
        <p>
          {vt(locale, "reason")}: {vt(locale, reasons[decision])}
        </p>
        <button
          className="button"
          disabled={
            busy ||
            row.member_id === state?.user.id ||
            (decision === "approve" && !canApprove)
          }
        >
          {vt(locale, "review")}
        </button>
      </form>
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const data = await api<{ events: DbRow[] }>(
              `/api/verification?history=${row.member_id}`,
            );
            setEvents(data.events);
          })
        }
      >
        {vt(locale, "history")}
      </button>
      {events && (
        <ul className="verification-history">
          {events.map((event) => (
            <li key={event.id}>
              <time>
                {new Date(event.created_at).toLocaleString(`${locale}-CH`)}
              </time>{" "}
              ·{" "}
              {event.action.startsWith("verification_")
                ? vt(
                    locale,
                    event.action === "verification_submitted"
                      ? "submitted"
                      : event.action === "verification_resubmit"
                        ? "resubmitDecision"
                        : (event.action.slice(13) as VerificationKey),
                  )
                : tr("saved")}{" "}
              · {event.actor || "—"}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
export function VerificationAdmin() {
  const { locale, tr, state, run, busy } = usePlatform();
  const [data, setData] = useState<Response | null>(null);
  const [offset, setOffset] = useState(0);
  const [failed, setFailed] = useState(false);
  async function refresh() {
    setData(await api<Response>(`/api/verification?review=1&offset=${offset}`));
  }
  useEffect(() => {
    let active = true;
    setFailed(false);
    api<Response>(`/api/verification?review=1&offset=${offset}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [offset]);
  return (
    <div className="verification-admin">
      <h2>{vt(locale, "verificationAdmin")}</h2>
      {failed && <p role="alert">{tr("error_network")}</p>}
      {state?.identity.role === "owner" && data && (
        <label className="check">
          <input
            type="checkbox"
            checked={data.settings.admin_mfa_required}
            disabled={busy}
            onChange={(e) => {
              const required = e.target.checked;
              const previous = data;
              setData({
                ...data,
                settings: { ...data.settings, admin_mfa_required: required },
              });
              void run(async () => {
                try {
                  await api("/api/verification", {
                    action: "mfa-policy",
                    required,
                  });
                  await refresh();
                } catch (error) {
                  setData(previous);
                  throw error;
                }
              });
            }}
          />
          {vt(locale, "mfaPolicy")}
        </label>
      )}
      {!data ? (
        <p role="status">{tr("loading")}</p>
      ) : data.rows.length ? (
        data.rows.map((row) => (
          <Review
            key={`${row.member_id}-${row.revision}`}
            row={row}
            refresh={refresh}
          />
        ))
      ) : (
        <p>{vt(locale, "noApplications")}</p>
      )}
      <div className="actions">
        <button
          disabled={busy || offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 50))}
          aria-label={tr("previous")}
        >
          ←
        </button>
        <span>
          {offset + 1}–{offset + (data?.rows.length || 0)}
        </span>
        <button
          disabled={busy || !data?.hasMore}
          onClick={() => setOffset(offset + 50)}
          aria-label={tr("next")}
        >
          →
        </button>
      </div>
    </div>
  );
}
