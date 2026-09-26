import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const base = {
  ...process.env,
  PLATFORM_ENV: "local",
  APP_ORIGIN: "http://127.0.0.1:4190",
  SUPABASE_URL: "http://127.0.0.1:58531",
  SUPABASE_ANON_KEY: "unit-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "unit-placeholder",
  PASS_SIGNING_KEY: "unit-placeholder-key-long-enough-32",
  RATE_LIMIT_KEY: "unit-placeholder-key-long-enough-32",
  WEBHOOK_SIGNING_KEY: "unit-placeholder-key-long-enough-32",
  PRODUCTION_WRITES_ENABLED: "false",
  CIGAR_CHECKOUT_ENABLED: "false",
  LIVE_PAYMENTS_ENABLED: "false",
  SUBSCRIPTIONS_ENABLED: "false",
  AGE_VERIFICATION_MODE: "test",
};
function valid(overrides: Record<string, string> = {}) {
  return (
    spawnSync(
      process.execPath,
      [
        "--conditions=react-server",
        "--import",
        "tsx",
        "-e",
        "import('./src/lib/config.ts').then(m=>m.config())",
      ],
      { env: { ...base, ...overrides }, stdio: "ignore" },
    ).status === 0
  );
}
test("exact local test configuration is accepted", () =>
  assert.equal(valid(), true));
test("test verification cannot run on hosted origin", () =>
  assert.equal(
    valid({
      PLATFORM_ENV: "staging",
      APP_ORIGIN: "https://review.example",
      SUPABASE_URL: "https://example.supabase.co",
    }),
    false,
  ));
test("each production feature flag fails closed", () => {
  for (const key of [
    "PRODUCTION_WRITES_ENABLED",
    "CIGAR_CHECKOUT_ENABLED",
    "LIVE_PAYMENTS_ENABLED",
    "SUBSCRIPTIONS_ENABLED",
  ])
    assert.equal(valid({ [key]: "true" }), false, key);
});
test("weak signing key and non-HTTPS hosted origin are rejected", () => {
  assert.equal(valid({ PASS_SIGNING_KEY: "short" }), false);
  assert.equal(
    valid({
      PLATFORM_ENV: "staging",
      APP_ORIGIN: "http://review.example",
      AGE_VERIFICATION_MODE: "disabled",
    }),
    false,
  );
});
