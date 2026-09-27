import "server-only";
import type { Locale } from "./domain";

type CollectionCopy = {
  title: string;
  eyebrow: string;
  introduction: string;
  status: string;
  adults: string;
  presented: string;
  gallery: string;
  previous: string;
  next: string;
  view: string;
  closed: string;
  open: string;
  closedAlt: string;
  openAlt: string;
  revealLabel: string;
  revealTitle: string;
  revealText: string;
  craftTitle: string;
  craftText: string;
  presentationTitle: string;
  presentationText: string;
  storageTitle: string;
  storageText: string;
  responsibleTitle: string;
  responsibleText: string;
  informationLink: string;
  informationUrl: string;
};

export const collectionCopy: Record<Locale, CollectionCopy> = {
  de: {
    title: "VARATHANS CIGAR COLLECTION · 18+",
    eyebrow: "Eine Verpackungsstudie",
    introduction:
      "Elfenbeinfarbene Flächen, eine marineblaue Banderole und das vertraute Varathans25-Zeichen. Diese Konzeptbilder zeigen die geschlossene und die geöffnete Form einer Verpackung für vier Zigarren.",
    status: "Verpackungskonzept — kommerzielle Verfügbarkeit noch offen.",
    adults:
      "Nur für Erwachsene ab 18 Jahren. Diese Seite dokumentiert ein Verpackungskonzept.",
    presented: "Präsentiert von Varathans25 in der Schweiz.",
    gallery: "Zwei Ansichten des Verpackungskonzepts",
    previous: "Vorherige Ansicht",
    next: "Nächste Ansicht",
    view: "Ansicht",
    closed: "Geschlossene Box",
    open: "Geöffnete Box",
    closedAlt:
      "Geschlossene elfenbeinfarbene Varathans25-Box mit marineblauer Banderole und dem ursprünglichen weinrot-goldfarbenen Zeichen.",
    openAlt:
      "Geöffnete elfenbeinfarbene Varathans25-Box mit marineblauem Inneren, ausklappbaren Seiten und vier parallel angeordneten Zigarren.",
    revealLabel: "Die geöffnete Form",
    revealTitle: "Ein Format für vier Zigarren.",
    revealText:
      "Die geöffnete Konzeptansicht zeigt vier nebeneinanderliegende Positionen. Seitliche Flächen klappen nach aussen und geben den Blick auf die marineblaue Innenfläche frei.",
    craftTitle: "Gestaltung & Ausführung",
    craftText:
      "Die Bilder zeigen eine strukturierte, elfenbeinfarbene Oberfläche und eine abnehmbare marineblaue Banderole. Materialien, Fertigungsverfahren und Hersteller sind noch nicht bestätigt; die Darstellung ist keine Produktionsspezifikation.",
    presentationTitle: "Die Varathans-Identität",
    presentationText:
      "Das bestehende Varathans25-Zeichen bleibt unverändert. Weinrot und Gold stehen neben Elfenbein und Marineblau. Die Präsentation in der Schweiz ist keine Aussage über den Herstellungsort der Verpackung oder des Tabaks.",
    storageTitle: "Hinweise zur Aufbewahrung",
    storageText:
      "Das Verpackungskonzept ist nicht als Humidor oder als Behälter zur Feuchtigkeitsregelung bestätigt. Massgeblich sind die bestätigten Lagerhinweise des jeweiligen Herstellers, sobald diese vorliegen. Tabak ausser Reichweite von Kindern aufbewahren.",
    responsibleTitle: "Verantwortungsvolle Tabakinformation",
    responsibleText:
      "Diese Darstellung richtet sich ausschliesslich an Erwachsene ab 18 Jahren. Tabak enthält Nikotin, das abhängig macht. Rauchen schädigt die Gesundheit. Die Bilder dokumentieren die Verpackung und machen keine Aussagen über Herkunft, Mischung, Stärke oder Geschmack des Tabaks.",
    informationLink: "Informationen des Bundesamts für Gesundheit zu Tabak",
    informationUrl: "https://www.bag.admin.ch/de/tabak-und-tabakpraevention",
  },
  fr: {
    title: "VARATHANS CIGAR COLLECTION · 18+",
    eyebrow: "Une étude de packaging",
    introduction:
      "Des surfaces ivoire, un bandeau bleu marine et l’identité visuelle Varathans25. Ces images de concept présentent les formes fermée et ouverte d’un emballage pour quatre cigares.",
    status: "Concept d’emballage — disponibilité commerciale en attente.",
    adults:
      "Réservé aux adultes de 18 ans et plus. Cette page documente un concept d’emballage.",
    presented: "Présenté par Varathans25 en Suisse.",
    gallery: "Deux vues du concept d’emballage",
    previous: "Vue précédente",
    next: "Vue suivante",
    view: "Vue",
    closed: "Coffret fermé",
    open: "Coffret ouvert",
    closedAlt:
      "Coffret Varathans25 fermé, de couleur ivoire, avec un bandeau bleu marine et le logo original bordeaux et doré.",
    openAlt:
      "Coffret Varathans25 ouvert, ivoire et bleu marine, avec des panneaux latéraux dépliés et quatre cigares disposés parallèlement.",
    revealLabel: "La forme ouverte",
    revealTitle: "Un format pour quatre cigares.",
    revealText:
      "La vue ouverte du concept présente quatre emplacements côte à côte. Les panneaux latéraux se déplient vers l’extérieur et révèlent la surface intérieure bleu marine.",
    craftTitle: "Conception & réalisation",
    craftText:
      "Les images montrent une surface ivoire d’aspect texturé et un bandeau bleu marine amovible. Les matériaux, le procédé de fabrication et le fabricant ne sont pas encore confirmés ; cette représentation n’est pas une fiche de production.",
    presentationTitle: "L’identité Varathans",
    presentationText:
      "Le logo Varathans25 existant reste inchangé. Le bordeaux et le doré côtoient l’ivoire et le bleu marine. La présentation en Suisse ne constitue pas une indication du lieu de fabrication de l’emballage ou du tabac.",
    storageTitle: "Conseils de conservation",
    storageText:
      "Ce concept d’emballage n’est pas confirmé comme cave à cigares ou dispositif de régulation de l’humidité. Seules les consignes de conservation validées par le fabricant concerné feront référence, une fois disponibles. Garder le tabac hors de portée des enfants.",
    responsibleTitle: "Information responsable sur le tabac",
    responsibleText:
      "Cette présentation s’adresse exclusivement aux adultes de 18 ans et plus. Le tabac contient de la nicotine, qui crée une dépendance. Fumer nuit à la santé. Ces images documentent l’emballage sans décrire l’origine, le mélange, la force ou le goût du tabac.",
    informationLink:
      "Informations de l’Office fédéral de la santé publique sur le tabac",
    informationUrl:
      "https://www.bag.admin.ch/fr/politique-suisse-en-matiere-de-tabac",
  },
  en: {
    title: "VARATHANS CIGAR COLLECTION · 18+",
    eyebrow: "A packaging study",
    introduction:
      "Ivory surfaces, a navy band and the familiar Varathans25 identity. These concept images document the closed and open forms of a four-cigar package.",
    status: "Packaging concept — commercial availability pending.",
    adults: "For adults aged 18+. This page documents a packaging concept.",
    presented: "Presented by Varathans25 in Switzerland.",
    gallery: "Two views of the packaging concept",
    previous: "Previous view",
    next: "Next view",
    view: "View",
    closed: "Closed box",
    open: "Open box",
    closedAlt:
      "Closed ivory Varathans25 box with a navy band and the original maroon and gold-coloured mark.",
    openAlt:
      "Open ivory Varathans25 box with a navy interior, unfolded side panels and four cigars arranged in parallel.",
    revealLabel: "The open form",
    revealTitle: "A format for four cigars.",
    revealText:
      "The open concept view shows four positions side by side. The side panels unfold outwards to reveal the navy interior surface.",
    craftTitle: "Design & craftsmanship",
    craftText:
      "The images show a textured-looking ivory surface and a removable navy band. Materials, manufacturing methods and the manufacturer are not yet confirmed; this representation is not a production specification.",
    presentationTitle: "The Varathans identity",
    presentationText:
      "The existing Varathans25 mark remains unchanged. Maroon and gold sit alongside ivory and navy. Presentation in Switzerland makes no claim about where the packaging or tobacco is manufactured.",
    storageTitle: "Storage guidance",
    storageText:
      "This packaging concept is not confirmed as a humidor or humidity-control container. Follow the relevant manufacturer’s verified storage guidance when it becomes available. Keep tobacco out of reach of children.",
    responsibleTitle: "Responsible tobacco information",
    responsibleText:
      "This presentation is intended only for adults aged 18+. Tobacco contains nicotine, which is addictive. Smoking harms health. These images document the packaging without making claims about the tobacco’s origin, blend, strength or taste.",
    informationLink: "Federal Office of Public Health information on tobacco",
    informationUrl: "https://www.bag.admin.ch/de/tabak-und-tabakpraevention",
  },
};
