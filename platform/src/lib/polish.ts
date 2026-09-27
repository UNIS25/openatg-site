import { z } from "zod";
import type { Locale } from "./domain";

export const polishKeys = [
  "spiceTitle",
  "spiceText",
  "restaurantTitle",
  "restaurantText",
  "restaurantCta",
  "restaurantAlt",
  "terms",
  "silverPosition",
  "silverRecurring",
  "silverDelivery",
  "silverThreshold",
  "silverProfile",
  "silverPreferences",
  "silverCta",
  "goldPosition",
  "goldDelivery",
  "goldDiscount",
  "goldDrink",
  "goldPass",
  "goldBenefits",
  "goldCta",
] as const;
export type PolishKey = (typeof polishKeys)[number];
export const polishCopy: Record<Locale, Record<PolishKey, string>> = {
  de: {
    spiceTitle: "Zeit für Geschmack.",
    spiceText: "Ein Blick auf die Zubereitung.",
    restaurantTitle: "Ein Ort, an den man zurückkehrt.",
    restaurantText:
      "Varathans25. Besuchen Sie unser Restaurant in der Schweiz.",
    restaurantCta: "Zum Restaurant",
    restaurantAlt:
      "Die Bar im Varathans25 Restaurant mit dunklen Sitzmöbeln und warmem Licht",
    terms:
      "Staging-Konditionen · Vorbehaltlich der abschliessenden Bestätigung durch Inhaber und Rechtsberatung. Mitgliedschaftszahlungen sind hier nur Tests.",
    silverPosition: "Ihr persönliches Mitgliedskonto.",
    silverRecurring: "Keine wiederkehrende Mitgliedschaftsgebühr",
    silverDelivery: "{delivery} Standardlieferung in der Schweiz",
    silverThreshold: "Kostenlose Lieferung ab {threshold}",
    silverProfile: "Mitgliederprofil und Konto",
    silverPreferences: "Gespeicherte Kontoeinstellungen",
    silverCta: "Silver auswählen",
    goldPosition: "Zusätzliche Leistungen für Ihren Alltag.",
    goldDelivery: "Kostenlose berechtigte Lieferung in der Schweiz",
    goldDiscount:
      "{discount}% Rabatt auf berechtigte Varathans25 Nicht-Tabakprodukte",
    goldDrink:
      "Ein kostenloses Getränk pro bestätigtem Restaurant- oder Lounge-Besuch",
    goldPass: "Digitaler Gold-Mitgliedsausweis",
    goldBenefits: "Zugang zu berechtigten Gold-Leistungen",
    goldCta: "Gold-Optionen ansehen",
  },
  fr: {
    spiceTitle: "Le temps des saveurs.",
    spiceText: "Un regard sur la préparation.",
    restaurantTitle: "Un lieu où revenir.",
    restaurantText: "Varathans25. Retrouvez notre restaurant en Suisse.",
    restaurantCta: "Découvrir le restaurant",
    restaurantAlt:
      "Le bar du restaurant Varathans25, ses sièges sombres et sa lumière chaleureuse",
    terms:
      "Conditions de staging · Sous réserve de validation finale par le propriétaire et le conseil juridique. Les paiements d’adhésion sont uniquement des tests.",
    silverPosition: "Votre compte membre personnel.",
    silverRecurring: "Aucuns frais d’adhésion récurrents",
    silverDelivery: "Livraison standard en Suisse : {delivery}",
    silverThreshold: "Livraison offerte dès {threshold}",
    silverProfile: "Profil membre et compte",
    silverPreferences: "Préférences du compte enregistrées",
    silverCta: "Choisir Silver",
    goldPosition: "Des prestations supplémentaires au quotidien.",
    goldDelivery: "Livraison éligible offerte en Suisse",
    goldDiscount:
      "{discount}% de remise sur les produits Varathans25 hors tabac éligibles",
    goldDrink:
      "Une boisson offerte par visite vérifiée au restaurant ou au lounge",
    goldPass: "Carte de membre Gold numérique",
    goldBenefits: "Accès aux prestations Gold éligibles",
    goldCta: "Voir les options Gold",
  },
  en: {
    spiceTitle: "Time for flavour.",
    spiceText: "A study in preparation.",
    restaurantTitle: "A place to return to.",
    restaurantText: "Varathans25. Visit our restaurant in Switzerland.",
    restaurantCta: "Visit the restaurant",
    restaurantAlt:
      "The Varathans25 restaurant bar with dark seating and warm pendant lights",
    terms:
      "Staging terms · Pending final owner and legal confirmation. Membership payments here are tests only.",
    silverPosition: "Your personal member account.",
    silverRecurring: "No recurring membership charge",
    silverDelivery: "{delivery} standard Swiss delivery",
    silverThreshold: "Free delivery from {threshold}",
    silverProfile: "Member profile and account",
    silverPreferences: "Saved account preferences",
    silverCta: "Choose Silver",
    goldPosition: "Additional benefits for everyday use.",
    goldDelivery: "Free eligible Swiss delivery",
    goldDiscount:
      "{discount}% discount on eligible Varathans25 non-tobacco products",
    goldDrink:
      "One complimentary drink per verified restaurant or lounge visit",
    goldPass: "Digital Gold member pass",
    goldBenefits: "Access to eligible Gold benefits",
    goldCta: "View Gold options",
  },
};
export const polishSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    spice_film: z.enum(["kitchen", "poster-only"]),
    restaurant_image: z.literal("bar-evening"),
    restaurant_url: z
      .url()
      .max(300)
      .refine((value) => {
        const u = new URL(value);
        return u.protocol === "https:" && !u.username && !u.password;
      }, "Use an HTTPS URL without credentials"),
    copy: z.record(
      z.enum(["de", "fr", "en"]),
      z.record(z.enum(polishKeys), z.string().trim().min(1).max(500)),
    ),
  })
  .strict();
export type PolishConfig = z.infer<typeof polishSchema>;
export const defaultPolish: PolishConfig = {
  revision: 0,
  spice_film: "kitchen",
  restaurant_image: "bar-evening",
  restaurant_url: "https://www.varathans25.ch/",
  copy: polishCopy,
};
export function polishText(
  config: PolishConfig,
  locale: Locale,
  key: PolishKey,
  values: Record<string, string> = {},
) {
  return (config.copy[locale][key] || polishCopy[locale][key]).replace(
    /\{(\w+)\}/g,
    (match, k) => values[k] ?? match,
  );
}
