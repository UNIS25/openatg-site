import type { Locale } from "./domain";

const copy = {
  title: ["Die Referenzsammlung", "La collection de références", "The reference collection"],
  intro: [
    "Bestehende Produktreferenzen und Verpackungskonzepte zur Ansicht. Die Angaben dokumentieren den hinterlegten Stand.",
    "Références de produits et concepts d’emballage à consulter. Les informations correspondent aux données consignées.",
    "Existing product references and packaging concepts for reading. Information reflects the recorded reference data.",
  ],
  browse: ["Referenzen ansehen", "Consulter les références", "View references"],
  references: ["Produktreferenzen", "Références de produits", "Product references"],
  filter: ["Nach Marke filtern", "Filtrer par marque", "Filter by brand"],
  all: ["Alle Marken", "Toutes les marques", "All brands"],
  count: ["Referenzen", "références", "references"],
  index: ["Referenzverzeichnis", "Index des références", "Reference index"],
  detail: ["Referenzdetails", "Détails de la référence", "Reference details"],
  brand: ["Marke", "Marque", "Brand"],
  collection: ["Serie", "Série", "Series"],
  format: ["Hinterlegtes Format", "Format consigné", "Recorded format"],
  length: ["Länge", "Longueur", "Length"],
  ring: ["Ringmass", "Calibre", "Ring gauge"],
  status: ["Referenzstatus", "Statut de la référence", "Reference status"],
  preview: ["Vorschau", "Aperçu", "Preview"],
  availability: ["Verfügbarkeit nicht bestätigt.", "Disponibilité non confirmée.", "Availability unconfirmed."],
  unknownSize: [
    "Bestätigte Angaben zu Länge und Ringmass liegen nicht vor.",
    "La longueur et le calibre ne sont pas confirmés.",
    "Confirmed length and ring-gauge information is not available.",
  ],
  readOnly: [
    "Nur zur Ansicht. Keine Bestellung oder Konfiguration möglich.",
    "Consultation uniquement. Aucune commande ni configuration possible.",
    "Read-only reference. Ordering and configuration are unavailable.",
  ],
  image: ["Referenzabbildung", "Image de référence", "Reference image"],
  signature: ["Varathans25 Signature Box", "Varathans25 Signature Box", "Varathans25 Signature Box"],
  packaging: ["Verpackungskonzept", "Concept d’emballage", "Packaging concept"],
  concepts: ["Zwei Boxkonzepte", "Deux concepts de coffret", "Two box concepts"],
  four: ["4er-Box", "Coffret de 4", "Box of 4"],
  six: ["6er-Box", "Coffret de 6", "Box of 6"],
  fourText: [
    "Konzept für vier Positionen. Die geöffnete Varathans25-Abbildung zeigt das bestehende Vierer-Konzept.",
    "Concept à quatre emplacements. L’image du coffret Varathans25 ouvert représente le concept existant à quatre places.",
    "A concept with four positions. The open Varathans25 image documents the existing four-position concept.",
  ],
  sixText: [
    "Konzept für sechs Positionen. Eine bestätigte Verpackungsabbildung und Abmessungen liegen noch nicht vor.",
    "Concept à six emplacements. Le visuel d’emballage et les dimensions ne sont pas encore confirmés.",
    "A concept with six positions. A confirmed packaging image and dimensions are not yet available.",
  ],
} as const;

export type ReferenceLabel = keyof typeof copy;
export function rt(locale: Locale, key: ReferenceLabel) {
  return copy[key][({ de: 0, fr: 1, en: 2 } as const)[locale]];
}
