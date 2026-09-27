"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { locales } from "@/lib/domain";
import { polishKeys, type PolishConfig } from "@/lib/polish";
import { Field, usePlatform } from "./platform";
const labels = {
  de: {
    title: "Leistungen & Store-Abschluss",
    film: "Gewürzfilm",
    url: "Restaurant · HTTPS-URL",
    note: "Texte unabhängig je Sprache bearbeiten. {delivery}, {threshold} und {discount} beziehen Werte aus den geschützten Einstellungen oben. Silver bleibt kostenlos. Alle Konditionen sind Staging-Werte.",
  },
  fr: {
    title: "Prestations et fin de boutique",
    film: "Film des épices",
    url: "Restaurant · URL HTTPS",
    note: "Modifiez les textes par langue. {delivery}, {threshold} et {discount} reprennent les paramètres protégés ci-dessus. Silver reste gratuit. Toutes les conditions sont des valeurs de staging.",
  },
  en: {
    title: "Benefits & store closing",
    film: "Spice film",
    url: "Restaurant · HTTPS URL",
    note: "Edit each language independently. {delivery}, {threshold} and {discount} use the protected settings above. Silver remains free. All terms are staging values.",
  },
};
const fieldLabel = (key: string, locale: "de" | "fr" | "en") => {
  const groups = {
    de: {
      spice: "Gewürze",
      restaurant: "Restaurant",
      silver: "Silver",
      gold: "Gold",
    },
    fr: {
      spice: "Épices",
      restaurant: "Restaurant",
      silver: "Silver",
      gold: "Gold",
    },
    en: {
      spice: "Spice",
      restaurant: "Restaurant",
      silver: "Silver",
      gold: "Gold",
    },
  }[locale];
  const parts = key.match(/^(spice|restaurant|silver|gold)(.*)$/);
  const names: Record<string, string[]> = {
    Title: ["Titel", "Titre", "Title"],
    Text: ["Text", "Texte", "Text"],
    Cta: ["Button-Text", "Texte du bouton", "Button text"],
    Alt: ["Bildbeschreibung", "Description de l’image", "Image description"],
    Position: ["Kurzbeschreibung", "Présentation", "Positioning"],
    Recurring: ["Laufende Gebühren", "Frais récurrents", "Recurring charges"],
    Delivery: ["Lieferung", "Livraison", "Delivery"],
    Threshold: ["Versandfreigrenze", "Seuil offert", "Free delivery threshold"],
    Profile: ["Profil", "Profil", "Profile"],
    Preferences: ["Einstellungen", "Préférences", "Preferences"],
    Discount: ["Rabatt", "Remise", "Discount"],
    Drink: ["Getränkeleistung", "Boisson offerte", "Complimentary drink"],
    Pass: ["Mitgliedsausweis", "Carte de membre", "Member pass"],
    Benefits: ["Leistungen", "Prestations", "Benefits"],
  };
  if (!parts)
    return {
      de: "Staging-Konditionen",
      fr: "Conditions de staging",
      en: "Staging terms",
    }[locale];
  return `${groups[parts[1] as keyof typeof groups]} · ${names[parts[2]][{ de: 0, fr: 1, en: 2 }[locale]]}`;
};
export default function PolishAdmin() {
  const { locale, tr, run, busy, notice } = usePlatform();
  const [config, setConfig] = useState<PolishConfig | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    api<PolishConfig>("/api/admin/polish")
      .then((c) => {
        if (live) setConfig(c);
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, []);
  if (error) return <p role="alert">{tr("error_network")}</p>;
  if (!config) return <p role="status">{tr("loading")}</p>;
  const label = labels[locale];
  return (
    <section className="polish-settings">
      <h3>{label.title}</h3>
      <p>{label.note}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            setConfig(await api<PolishConfig>("/api/admin/polish", config));
            notice(tr("saved"));
          });
        }}
      >
        <div className="grid">
          <Field label={label.film}>
            <select
              value={config.spice_film}
              onChange={(e) =>
                setConfig({
                  ...config,
                  spice_film: e.target.value as PolishConfig["spice_film"],
                })
              }
            >
              <option value="kitchen">Kitchen · {label.film}</option>
              <option value="poster-only">Poster</option>
            </select>
          </Field>
          <Field label={label.url}>
            <input
              type="url"
              required
              maxLength={300}
              value={config.restaurant_url}
              onChange={(e) =>
                setConfig({ ...config, restaurant_url: e.target.value })
              }
            />
          </Field>
        </div>
        {locales.map((l) => (
          <fieldset key={l}>
            <legend>{l.toUpperCase()}</legend>
            <div className="grid">
              {polishKeys.map((key) => (
                <Field
                  key={key}
                  label={`${l.toUpperCase()} · ${fieldLabel(key, l)}`}
                >
                  <textarea
                    lang={l}
                    required
                    maxLength={500}
                    rows={2}
                    value={config.copy[l][key]}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        copy: {
                          ...config.copy,
                          [l]: { ...config.copy[l], [key]: e.target.value },
                        },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </fieldset>
        ))}
        <button disabled={busy}>{tr("save")}</button>
      </form>
    </section>
  );
}
