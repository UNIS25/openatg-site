import type { Locale } from "./domain";

const copy = {
  choices: ["So möchten Sie bestellen", "Comment souhaitez-vous commander ?", "How would you like to order?"],
  guest: ["Als Gast fortfahren", "Continuer en invité", "Continue as Guest"],
  guestDetail: ["Ohne Mitgliedschaft. Nur Tee und Curry.", "Sans adhésion. Thé et curry uniquement.", "No membership required. Tea and curry only."],
  silver: ["Silver kostenlos nutzen", "Utiliser Silver gratuitement", "Use free Silver"],
  silverDetail: ["CHF 10 berechtigte Lieferung, kostenlos ab CHF 100.", "Livraison admissible CHF 10, offerte dès CHF 100.", "CHF 10 eligible delivery, free from CHF 100."],
  gold: ["Gold beitreten oder nutzen", "Rejoindre ou utiliser Gold", "Join or use Gold"],
  goldDetail: ["CHF 69 monatlich oder CHF 500 jährlich. Leistungen erst nach bestätigter Zahlung.", "CHF 69 par mois ou CHF 500 par an. Avantages après paiement confirmé.", "CHF 69 monthly or CHF 500 yearly. Benefits begin after confirmed payment."],
  guestAddress: ["Gast und Lieferadresse", "Invité et adresse de livraison", "Guest and delivery address"],
  email: ["E-Mail-Adresse", "Adresse e-mail", "Email address"],
  name: ["Vollständiger Name", "Nom complet", "Full name"],
  street: ["Strasse", "Rue", "Street"],
  house: ["Hausnummer", "Numéro", "House number"],
  postal: ["Postleitzahl", "Code postal", "Postal code"],
  city: ["Ort", "Ville", "City"],
  consent: ["Ich bestätige die angegebenen Daten für diese lokale Testbestellung.", "Je confirme ces données pour cette commande test locale.", "I confirm these details for this local test order."],
  placeTest: ["Testbestellung erstellen", "Créer la commande test", "Create test order"],
  received: ["Testbestellung erhalten", "Commande test reçue", "Test order received"],
  payment: ["Swiss-QR-Testbeleg", "Justificatif test Swiss QR", "Swiss QR test bill"],
  paymentNote: ["TEST · NICHT ZAHLBAR. Es wurde keine Zahlung ausgelöst.", "TEST · NON PAYABLE. Aucun paiement n’a été déclenché.", "TEST · NOT PAYABLE. No payment has been initiated."],
  reference: ["Referenz", "Référence", "Reference"],
  wait: [
    "Ihre Bestellung wird bearbeitet, sobald die Zahlung eingegangen ist. Falls Sie innerhalb von zwei Werktagen keine Bestätigung erhalten, kontaktieren Sie uns bitte.",
    "Votre commande sera traitée dès réception du paiement. Si vous ne recevez pas de confirmation sous deux jours ouvrables, veuillez nous contacter.",
    "Your order will be processed after payment is received. If you do not receive confirmation within two business days, please contact us.",
  ],
  emailPending: ["E-Mail-Versand ist in dieser lokalen Vorschau nicht konfiguriert.", "L’envoi d’e-mails n’est pas configuré dans cet aperçu local.", "Email delivery is not configured in this local preview."],
} as const;
export type CheckoutLabel = keyof typeof copy;
export function checkoutText(locale: Locale, key: CheckoutLabel) {
  return copy[key][({ de: 0, fr: 1, en: 2 } as const)[locale]];
}
