"use client";
import type { ReactNode } from "react";
import { useI18n, errorKey } from "./i18n";
export const message = errorKey;
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
  return (
    <label className={`field ${incomplete ? "incomplete" : ""}`}>
      <span>
        {t(label)}
        {incomplete ? " · —" : ""}
      </span>
      {children}
    </label>
  );
}
export function ErrorMessage({ error }: { error: string }) {
  const { t } = useI18n();
  return error ? (
    <p role="alert" className="alert">
      {t(error)}
    </p>
  ) : null;
}
