"use client";
import { useEffect, useState, useRef } from "react";
import { usePlatform, Field } from "./platform";
import { api } from "@/lib/client";
import { ct, type CinemaKey } from "@/lib/cinematic-copy";
import { type EditorialConfig, chapters } from "@/lib/cinematic";
import { locales } from "@/lib/domain";
const keys = [
  "heroTitle",
  "heroText",
  "teaTitle",
  "teaText",
  "spiceTitle",
  "spiceText",
  "eveningTitle",
  "eveningText",
  "restaurantTitle",
  "restaurantText",
] as const;
export default function EditorialAdmin() {
  const { locale, tr, run, busy, notice } = usePlatform();
  const [config, setConfig] = useState<EditorialConfig | null>(null),
    [assets, setAssets] = useState<
      {
        id: string;
        original_filename: string;
        status: string;
        commercial_approved: boolean;
      }[]
    >([]);
  const initialRun = useRef(run);
  useEffect(() => {
    void initialRun.current(async () => {
      const result = await api<{
        config: EditorialConfig;
        assets: typeof assets;
      }>("/api/admin/editorial");
      setConfig(result.config);
      setAssets(result.assets);
    });
  }, []); // one request on screen entry
  if (!config) return <p role="status">{tr("loading")}</p>;
  const set = (patch: Partial<EditorialConfig>) =>
    setConfig({ ...config, ...patch });
  return (
    <div className="editorial-settings">
      <h3>{ct(locale, "media")}</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            setConfig(
              await api<EditorialConfig>("/api/admin/editorial", config),
            );
            notice(ct(locale, "saved"));
          });
        }}
      >
        <label className="check">
          <input
            type="checkbox"
            checked={config.invitation_enabled}
            onChange={(e) => set({ invitation_enabled: e.target.checked })}
          />
          {ct(locale, "enabled")}
        </label>
        <div className="grid">
          <Field label={ct(locale, "delay")}>
            <input
              type="number"
              min="12"
              max="60"
              step="1"
              value={config.invitation_delay_ms / 1000}
              onChange={(e) =>
                set({ invitation_delay_ms: Number(e.target.value) * 1000 })
              }
              required
            />
          </Field>
          {(["start", "end"] as const).map((key) => (
            <Field key={key} label={ct(locale, key)}>
              <input
                type="datetime-local"
                value={config[`invitation_${key}`]?.slice(0, 16) || ""}
                onChange={(e) =>
                  set({
                    [`invitation_${key}`]: e.target.value
                      ? new Date(e.target.value + "Z").toISOString()
                      : null,
                  })
                }
              />
            </Field>
          ))}
          <Field label={ct(locale, "activeFilm")}>
            <select
              value={config.active_film}
              onChange={(e) =>
                set({
                  active_film: e.target.value as EditorialConfig["active_film"],
                })
              }
            >
              <option value="daylight-study">{ct(locale, "study")}</option>
              <option value="poster-only">{ct(locale, "poster")}</option>
            </select>
          </Field>
        </div>
        <h4>{ct(locale, "order")}</h4>
        <ol className="chapter-order">
          {config.chapter_order.map((key, i) => (
            <li key={key}>
              <span>
                {ct(
                  locale,
                  `${key === "evening" ? "evening" : key}Label` as CinemaKey,
                )}
              </span>
              {([-1, 1] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={i + d < 0 || i + d >= chapters.length}
                  aria-label={`${ct(locale, d < 0 ? "up" : "down")} ${key}`}
                  onClick={() => {
                    const order = [...config.chapter_order];
                    [order[i], order[i + d]] = [order[i + d], order[i]];
                    set({ chapter_order: order });
                  }}
                >
                  {d < 0 ? "↑" : "↓"}
                </button>
              ))}
            </li>
          ))}
        </ol>
        {locales.map((l) => (
          <fieldset key={l}>
            <legend>{l.toUpperCase()}</legend>
            {keys.map((key) => (
              <Field key={key} label={`${l.toUpperCase()} · ${ct(l, key)}`}>
                <textarea
                  lang={l}
                  maxLength={500}
                  required
                  rows={key.endsWith("Title") ? 2 : 3}
                  value={config.copy?.[l]?.[key] || ct(l, key)}
                  onChange={(e) => {
                    const copy = Object.fromEntries(
                      locales.map((lang) => [
                        lang,
                        Object.fromEntries(
                          keys.map((k) => [
                            k,
                            config.copy?.[lang]?.[k] || ct(lang, k),
                          ]),
                        ),
                      ]),
                    ) as NonNullable<EditorialConfig["copy"]>;
                    copy[l][key] = e.target.value;
                    set({ copy });
                  }}
                />
              </Field>
            ))}
          </fieldset>
        ))}
        <button className="primary" disabled={busy}>
          {ct(locale, "save")}
        </button>
      </form>
      <section className="section">
        <h3>{ct(locale, "rights")}</h3>
        <p>{ct(locale, "pending")}</p>
        <p>{ct(locale, "draftMedia")}</p>
        <ul>
          <li>daylight-study-1280.mp4 / 960.mp4 / 1280.webm</li>
          <li>daylight-poster-1280.webp / mobile.webp</li>
        </ul>
        {assets.map((a) => (
          <p key={a.id}>
            {a.original_filename} ·{" "}
            {a.commercial_approved ? tr("verified") : ct(locale, "pending")}
          </p>
        ))}
        <p>
          <code>docs/MEDIA_RIGHTS_MANIFEST.md</code>
        </p>
      </section>
    </div>
  );
}
