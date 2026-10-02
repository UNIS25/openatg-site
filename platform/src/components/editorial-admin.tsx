"use client";
import { useEffect, useState, useRef } from "react";
import { usePlatform, Field } from "./platform";
import { api } from "@/lib/client";
import { ct } from "@/lib/cinematic-copy";
import { type EditorialConfig } from "@/lib/cinematic";
import { locales } from "@/lib/domain";
import {
  defaultExperience,
  experienceKeys,
  experienceText,
  type ExperienceConfig,
} from "@/lib/experience";
const labels = {
  de: [
    "Gateway · Titel",
    "Store · Titel",
    "Store · Einleitung",
    "Tee · Titel",
    "Tee · Text",
    "Curry · Titel",
    "Curry · Text",
    "Kollektion · Titel",
    "Kollektion · Text",
    "Lieferung · Titel",
    "Lieferung · Text",
    "Club · Titel",
    "Club · Kontoinformation",
  ],
  fr: [
    "Accueil · Titre",
    "Boutique · Titre",
    "Boutique · Introduction",
    "Thé · Titre",
    "Thé · Texte",
    "Curry · Titre",
    "Curry · Texte",
    "Collection · Titre",
    "Collection · Texte",
    "Livraison · Titre",
    "Livraison · Texte",
    "Club · Titre",
    "Club · Informations de compte",
  ],
  en: [
    "Gateway · Title",
    "Store · Title",
    "Store · Introduction",
    "Tea · Title",
    "Tea · Text",
    "Curry · Title",
    "Curry · Text",
    "Collection · Title",
    "Collection · Text",
    "Delivery · Title",
    "Delivery · Text",
    "Club · Title",
    "Club · Account information",
  ],
};
export default function EditorialAdmin() {
  const { locale, tr, run, busy, notice } = usePlatform();
  const [config, setConfig] = useState<EditorialConfig | null>(null);
  const initialRun = useRef(run);
  useEffect(() => {
    void initialRun.current(async () => {
      const result = await api<{ config: EditorialConfig }>(
        "/api/admin/editorial",
      );
      setConfig(result.config);
    });
  }, []);
  if (!config) return <p role="status">{tr("loading")}</p>;
  const experience = config.experience || defaultExperience;
  const set = (patch: Partial<ExperienceConfig>) =>
    setConfig({ ...config, experience: { ...experience, ...patch } });
  return (
    <div className="editorial-settings">
      <h3>{ct(locale, "media")}</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            setConfig(
              await api<EditorialConfig>("/api/admin/editorial", {
                ...config,
                experience,
              }),
            );
            notice(ct(locale, "saved"));
          });
        }}
      >
        <div className="grid">
          {(["gateway", "store", "club"] as const).map((key, i) => (
            <Field
              key={key}
              label={`${["Gateway", "Store", "Club"][i]} · ${ct(locale, "activeFilm")}`}
            >
              <select
                value={experience[`${key}_film`]}
                onChange={(e) => set({ [`${key}_film`]: e.target.value })}
              >
                <option value={["evening", "tea", "evening"][i]}>
                  {
                    [
                      "Varathans25 atelier · premium still",
                      "Tea pouring",
                      "Varathans25 atelier · premium still",
                    ][i]
                  }
                </option>
                <option value="poster-only">{ct(locale, "poster")}</option>
              </select>
            </Field>
          ))}
        </div>
        {locales.map((l) => (
          <fieldset key={l}>
            <legend>{l.toUpperCase()}</legend>
            {experienceKeys.map((key, i) => (
              <Field key={key} label={`${l.toUpperCase()} · ${labels[l][i]}`}>
                <textarea
                  lang={l}
                  rows={key.endsWith("Title") ? 2 : 3}
                  required
                  maxLength={500}
                  value={experienceText(l, key, experience)}
                  onChange={(e) =>
                    set({
                      copy: {
                        ...experience.copy,
                        [l]: { ...experience.copy[l], [key]: e.target.value },
                      },
                    })
                  }
                />
              </Field>
            ))}
          </fieldset>
        ))}
        <button className="primary" disabled={busy}>
          {ct(locale, "save")}
        </button>
      </form>
      <p className="muted">
        {locale === "de"
          ? "Film und zugehöriges Standbild werden gemeinsam gewählt. Verwendet werden ausschliesslich die dokumentierten lokalen Filmdateien. Neue Medien benötigen eine Rechteprüfung und technische Freigabe."
          : locale === "fr"
            ? "Le film et son image fixe sont sélectionnés ensemble. Seuls les fichiers locaux documentés sont disponibles. Tout nouveau média nécessite une validation des droits et un contrôle technique."
            : "Each film is paired with its matching poster. Only documented local films are available. New media requires rights verification and technical approval."}
      </p>
    </div>
  );
}
