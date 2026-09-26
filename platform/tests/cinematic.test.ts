import { test } from "node:test";
import assert from "node:assert/strict";
import {
  motionPermitted,
  invitationPage,
  invitationScheduled,
  editorialSchema,
  defaultEditorial,
} from "../src/lib/cinematic";
import { cinematicCopy } from "../src/lib/cinematic-copy";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
test("data, motion and battery preferences override autoplay", () => {
  const base = { reduced: false, mobile: false };
  assert.equal(motionPermitted(base), true);
  for (const override of [
    { reduced: true },
    { mobile: true },
    { saveData: true },
    { effectiveType: "2g" },
    { effectiveType: "3g" },
    { lowBattery: true },
  ])
    assert.equal(motionPermitted({ ...base, ...override }), false);
});
test("invitation never targets entrance, accounts, administration or shopping bag", () => {
  for (const page of [
    "entrance",
    "register",
    "login",
    "reset",
    "bag",
    "account",
    "admin",
    "membership",
    "privacy",
  ])
    assert.equal(invitationPage(page), false);
  assert.equal(invitationPage(""), true);
});
test("invitation schedule is inclusive at start and exclusive at end", () => {
  const config = {
    ...defaultEditorial,
    invitation_start: "2026-09-27T00:00:00.000Z",
    invitation_end: "2026-09-28T00:00:00.000Z",
  };
  assert.equal(
    invitationScheduled(config, Date.parse(config.invitation_start)),
    true,
  );
  assert.equal(
    invitationScheduled(config, Date.parse(config.invitation_end)),
    false,
  );
  assert.equal(
    invitationScheduled(
      { ...config, invitation_enabled: false },
      Date.parse(config.invitation_start),
    ),
    false,
  );
});
test("editorial rejects early timers, unknown films, repeated chapters and reversed schedules", () => {
  for (const patch of [
    { invitation_delay_ms: 1 },
    { active_film: "https://third-party.example/video.mp4" },
    { chapter_order: ["tea", "tea", "spice", "restaurant"] },
    {
      invitation_start: "2026-09-28T00:00:00Z",
      invitation_end: "2026-09-27T00:00:00Z",
    },
  ])
    assert.equal(
      editorialSchema.safeParse({ ...defaultEditorial, ...patch }).success,
      false,
    );
});
test("cinematic copy has DE FR EN values and explicit non-verification language", () => {
  for (const values of Object.values(cinematicCopy))
    for (const value of values) assert.ok(value.trim());
  assert.match(cinematicCopy.popupFooter[2], /do not verify age/);
  assert.match(cinematicCopy.eveningText[2], /strictly editorial/);
});
test("shipped motion study has no audio and uses approved local source paths", () => {
  for (const name of [
    "daylight-study-1280.mp4",
    "daylight-study-960.mp4",
    "daylight-study-1280.webm",
  ]) {
    const result = JSON.parse(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "stream=codec_type",
          "-of",
          "json",
          `public/varathans25/media/${name}`,
        ],
        { encoding: "utf8" },
      ),
    );
    assert.equal(result.streams.length, 1);
    assert.equal(result.streams[0].codec_type, "video");
  }
  const script = readFileSync("scripts/cinematic-media.mjs", "utf8");
  assert.doesNotMatch(script, /youtube\.com|zinodavidoff\.com|https?:\/\//);
});
