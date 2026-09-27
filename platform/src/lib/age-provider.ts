import "server-only";
import { randomUUID } from "node:crypto";
import { config } from "./config";
export interface AgeProviderSession {
  reference: string;
  method: "local-review" | "provider";
  mode: "test" | "production";
}
export interface AgeProviderDecision {
  reference: string;
  status: "verified" | "rejected" | "pending";
  ageThreshold: 18 | null;
  decidedAt: string;
  expiresAt: string | null;
}
export interface AgeProvider {
  createSession(userId: string): Promise<AgeProviderSession>;
  verifyDecision(
    raw: Uint8Array,
    signature: string,
  ): Promise<AgeProviderDecision>;
}
class LocalReviewProvider implements AgeProvider {
  async createSession(): Promise<AgeProviderSession> {
    return {
      reference: `local-review-${randomUUID()}`,
      method: "local-review",
      mode: "test",
    };
  }
  async verifyDecision(): Promise<AgeProviderDecision> {
    throw new Error("Independent administrator review required");
  }
}
// A concrete, approved provider must implement signature, audience, replay and expiry validation.
// Configuring a provider name or credentials alone never approves a user.
class UnavailableProductionProvider implements AgeProvider {
  async createSession(): Promise<AgeProviderSession> {
    throw new Error("Approved age provider unavailable");
  }
  async verifyDecision(): Promise<AgeProviderDecision> {
    throw new Error("Approved age provider unavailable");
  }
}
export function ageProvider(): AgeProvider {
  const c = config();
  if (c.local && process.env.AGE_VERIFICATION_MODE === "test")
    return new LocalReviewProvider();
  if (
    process.env.AGE_VERIFICATION_PROVIDER &&
    process.env.AGE_VERIFICATION_API_KEY &&
    process.env.AGE_VERIFICATION_WEBHOOK_SECRET
  )
    return new UnavailableProductionProvider();
  return new UnavailableProductionProvider();
}
