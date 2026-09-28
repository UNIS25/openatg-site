import "server-only";
import references from "@/data/restricted-references.json";

// A factual archive of existing records. No prices, inventory or commerce attributes.
export const referenceBrands = ["Davidoff", "Patoro"] as const;
export const referenceLibrary = references.map((reference) => ({
  ...reference,
  image: `/api/club/media/${reference.slug}`,
}));

export function findReference(slug: string) {
  return referenceLibrary.find((reference) => reference.slug === slug);
}

export function clubMediaFilename(view: string) {
  if (view === "open" || view === "closed")
    return `varathans-cigars-box-${view}.webp`;
  return findReference(view) ? `${view}.webp` : null;
}
