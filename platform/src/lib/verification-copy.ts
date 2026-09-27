import type { Locale } from "./domain";
const copy = {
  title: [
    "Ihr Zugang. Sicher geprüft.",
    "Votre accès. Vérifié en sécurité.",
    "Your access. Securely verified.",
  ],
  intro: [
    "Konto, Altersprüfung und Mitgliedschaft sind getrennte Schritte. Eine Anmeldung oder ein 18+-Häkchen bestätigt weder Identität noch Alter.",
    "Compte, vérification d’âge et adhésion sont des étapes distinctes. Une connexion ou une case 18+ ne confirme ni l’identité ni l’âge.",
    "Account, age verification and membership are separate steps. Signing in or checking an 18+ box verifies neither identity nor age.",
  ],
  test: [
    "Lokale Testprüfung · Keine echte Identitätsprüfung. Es werden keine Ausweisdokumente oder Geburtsdaten erhoben. Eine unabhängige administrative Entscheidung ist erforderlich.",
    "Vérification de test locale · Aucune vérification réelle d’identité. Aucun document d’identité ni date de naissance n’est recueilli. Une décision administrative indépendante est requise.",
    "Local test verification · Not a real identity check. No identity documents or dates of birth are collected. An independent administrator decision is required.",
  ],
  submit: [
    "Testprüfung beantragen",
    "Demander la vérification de test",
    "Submit test verification",
  ],
  pendingTitle: [
    "Ihre Prüfung ist in Bearbeitung.",
    "Votre vérification est en cours.",
    "Your verification is pending.",
  ],
  pendingText: [
    "Ihr Antrag wurde eingereicht. Der geschützte Bereich bleibt bis zur Entscheidung gesperrt. Diese Seite prüft den Status automatisch.",
    "Votre demande a été transmise. L’espace protégé reste fermé jusqu’à la décision. Cette page actualise automatiquement le statut.",
    "Your application was submitted. The restricted area stays locked until a decision. This page checks the status automatically.",
  ],
  check: ["Status prüfen", "Vérifier le statut", "Check status"],
  result: [
    "Ergebnis Ihrer Prüfung",
    "Résultat de votre vérification",
    "Your verification result",
  ],
  resubmit: [
    "Erneut zur Prüfung einreichen",
    "Soumettre à nouveau",
    "Resubmit for review",
  ],
  rejectedText: [
    "Die Prüfung wurde nicht bestätigt. Sie können eine neue Prüfung beantragen oder sich an das Varathans25-Team wenden.",
    "La vérification n’a pas été confirmée. Vous pouvez soumettre une nouvelle demande ou contacter l’équipe Varathans25.",
    "Verification was not confirmed. You can submit again or contact the Varathans25 team.",
  ],
  expiredText: [
    "Ihre Altersverifizierung ist abgelaufen. Eine neue Prüfung ist erforderlich.",
    "Votre vérification d’âge a expiré. Une nouvelle vérification est nécessaire.",
    "Your age verification has expired. A new review is required.",
  ],
  suspendedText: [
    "Der geschützte Zugang ist gesperrt. Wenden Sie sich zur Klärung an das Varathans25-Team. Eine erneute Anmeldung hebt die Sperre nicht auf.",
    "L’accès protégé est suspendu. Contactez l’équipe Varathans25. Une nouvelle connexion ne lève pas la suspension.",
    "Restricted access is suspended. Contact the Varathans25 team. Signing in again does not lift the suspension.",
  ],
  account: ["Kontoeinstellungen", "Paramètres du compte", "Account settings"],
  collection: [
    "Geschützte Sammlung",
    "Collection protégée",
    "Restricted collection",
  ],
  dashboard: [
    "Mitgliederübersicht",
    "Tableau de bord membre",
    "Member dashboard",
  ],
  choose: [
    "Mitgliedschaft wählen",
    "Choisir une adhésion",
    "Choose membership",
  ],
  benefits: [
    "Leistungen gelten ausschliesslich für berechtigte Nicht-Tabakprodukte und Dienstleistungen. Keine Tabakrabatte oder Tabakbestellungen.",
    "Les prestations s’appliquent uniquement aux produits hors tabac et services éligibles. Aucune remise ni commande de tabac.",
    "Benefits apply only to eligible non-tobacco products and services. No tobacco discounts or ordering.",
  ],
  payment: [
    "Mitgliedschaftszahlungen sind ausschliesslich lokale Tests. Es wird kein echtes Geld eingezogen.",
    "Les paiements d’adhésion sont uniquement des tests locaux. Aucun argent réel n’est prélevé.",
    "Membership payments are local tests only. No real money is collected.",
  ],
  verificationAdmin: [
    "Altersprüfungen verwalten",
    "Gérer les vérifications d’âge",
    "Manage age verification",
  ],
  reference: [
    "Anbieterreferenz",
    "Référence du prestataire",
    "Provider reference",
  ],
  method: ["Prüfmethode", "Méthode de vérification", "Verification method"],
  submitted: ["Eingereicht", "Soumise", "Submitted"],
  decision: ["Entscheidung", "Décision", "Decision"],
  reason: [
    "Nicht-sensitiver Entscheidungsgrund",
    "Motif non sensible de la décision",
    "Non-sensitive decision reason",
  ],
  approve: [
    "Testprüfung bestätigen",
    "Approuver la vérification de test",
    "Approve test verification",
  ],
  reject: ["Ablehnen", "Refuser", "Reject"],
  resubmitDecision: [
    "Neue Einreichung anfordern",
    "Demander une nouvelle soumission",
    "Request resubmission",
  ],
  revoke: [
    "Verifizierung widerrufen",
    "Révoquer la vérification",
    "Revoke verification",
  ],
  expire: ["Als abgelaufen markieren", "Marquer comme expirée", "Mark expired"],
  suspend: [
    "Kontozugang sperren",
    "Suspendre l’accès au compte",
    "Suspend account access",
  ],
  review: [
    "Entscheidung speichern",
    "Enregistrer la décision",
    "Save decision",
  ],
  history: [
    "Prüfverlauf",
    "Historique des vérifications",
    "Verification history",
  ],
  mfaPolicy: [
    "MFA für alle Administratoren verlangen",
    "Exiger la MFA pour tous les administrateurs",
    "Require MFA for all administrators",
  ],
  noApplications: [
    "Keine Prüfungen vorhanden.",
    "Aucune vérification disponible.",
    "No verification applications.",
  ],
  status: ["Prüfstatus", "Statut de vérification", "Verification status"],
  memberStatus: [
    "Mitgliedschaftsstatus",
    "Statut d’adhésion",
    "Membership status",
  ],
  localReview: [
    "Lokale administrative Testprüfung",
    "Examen administratif de test local",
    "Local administrator test review",
  ],
  legacyTest: [
    "Bestehender lokaler Testdatensatz",
    "Dossier de test local existant",
    "Existing local test record",
  ],
  provider: [
    "Externer Prüfdienst",
    "Prestataire de vérification externe",
    "External verification provider",
  ],
  testBadge: ["TEST · lokal", "TEST · local", "TEST · local"],
  guest: ["Gast", "Visiteur", "Guest"],
  registered_unverified: [
    "Registriert · nicht verifiziert",
    "Inscrit · non vérifié",
    "Registered · unverified",
  ],
  verification_pending: [
    "Prüfung ausstehend",
    "Vérification en attente",
    "Verification pending",
  ],
  verified_18_plus: ["Verifiziert 18+", "Vérifié 18+", "Verified 18+"],
  verification_rejected: [
    "Prüfung nicht bestätigt",
    "Vérification non confirmée",
    "Verification not confirmed",
  ],
  verification_expired: [
    "Verifizierung abgelaufen",
    "Vérification expirée",
    "Verification expired",
  ],
  suspended: ["Zugang gesperrt", "Accès suspendu", "Access suspended"],
  none: [
    "Keine aktive Mitgliedschaft",
    "Aucune adhésion active",
    "No active membership",
  ],
  silver: ["Silver", "Silver", "Silver"],
  gold: ["Gold", "Gold", "Gold"],
  gold_past_due: [
    "Gold · Zahlung ausstehend",
    "Gold · paiement en retard",
    "Gold · past due",
  ],
  gold_cancelled: ["Gold · beendet", "Gold · résilié", "Gold · cancelled"],
  membership_suspended: [
    "Mitgliedschaft gesperrt",
    "Adhésion suspendue",
    "Membership suspended",
  ],
  age_confirmed: [
    "Altersgrenze im Test bestätigt",
    "Seuil d’âge confirmé en test",
    "Test age threshold confirmed",
  ],
  age_not_confirmed: [
    "Altersgrenze nicht bestätigt",
    "Seuil d’âge non confirmé",
    "Age threshold not confirmed",
  ],
  evidence_incomplete: [
    "Prüfnachweis unvollständig",
    "Éléments de vérification incomplets",
    "Verification evidence incomplete",
  ],
  expired: ["Gültigkeit abgelaufen", "Validité expirée", "Validity expired"],
  access_revoked: ["Zugang widerrufen", "Accès révoqué", "Access revoked"],
  account_suspended: ["Konto gesperrt", "Compte suspendu", "Account suspended"],
} as const;
export type VerificationKey = keyof typeof copy;
export const vt = (locale: Locale, key: VerificationKey) =>
  copy[key][{ de: 0, fr: 1, en: 2 }[locale]];
