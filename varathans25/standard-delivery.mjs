// Frontend review of standard Swiss delivery for non-tobacco merchandise only.
// No checkout, order submission or shipping rate is authorized by this module.
export const FREE_DELIVERY_RAPPEN = 10_000;

export function standardDelivery({ discountedSubtotalRappen, country = 'CH', standardRateRappen = null }) {
  if (!Number.isSafeInteger(discountedSubtotalRappen) || discountedSubtotalRappen < 0)
    throw new RangeError('INVALID_SUBTOTAL');
  if (standardRateRappen !== null && (!Number.isSafeInteger(standardRateRappen) || standardRateRappen < 0))
    throw new RangeError('INVALID_DELIVERY_RATE');
  const eligibleCountry = country === 'CH';
  const free = eligibleCountry && discountedSubtotalRappen >= FREE_DELIVERY_RAPPEN;
  return {
    free,
    remainingRappen: eligibleCountry ? Math.max(0, FREE_DELIVERY_RAPPEN - discountedSubtotalRappen) : null,
    chargeRappen: eligibleCountry ? (free ? 0 : standardRateRappen) : null,
    status: !eligibleCountry ? 'INTERNATIONAL_UNAVAILABLE' : free ? 'FREE' : 'STANDARD_RATE_APPLIES',
  };
}

export const deliveryCopy = {
  en: {
    announcement: 'Free delivery on orders of CHF 100 or more.',
    scope: 'Food, tea, gifts and lifestyle products · Standard Swiss delivery',
    product: 'Free standard Swiss delivery from CHF 100',
    progress: 'Add {amount} more for free delivery.',
    unlocked: 'You’ve unlocked free delivery.',
    heading: 'Standard delivery', country: 'Delivery destination', swiss: 'Switzerland', international: 'Outside Switzerland',
    abroad: 'This offer applies only to standard delivery within Switzerland. International delivery is unavailable.',
    pending: 'Standard delivery applies. The delivery rate is awaiting confirmation.',
    disabled: 'Checkout is unavailable until prices, availability and delivery arrangements are approved.',
    basis: 'Calculated after merchandise discounts. Non-tobacco products only.',
    invalid: 'The delivery estimate is unavailable. Please review your bag.',
  },
  de: {
    announcement: 'Kostenlose Lieferung ab einem Bestellwert von CHF 100.',
    scope: 'Lebensmittel, Tee, Geschenke und Lifestyle-Produkte · Standardlieferung in der Schweiz',
    product: 'Kostenlose Standardlieferung in der Schweiz ab CHF 100',
    progress: 'Noch {amount} bis zur kostenlosen Lieferung.',
    unlocked: 'Ihre Lieferung ist kostenlos.',
    heading: 'Standardlieferung', country: 'Lieferziel', swiss: 'Schweiz', international: 'Ausserhalb der Schweiz',
    abroad: 'Dieses Angebot gilt nur für die Standardlieferung innerhalb der Schweiz. Internationale Lieferung ist nicht verfügbar.',
    pending: 'Standardversandkosten fallen an. Der Lieferpreis wird noch bestätigt.',
    disabled: 'Der Checkout ist nicht verfügbar, bis Preise, Verfügbarkeit und Lieferbedingungen bestätigt sind.',
    basis: 'Berechnet nach Warenrabatten. Nur für Produkte ohne Tabak.',
    invalid: 'Die Lieferberechnung ist nicht verfügbar. Bitte prüfen Sie Ihren Warenkorb.',
  },
  fr: {
    announcement: 'Livraison offerte dès CHF 100 d’achat.',
    scope: 'Alimentation, thé, cadeaux et produits lifestyle · Livraison standard en Suisse',
    product: 'Livraison standard gratuite en Suisse dès CHF 100',
    progress: 'Ajoutez encore {amount} pour la livraison gratuite.',
    unlocked: 'Vous bénéficiez de la livraison gratuite.',
    heading: 'Livraison standard', country: 'Destination de livraison', swiss: 'Suisse', international: 'Hors de Suisse',
    abroad: 'Cette offre concerne uniquement la livraison standard en Suisse. La livraison internationale est indisponible.',
    pending: 'Les frais de livraison standard s’appliquent. Leur montant reste à confirmer.',
    disabled: 'Le paiement reste indisponible jusqu’à la confirmation des prix, de la disponibilité et des modalités de livraison.',
    basis: 'Calcul après les remises sur les marchandises. Produits sans tabac uniquement.',
    invalid: 'L’estimation de livraison est indisponible. Veuillez vérifier votre panier.',
  },
};
