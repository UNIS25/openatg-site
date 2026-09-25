// Confirmed restaurant identity; the e-commerce legal seller remains unconfirmed.
export const brand = {
  name: "Varathans25",
  mark: "V25",
  region: "SUISSE",
  descriptor: "Varathans25 · Sursee",
  kitchen: "Varathans25",
  technology: "Powered by ATG",
  tagline: "Island flavour. Swiss precision.",
  currency: "CHF",
  country: "CH",
  supportEmail: null as string | null,
  sampleMode: true,
  deliveryCents: 790,
  deliveryVatBps: 810,
  freeDeliveryThresholdCents: 8500,
} as const;
export function brandCopy(text: string) {
  return text
    .replaceAll("V25 Suisse", brand.name)
    .replaceAll("Varathans25", brand.kitchen);
}
