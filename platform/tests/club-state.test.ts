import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountStates,
  membershipStates,
  verificationDestination,
} from "../src/lib/club-state";
import { vt } from "../src/lib/verification-copy";
for (const locale of ["de", "fr", "en"] as const) {
  test(`${locale}: all account states route independently from membership`, () => {
    for (const state of accountStates) {
      const dest = verificationDestination(locale, state);
      assert.ok(dest.startsWith(`/${locale}/`));
      assert.equal(
        dest.endsWith("/club/collection"),
        state === "verified_18_plus",
      );
      assert.ok(vt(locale, state).length > 0);
    }
    for (const state of membershipStates)
      assert.ok(vt(locale, state).length > 0);
    assert.equal(
      verificationDestination(locale, "verification_pending"),
      `/${locale}/verification-pending`,
    );
    assert.equal(
      verificationDestination(locale, "suspended"),
      `/${locale}/verification-result`,
    );
  });
}
