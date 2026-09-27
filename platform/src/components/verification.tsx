"use client";
import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Account, usePlatform } from "./platform";
import { api } from "@/lib/client";
import {
  verificationDestination,
  type ClubAccountState,
} from "@/lib/club-state";
import { vt } from "@/lib/verification-copy";
export function VerificationJourney() {
  const { locale, state, ready, busy, run, reload, tr } = usePlatform();
  const router = useRouter();
  const status = state?.identity.account_state || "registered_unverified";
  const check = useCallback(async () => {
    const result = await api<{ account_state: ClubAccountState }>(
      "/api/verification",
    );
    if (
      result.account_state !== status ||
      result.account_state === "verified_18_plus"
    ) {
      router.replace(verificationDestination(locale, result.account_state));
      router.refresh();
    }
    await reload();
  }, [locale, status, router, reload]);
  useEffect(() => {
    if (status !== "verification_pending") return;
    const timer = setInterval(() => {
      if (!document.hidden) void check().catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [status, check]);
  if (!ready || !state)
    return (
      <p className="container section" role="status">
        {tr("loading")}
      </p>
    );
  if (!state.rows.members?.[0]) return <Account />;
  const pending = status === "verification_pending",
    suspended = status === "suspended",
    rejected = status === "verification_rejected";
  return (
    <section className="container section verification-layout">
      <div>
        <p className="eyebrow">VARATHANS25 · 18+</p>
        <h1>
          {vt(
            locale,
            pending
              ? "pendingTitle"
              : suspended || rejected
                ? "result"
                : "title",
          )}
        </h1>
        <p>{vt(locale, "intro")}</p>
        <nav className="verification-links">
          <a href={`/${locale}/account`}>{vt(locale, "account")}</a>
          <a href={`/${locale}/store`}>{tr("store")}</a>
        </nav>
      </div>
      <div className="panel verification-panel">
        <p className="status-pill" data-testid="verification-status">
          {vt(locale, status)}
        </p>
        {status === "verification_expired" && (
          <p>{vt(locale, "expiredText")}</p>
        )}
        {pending && <p>{vt(locale, "pendingText")}</p>}
        {rejected && <p>{vt(locale, "rejectedText")}</p>}
        {suspended ? (
          <p>{vt(locale, "suspendedText")}</p>
        ) : (
          <>
            <p className="verification-test">{vt(locale, "test")}</p>
            {pending ? (
              <button
                className="button"
                disabled={busy}
                onClick={() => void run(check)}
              >
                {vt(locale, "check")}
              </button>
            ) : (
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await api("/api/verification", { action: "submit" });
                    router.replace(`/${locale}/verification-pending`);
                    router.refresh();
                  })
                }
              >
                {vt(locale, rejected ? "resubmit" : "submit")}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
