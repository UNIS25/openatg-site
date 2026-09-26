"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { locales, type Locale, formatMoney } from "./domain";
import messages from "./admin-messages.json" with { type: "json" };

export const languageKey = "varathans25_admin_language";
export function adminLanguage(value: string | null): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : "de";
}
export function translate(
  locale: Locale,
  key: string,
  values: Record<string, string | number> = {},
) {
  const entry = (
    messages as Record<string, { de: string; fr: string; en?: string }>
  )[key];
  const text = entry?.[locale] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    String(values[name] ?? match),
  );
}
export function errorKey(error: unknown): string {
  const value =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "";
  if (Object.hasOwn(messages, value)) return value;
  if (/duplicate key/.test(value))
    return "This SKU, barcode or product slug is already in use.";
  if (/check constraint|invalid input syntax/.test(value))
    return "Check the entered values and required confirmations.";
  if (/JSON/.test(value)) return "Nutrition must contain valid JSON.";
  if (/JWT|session|token.*expired/i.test(value))
    return "Your session has expired. Sign in again.";
  if (/fetch|network|Failed to send/i.test(value))
    return "Connection unavailable. Please try again.";
  if (/factor|MFA|TOTP|verification code/i.test(value))
    return "Verification failed. Check your authenticator code and try again.";
  if (/password/i.test(value))
    return "Use at least 14 characters with upper and lower case letters, a number and a symbol.";
  return "The operation could not be completed. Please try again.";
}
type I18n = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  money: (value: number) => string;
};
const Context = createContext<I18n | null>(null);
export function I18nProvider({
  children,
  initialLocale = "de",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `Varathans25 · ${translate(locale, "Administration")}`;
    try {
      localStorage.setItem(languageKey, locale);
    } catch {
      /* Language switching also works without browser storage. */
    }
    // Native validation uses the chosen admin language, independently of browser settings.
    const validate = (
      input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    ) => {
      input.setCustomValidity("");
      const v = input.validity;
      const key =
        input.dataset.errorKey ||
        (v.valueMissing
          ? "Complete this field."
          : v.typeMismatch
            ? "Enter a valid email address."
            : v.patternMismatch
              ? "Use the requested format."
              : v.rangeOverflow ||
                  v.rangeUnderflow ||
                  v.stepMismatch ||
                  v.badInput
                ? "Enter a number within the allowed range."
                : v.tooShort || v.tooLong
                  ? "Check the length of this value."
                  : "");
      if (key) input.setCustomValidity(translate(locale, key));
    };
    const isControl = (
      target: EventTarget | null,
    ): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;
    const invalid = (e: Event) => {
      if (isControl(e.target)) validate(e.target);
    };
    const input = (e: Event) => {
      if (isControl(e.target)) {
        delete e.target.dataset.errorKey;
        e.target.setCustomValidity("");
      }
    };
    document
      .querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input,textarea,select")
      .forEach((control) => {
        if (control.validity.customError) validate(control);
      });
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", input, true);
    return () => {
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("input", input, true);
    };
  }, [locale]);
  return (
    <Context.Provider
      value={{
        locale,
        setLocale,
        t: (key, values) => translate(locale, key, values),
        money: (value) => formatMoney(value, locale),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error("I18nProvider required");
  return value;
}
export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      className="language-selector"
      role="group"
      aria-label={t("Interface language")}
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
