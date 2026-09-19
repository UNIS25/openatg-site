/** Reject secret keys before a build or browser client can use public config. */
export function assertPublicKey(key: string): void {
  if (key.startsWith("sb_publishable_")) return;
  if (key.startsWith("sb_secret_"))
    throw new Error("A secret key cannot be used in browser configuration.");
  try {
    const payload = JSON.parse(
      atob(key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
    );
    if (payload.role === "anon") return;
  } catch {
    /* Reject malformed keys without echoing their value. */
  }
  throw new Error("Expected a Supabase publishable key or anon JWT.");
}
