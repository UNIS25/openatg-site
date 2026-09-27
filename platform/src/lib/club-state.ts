import type { Locale } from "./domain";
export const accountStates = [
  "guest",
  "registered_unverified",
  "verification_pending",
  "verified_18_plus",
  "verification_rejected",
  "verification_expired",
  "suspended",
] as const;
export type ClubAccountState = (typeof accountStates)[number];
export const membershipStates = [
  "none",
  "silver",
  "gold",
  "gold_past_due",
  "gold_cancelled",
  "membership_suspended",
] as const;
export type ClubMembershipState = (typeof membershipStates)[number];
export function verificationDestination(
  locale: Locale,
  state: ClubAccountState,
) {
  return `/${locale}/${state === "guest" ? "login" : state === "verified_18_plus" ? "club/collection" : state === "verification_pending" ? "verification-pending" : state === "registered_unverified" || state === "verification_expired" ? "verify-age" : "verification-result"}`;
}
