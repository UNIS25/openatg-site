import { en } from "@/messages/en";
import { de } from "@/messages/de";
import { fr } from "@/messages/fr";
import { locales, type Locale } from "./types";
import { brand } from "./brand";
import type { Messages } from "@/messages/en";
function applyBrand(dictionary: Messages): Messages {
  return Object.fromEntries(
    Object.entries(dictionary).map(([key, value]) => [
      key,
      value
        .replaceAll("V25 Suisse", brand.name)
        .replaceAll("Varathans25", brand.kitchen),
    ]),
  ) as Messages;
}
export const messages = {
  en: applyBrand(en),
  de: applyBrand(de),
  fr: applyBrand(fr),
};
export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
