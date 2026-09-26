import "server-only";
export function config() {
  const env = process.env;
  const local =
    env.PLATFORM_ENV === "local" &&
    env.APP_ORIGIN === "http://127.0.0.1:4190" &&
    env.SUPABASE_URL === "http://127.0.0.1:58531";
  const flags = [
    "PRODUCTION_WRITES_ENABLED",
    "CIGAR_CHECKOUT_ENABLED",
    "LIVE_PAYMENTS_ENABLED",
    "SUBSCRIPTIONS_ENABLED",
  ];
  if (flags.some((k) => env[k] !== "false"))
    throw new Error("Unsafe feature flag configuration");
  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_ANON_KEY ||
    !env.SUPABASE_SERVICE_ROLE_KEY ||
    !env.PASS_SIGNING_KEY ||
    !env.RATE_LIMIT_KEY ||
    !env.WEBHOOK_SIGNING_KEY
  )
    throw new Error("Server configuration incomplete");
  if (!local && env.AGE_VERIFICATION_MODE === "test")
    throw new Error("Test adapters cannot run on hosted environments");
  if (
    [env.PASS_SIGNING_KEY, env.RATE_LIMIT_KEY, env.WEBHOOK_SIGNING_KEY].some(
      (value) => value.length < 32,
    )
  )
    throw new Error("Signing keys must contain at least 32 characters");
  const origin = new URL(env.APP_ORIGIN!);
  const backend = new URL(env.SUPABASE_URL);
  if (
    origin.origin !== env.APP_ORIGIN ||
    (!local && (origin.protocol !== "https:" || backend.protocol !== "https:"))
  )
    throw new Error("Exact HTTPS origins required");
  return {
    local,
    origin: env.APP_ORIGIN!,
    url: env.SUPABASE_URL,
    key: env.SUPABASE_ANON_KEY,
    service: env.SUPABASE_SERVICE_ROLE_KEY,
    passKey: env.PASS_SIGNING_KEY,
    rateKey: env.RATE_LIMIT_KEY,
    webhookKey: env.WEBHOOK_SIGNING_KEY,
  };
}
export function requireLocal() {
  if (!config().local) throw new Error("Writes disabled");
}
