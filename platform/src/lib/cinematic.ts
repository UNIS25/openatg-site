import { z } from "zod";
export const chapters = ["tea", "spice", "evening", "restaurant"] as const;
export const editorialSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    invitation_enabled: z.boolean(),
    invitation_delay_ms: z.number().int().min(12000).max(60000),
    invitation_start: z.iso.datetime().nullable(),
    invitation_end: z.iso.datetime().nullable(),
    active_film: z.enum(["daylight-study", "poster-only"]),
    chapter_order: z
      .array(z.enum(chapters))
      .length(4)
      .refine((v) => new Set(v).size === 4),
    copy: z
      .record(
        z.enum(["de", "fr", "en"]),
        z.record(
          z.enum([
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
          ]),
          z.string().trim().min(1).max(500),
        ),
      )
      .optional(),
  })
  .refine(
    (v) =>
      !v.invitation_start ||
      !v.invitation_end ||
      Date.parse(v.invitation_start) < Date.parse(v.invitation_end),
  );
export type EditorialConfig = z.infer<typeof editorialSchema>;
export const defaultEditorial: EditorialConfig = {
  revision: 0,
  invitation_enabled: true,
  invitation_delay_ms: 12000,
  invitation_start: null,
  invitation_end: null,
  active_film: "daylight-study",
  chapter_order: [...chapters],
};
export function invitationScheduled(config: EditorialConfig, now = Date.now()) {
  return (
    config.invitation_enabled &&
    (!config.invitation_start || Date.parse(config.invitation_start) <= now) &&
    (!config.invitation_end || Date.parse(config.invitation_end) > now)
  );
}
export function motionPermitted(input: {
  reduced: boolean;
  mobile: boolean;
  saveData?: boolean;
  effectiveType?: string;
  lowBattery?: boolean;
}) {
  return (
    !input.reduced &&
    !input.mobile &&
    !input.saveData &&
    !input.lowBattery &&
    !["slow-2g", "2g", "3g"].includes(input.effectiveType || "")
  );
}
export function invitationPage(page: string) {
  return page === "" || page === "club";
}
