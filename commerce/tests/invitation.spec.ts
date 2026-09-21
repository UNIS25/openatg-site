import { test, expect } from "./browser-fixture";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (env.SUPABASE_URL !== "http://127.0.0.1:57431")
  throw Error("Local invitation tests only");
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
test("invitation callback sets a password and grants only the invited role", async ({
  page,
}) => {
  const email = `browser-invite-${randomBytes(8).toString("hex")}@example.invalid`,
    password = `Aa9!${randomBytes(20).toString("base64url")}`;
  const { data, error } = await service.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: "http://127.0.0.1:4175/adminpage/" },
  });
  expect(error).toBeNull();
  expect(data?.user).toBeTruthy();
  if (!data.user || !data.properties)
    throw new Error("Invitation fixture failed");
  const result = await service
    .from("v25_profiles")
    .insert({ id: data.user.id, role: "product_editor" });
  expect(result.error).toBeNull();
  await page.goto(data.properties.action_link);
  await page
    .locator(".language-selector")
    .getByRole("button", { name: "EN", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Set your password" }),
  ).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Save password", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Orders", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "General settings", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Access", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
});
