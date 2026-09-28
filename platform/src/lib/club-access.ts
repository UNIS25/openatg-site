import "server-only";
import { identity } from "./server";

/** Re-read database authorization for every restricted page, data and media request. */
export async function verifiedClubSession() {
  const session = await identity();
  if (
    session.identity.account_state !== "verified_18_plus" ||
    !session.identity.verified
  )
    throw new Error("Not authorized");
  return session;
}
