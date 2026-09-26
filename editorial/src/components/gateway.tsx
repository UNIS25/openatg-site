"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/types";
import { isStaticReview, storageKey } from "@/lib/review-mode";
export function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(storageKey("locale"), locale);
  } catch {}
  if (!isStaticReview)
    document.cookie = `v25_locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
}
export function Gateway() {
  const router = useRouter();
  const [selected, setSelected] = useState<Locale | null>(null);
  return (
    <main className="language-entrance">
      <div className="entrance-content">
        <h1>
          <img
            src="/varathans25/brand/varathans25-original.png"
            width="368"
            height="200"
            alt="Varathans25"
          />
        </h1>
        <p lang="en">Choose your language</p>
        <nav aria-label="Choose your language" className="entrance-choices">
          {(
            [
              ["de", "Deutsch"],
              ["fr", "Français"],
              ["en", "English"],
            ] as const
          ).map(([locale, name]) => (
            <button
              key={locale}
              lang={locale}
              aria-pressed={selected === locale}
              disabled={selected !== null}
              onClick={() => {
                setSelected(locale);
                saveLocale(locale);
                router.replace(`/${locale}`);
                router.refresh();
              }}
            >
              {name}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
