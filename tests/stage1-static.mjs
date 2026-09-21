import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routes = ["/", "/store/", "/store/base-32m/", "/store/base-64m/"];
const origin = "https://openatg.com";
const filename = (pathname) => path.join(root, pathname.endsWith("/") ? pathname + "index.html" : pathname);
const references = new Set();
for (const route of routes) {
  const html = await readFile(filename(route), "utf8");
  assert.match(html, /<html lang="en">/);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, route);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "No duplicate element IDs");
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = new URL(match[1], origin + route);
    if (url.origin !== origin) continue;
    assert.ok((await stat(filename(url.pathname))).isFile(), url.pathname);
    references.add(url.pathname);
    if (url.hash) {
      const target = await readFile(filename(url.pathname), "utf8");
      assert.ok(target.includes('id="' + decodeURIComponent(url.hash.slice(1)) + '"'), url.href);
    }
  }
}
const home = await readFile(filename("/"), "utf8");
const milestone = await readFile(filename("/store/base-64m/"), "utf8");
const catalogue = JSON.parse(await readFile(path.join(root, "store/catalog.json"), "utf8"));
const entry = catalogue.items.find(item => item.id === "atg-base-64m");
assert.deepEqual(Object.keys(entry).sort(), [
  "action", "category", "description", "id", "name", "privacy", "status", "type", "typeLabel", "version",
].sort());
assert.equal(entry.action.path, "/store/base-64m/");
assert.equal(entry.action.label, "Explore the milestone");
assert.match(home, /id="model-evolution"/);
assert.match(milestone, /Distribution review in progress/);
assert.match(milestone, /Not instruction-tuned/);
assert.doesNotMatch(milestone, /<a\b[^>]*\sdownload(?:\s|=|>)|\.atgckpt|perplexity|independent post-training validation/i);
const validation = milestone.match(/<section[^>]+id="public-validation"[\s\S]*?<\/section>/)[0];
assert.doesNotMatch(validation.replace(/<[^>]*>/g, ""), /[0-9]/);
const status = milestone.match(/<aside[^>]+id="model-artifact"[\s\S]*?<\/aside>/)[0];
assert.doesNotMatch(status, /<a\b|<button\b|href=|tabindex=|onclick=/);
const projects = home.match(/<section[^>]+id="upcoming-projects"[\s\S]*?<\/section>/)[0];
assert.equal([...projects.matchAll(/<article\b/g)].length, 3);
assert.doesNotMatch(projects, /<a\b|<button\b|href=|onclick=|https?:\/\//);
for (const source of [home, milestone, JSON.stringify(entry)]) {
  assert.doesNotMatch(source, /\/Users\/|\/teamspace\/|\/private\/|s_01m2|BEGIN [A-Z ]*PRIVATE KEY/);
  assert.doesNotMatch(source, /public_inference_artifact_sha256|public_tokenizer_sha256|public_licence|public_validation_result/);
}
assert.doesNotMatch(milestone, /first LLM|first ever|best Sri Lankan|government deployed|no recovery retries/i);
console.log(JSON.stringify({ status: "pass", pages: routes.length, localResources: references.size,
  anchors: "valid", stage1Boundary: "pass", upcomingProjects: "three non-interactive cards" }));
