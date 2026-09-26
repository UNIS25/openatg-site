import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function issuePass(key: string) {
  const opaque = randomBytes(32).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(opaque)
    .digest("base64url");
  return `${opaque}.${signature}`;
}
export function passHash(token: string, key: string) {
  if (!/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(token))
    throw new Error("Pass invalid");
  const [opaque, sig] = token.split(".");
  const expected = createHmac("sha256", key).update(opaque).digest("base64url");
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    throw new Error("Pass invalid");
  return hash(token);
}
export function verifyWebhook(
  raw: string,
  timestamp: string,
  signature: string,
  key: string,
  now = Date.now(),
) {
  if (
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !/^sha256=[a-f0-9]{64}$/.test(signature)
  )
    throw new Error("Invalid signature");
  const expected = createHmac("sha256", key)
    .update(`${timestamp}.${raw}`)
    .digest("hex");
  if (!timingSafeEqual(Buffer.from(signature.slice(7)), Buffer.from(expected)))
    throw new Error("Invalid signature");
}
export interface AgeVerificationAdapter {
  mode: "test" | "production";
  verify(reference: string): Promise<{
    provider_reference: string;
    status: "pending" | "verified" | "rejected" | "expired" | "manual_review";
    verified_at: string | null;
    expires_at: string | null;
  }>;
}
export class LocalAgeAdapter implements AgeVerificationAdapter {
  mode = "test" as const;
  async verify(reference: string) {
    const status =
      reference === "adult"
        ? "verified"
        : reference === "underage"
          ? "rejected"
          : reference === "expired"
            ? "expired"
            : reference === "review"
              ? "manual_review"
              : "pending";
    return {
      provider_reference: `local-test-${hash(reference).slice(0, 20)}`,
      status: status as
        "verified" | "rejected" | "expired" | "manual_review" | "pending",
      verified_at:
        status === "verified" ? new Date("2026-01-01").toISOString() : null,
      expires_at:
        status === "verified" ? new Date("2030-01-01").toISOString() : null,
    };
  }
}
