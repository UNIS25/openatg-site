import { z } from "zod";
import type { Locale } from "./domain";

export const experienceKeys = [
  "gatewayTitle",
  "storeTitle",
  "storeText",
  "teaTitle",
  "teaText",
  "curryTitle",
  "curryText",
  "allTitle",
  "allText",
  "deliveryTitle",
  "deliveryText",
  "clubTitle",
  "clubText",
] as const;
export type ExperienceKey = (typeof experienceKeys)[number];
const copy: Record<Locale, Record<ExperienceKey, string>> = {
  de: {
    gatewayTitle: "Zeit für das Wesentliche.",
    storeTitle: "Ein Moment.\nEine Tasse Tee.",
    storeText: "Die Teekollektion von Varathans25.",
    teaTitle: "Fünf Tees.\nIhre Auswahl.",
    teaText: "Entdecken Sie die fünf Teedosen unserer Kollektion.",
    curryTitle: "Varathans25\nCurry.",
    curryText:
      "Gelber Curry Kokos. Entdecken Sie unser Curry und die verfügbaren Produktinformationen.",
    allTitle: "Die ganze Kollektion.",
    allText: "Tee und Curry. Alle Produkte an einem Ort.",
    deliveryTitle: "Zu Ihnen.\nIn der Schweiz.",
    deliveryText:
      "Kostenlose Standardlieferung ab CHF 100.00 nach anwendbaren Rabatten. Die Lieferkosten werden im Warenkorb berechnet.",
    clubTitle: "Premium Cigar Club",
    clubText:
      "Ihr persönlicher Zugang. Mitgliedschaft, Verifizierungsstatus und Kontoeinstellungen an einem Ort.",
  },
  fr: {
    gatewayTitle: "Le temps de l’essentiel.",
    storeTitle: "Un moment.\nUne tasse de thé.",
    storeText: "La collection de thés Varathans25.",
    teaTitle: "Cinq thés.\nVotre sélection.",
    teaText: "Découvrez les cinq boîtes de notre collection de thés.",
    curryTitle: "Le curry\nVarathans25.",
    curryText:
      "Gelber Curry Kokos. Découvrez notre curry et les informations produit disponibles.",
    allTitle: "Toute la collection.",
    allText: "Thés et curry. Tous nos produits réunis.",
    deliveryTitle: "Chez vous.\nEn Suisse.",
    deliveryText:
      "Livraison standard offerte dès CHF 100.00 après les remises applicables. Les frais sont calculés dans le panier.",
    clubTitle: "Premium Cigar Club",
    clubText:
      "Votre accès personnel. Adhésion, statut de vérification et paramètres de compte réunis.",
  },
  en: {
    gatewayTitle: "Time for what matters.",
    storeTitle: "A moment.\nA cup of tea.",
    storeText: "The Varathans25 tea collection.",
    teaTitle: "Five teas.\nYour selection.",
    teaText: "Discover the five tins in our tea collection.",
    curryTitle: "Varathans25\nCurry.",
    curryText:
      "Gelber Curry Kokos. Explore our curry and its available product information.",
    allTitle: "The whole collection.",
    allText: "Tea and curry. All our products in one place.",
    deliveryTitle: "To your door.\nIn Switzerland.",
    deliveryText:
      "Free standard Swiss delivery from CHF 100.00 after eligible discounts. Delivery charges are calculated in your basket.",
    clubTitle: "Premium Cigar Club",
    clubText:
      "Your personal access. Membership, verification status and account settings in one place.",
  },
};
export const experienceSchema = z
  .object({
    gateway_film: z.enum(["highlands", "evening", "poster-only"]),
    store_film: z.enum(["tea", "poster-only"]),
    club_film: z.enum(["evening", "poster-only"]),
    copy: z.record(
      z.enum(["de", "fr", "en"]),
      z.record(z.enum(experienceKeys), z.string().trim().min(1).max(500)),
    ),
  })
  .strict();
export type ExperienceConfig = z.infer<typeof experienceSchema>;
export const defaultExperience: ExperienceConfig = {
  gateway_film: "evening",
  store_film: "tea",
  club_film: "evening",
  copy,
};
export const experienceText = (
  locale: Locale,
  key: ExperienceKey,
  config?: ExperienceConfig,
) => config?.copy[locale]?.[key] || copy[locale][key];
const labels = {
  explore: ["General Store", "Boutique générale", "General Store"],
  enter: [
    "Premium Cigar Club · 18+",
    "Premium Cigar Club · 18+",
    "Premium Cigar Club · 18+",
  ],
  teaPouring: ["Die Kunst des Tees", "L’art du thé", "The art of tea"],
  teaPouringText: ["Ein stiller Moment vor der Kollektion.", "Un instant de calme avant la collection.", "A quiet moment before the collection."],
  viewProducts: ["Produkte ansehen", "Voir les produits", "View Products"],
  joinClub: ["Club beitreten", "Rejoindre le club", "Join the Club"],
  existingMember: ["Als Mitglied anmelden", "Connexion membre", "Existing Member Sign In"],
  store: ["Store", "Boutique", "Store"],
  catalogue: ["Alle Produkte", "Tous les produits", "All products"],
  tea: ["Teekollektion", "Collection de thés", "Tea collection"],
  curry: ["Curry", "Curry", "Curry"],
  all: ["Alle", "Tous", "All"],
  pause: ["Film pausieren", "Mettre le film en pause", "Pause film"],
  play: ["Film abspielen", "Lire le film", "Play film"],
  still: ["Standbild", "Image fixe", "Still image"],
  details: ["Produkt entdecken", "Découvrir le produit", "Explore product"],
  weight: ["Nettogewicht", "Poids net", "Net weight"],
  variant: ["Sorte", "Variété", "Variant"],
  pending: ["Noch nicht bestätigt", "Pas encore confirmé", "Not yet confirmed"],
  stock: ["Auf Lager", "En stock", "In stock"],
  out: ["Nicht verfügbar", "Indisponible", "Unavailable"],
  previewStock: [
    "Für die Vorschau verfügbar",
    "Disponible en aperçu",
    "Available in preview",
  ],
  description: ["Beschreibung", "Description", "Description"],
  ingredients: ["Zutaten", "Ingrédients", "Ingredients"],
  allergens: ["Allergene", "Allergènes", "Allergens"],
  nutrition: ["Nährwerte", "Valeurs nutritionnelles", "Nutrition"],
  origin: ["Herkunft", "Origine", "Origin"],
  preparation: ["Zubereitung", "Préparation", "Preparation"],
  storage: ["Aufbewahrung", "Conservation", "Storage"],
  delivery: ["Lieferung", "Livraison", "Delivery"],
  preview: [
    "Lokale Vorschau · Preise und Produktangaben noch nicht freigegeben. Keine Zahlung möglich.",
    "Aperçu local · Prix et informations produit en attente de validation. Aucun paiement possible.",
    "Local preview · Prices and product information await approval. No payment is possible.",
  ],
  apply: [
    "Mitgliedschaft beantragen",
    "Demander une adhésion",
    "Apply for membership",
  ],
  member: ["Mitgliederbereich", "Espace membre", "Member area"],
  age: [
    "Nur für Erwachsene ab 18 Jahren. Dieser Hinweis ist keine Altersverifizierung. Die Prüfung erfolgt separat über Ihr Konto.",
    "Réservé aux adultes de 18 ans et plus. Cet avis ne vérifie pas l’âge. La vérification s’effectue séparément dans votre compte.",
    "For adults aged 18 and over. This notice does not verify age. Verification is a separate account process.",
  ],
  verificationRequired: [
    "Bitte melden Sie sich an und schliessen Sie die Kontoverifizierung ab, um Ihren Mitgliederbereich zu öffnen.",
    "Connectez-vous et terminez la vérification du compte pour accéder à votre espace membre.",
    "Sign in and complete account verification to open your member area.",
  ],
  silver: [
    "Persönliches Konto und Übersicht Ihrer Mitgliedschaft.",
    "Compte personnel et suivi de votre adhésion.",
    "Personal account and membership overview.",
  ],
  gold: [
    "Mitgliedsstatus, digitaler Pass und Übersicht der hinterlegten Leistungen.",
    "Statut de membre, carte numérique et suivi des prestations configurées.",
    "Membership status, digital pass and configured benefits overview.",
  ],
  benefits: ["Ihre Leistungen", "Vos prestations", "Your benefits"],
  redemptions: [
    "Getränke-Einlösungen",
    "Échanges de boissons",
    "Drink redemptions",
  ],
  pass: [
    "Digitaler Mitgliedsausweis",
    "Carte de membre numérique",
    "Digital membership pass",
  ],
  privacy: [
    "Konto & Datenschutz",
    "Compte et confidentialité",
    "Account & privacy",
  ],
  disabled: [
    "Tabakkäufe und Tabakzahlungen sind in dieser Vorschau deaktiviert.",
    "Les achats et paiements de tabac sont désactivés dans cet aperçu.",
    "Tobacco purchases and payments are disabled in this preview.",
  ],
  noRedemptions: [
    "Noch keine Einlösung erfasst.",
    "Aucun échange enregistré.",
    "No redemption recorded yet.",
  ],
} as const;
export type ExperienceLabel = keyof typeof labels;
export const et = (locale: Locale, key: ExperienceLabel) =>
  labels[key][({ de: 0, fr: 1, en: 2 } as const)[locale]];
