import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const XLSX = require("../../signal/vendor/xlsx.full.min.js");
const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures");
const topRoot = path.join(fixtureRoot, "top");
const comparisonRoot = path.join(fixtureRoot, "comparison");

await mkdir(topRoot, { recursive: true });
await mkdir(comparisonRoot, { recursive: true });

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function writeCsv(filename, rows, encoding = "utf8") {
  const headers = Object.keys(rows[0]);
  const lines = [headers, ...rows.map((row) => headers.map((header) => row[header]))]
    .map((line) => line.map(csvCell).join(","))
    .join("\n");
  await writeFile(filename, Buffer.from(`${lines}\n`, encoding));
}

async function writeWorkbook(filename, sheets, bookType = "xlsx") {
  const workbook = XLSX.utils.book_new();
  for (const [name, sheet] of sheets) XLSX.utils.book_append_sheet(workbook, sheet, name);
  const bytes = XLSX.write(workbook, { bookType, type: "buffer" });
  await writeFile(filename, bytes);
}

function sheetWithMetadata(rows, metadata = "Synthetic export — no real organizational data") {
  const headers = Object.keys(rows[0]);
  return XLSX.utils.aoa_to_sheet([
    [metadata],
    headers,
    ...rows.map((row) => headers.map((header) => row[header])),
  ]);
}

const topFixtures = {
  "X English": {
    filename: "x-english.csv",
    rows: [
      { Date: "2026-08-09", "Post text": "Outside early", Link: "https://example.test/x-en/early", Impressions: 9000, Engagements: 999, Likes: 900, Replies: 50, Reposts: 49 },
      { Date: "2026-08-10", "Post text": "Campaign launch", Link: "https://example.test/x-en/launch", Impressions: 1200, Engagements: 45, Likes: 30, Replies: 8, Reposts: 7 },
      { Date: "2026-08-11", "Post text": "Field update", Link: "https://example.test/x-en/field", Impressions: 2200, Engagements: 120, Likes: 95, Replies: 15, Reposts: 10 },
      { Date: "2026-08-12", "Post text": "Community story", Link: "https://example.test/x-en/community", Impressions: 1800, Engagements: 88, Likes: 70, Replies: 10, Reposts: 8 },
      { Date: "2026-08-13", "Post text": "Policy explainer", Link: "https://example.test/x-en/policy", Impressions: 3100, Engagements: 150, Likes: 120, Replies: 18, Reposts: 12 },
      { Date: "2026-08-17", "Post text": "Outside late", Link: "https://example.test/x-en/late", Impressions: 4500, Engagements: 300, Likes: 250, Replies: 30, Reposts: 20 },
    ],
  },
  "X French": {
    filename: "x-french.xlsx",
    rows: [
      { Date: "2026-08-10", "Texte du post": "Annonce", Lien: "https://example.test/x-fr/annonce", Impressions: 1000, Engagements: 40, "J'aime": 25, "Réponses": 9, Reposts: 6 },
      { Date: "2026-08-11", "Texte du post": "Mise à jour", Lien: "https://example.test/x-fr/mise-a-jour", Impressions: 2400, Engagements: 130, "J'aime": 100, "Réponses": 18, Reposts: 12 },
      { Date: "2026-08-12", "Texte du post": "Récit local", Lien: "https://example.test/x-fr/recit", Impressions: 1900, Engagements: 95, "J'aime": 75, "Réponses": 12, Reposts: 8 },
      { Date: "2026-08-14", "Texte du post": "Guide pratique", Lien: "https://example.test/x-fr/guide", Impressions: 3200, Engagements: 160, "J'aime": 125, "Réponses": 20, Reposts: 15 },
      { Date: "2026-08-15", "Texte du post": "Entretien", Lien: "https://example.test/x-fr/entretien", Impressions: 1500, Engagements: 70, "J'aime": 55, "Réponses": 9, Reposts: 6 },
    ],
  },
  Facebook: {
    filename: "facebook.xls",
    rows: [
      { "Heure de publication": "2026-08-10", Titre: "Briefing", Permalien: "https://example.test/facebook/briefing", Couverture: 4100, "Réactions": 80, Commentaires: 10, Partages: 5 },
      { "Heure de publication": "2026-08-11", Titre: "Portrait", Permalien: "https://example.test/facebook/portrait", Couverture: 7200, "Réactions": 150, Commentaires: 30, Partages: 20 },
      { "Heure de publication": "2026-08-12", Titre: "Explication", Permalien: "https://example.test/facebook/explication", Couverture: 6300, "Réactions": 120, Commentaires: 25, Partages: 10 },
      { "Heure de publication": "2026-08-13", Titre: "Galerie", Permalien: "https://example.test/facebook/galerie", Couverture: 8000, "Réactions": 170, Commentaires: 35, Partages: 25 },
      { "Heure de publication": "2026-08-14", Titre: "Rappel", Permalien: "https://example.test/facebook/rappel", Couverture: 3500, "Réactions": 60, Commentaires: 8, Partages: 4 },
    ],
  },
  Instagram: {
    filename: "instagram.csv",
    rows: [
      { "Publish time": "2026-08-10", Description: "Opening day", Permalink: "https://example.test/instagram/opening", Reach: 2000, Likes: 35, Shares: 5, Follows: 3, Comments: 4, Saves: 3 },
      { "Publish time": "2026-08-12", Description: "Visual explainer", Permalink: "https://example.test/instagram/explainer", Reach: 5800, Likes: 180, Shares: 15, Follows: 8, Comments: 10, Saves: 7 },
      { "Publish time": "2026-08-15", Description: "Community portrait", Permalink: "https://example.test/instagram/portrait", Reach: 4200, Likes: 120, Shares: 10, Follows: 7, Comments: 8, Saves: 5 },
      { "Publish time": "2026-08-16", Description: "Sunday recap", Permalink: "https://example.test/instagram/recap", Reach: 4900, Likes: 145, Shares: 12, Follows: 8, Comments: 9, Saves: 6 },
      { "Publish time": "2026-08-16 14:00:00", Description: "End-date afternoon", Permalink: "https://example.test/instagram/afternoon", Reach: 10000, Likes: 400, Shares: 40, Follows: 20, Comments: 20, Saves: 20 },
    ],
  },
  LinkedIn: {
    filename: "linkedin.xlsx",
    rows: [
      { "Created date": "2026-08-10", "Post title": "Research note", "Post link": "https://example.test/linkedin/research", Impressions: 3200, Clicks: 40, Likes: 70, Comments: 8, Reposts: 7, Follows: 5 },
      { "Created date": "2026-08-11", "Post title": "Programme update", "Post link": "https://example.test/linkedin/programme", Impressions: 5100, Clicks: 65, Likes: 105, Comments: 14, Reposts: 11, Follows: 5 },
      { "Created date": "2026-08-12", "Post title": "Team perspective", "Post link": "https://example.test/linkedin/team", Impressions: 4400, Clicks: 55, Likes: 90, Comments: 12, Reposts: 8, Follows: 5 },
      { "Created date": "2026-08-14", "Post title": "Policy briefing", "Post link": "https://example.test/linkedin/policy", Impressions: 6200, Clicks: 80, Likes: 130, Comments: 18, Reposts: 15, Follows: 7 },
      { "Created date": "2026-08-15", "Post title": "Event recap", "Post link": "https://example.test/linkedin/event", Impressions: 3700, Clicks: 45, Likes: 75, Comments: 9, Reposts: 6, Follows: 5 },
    ],
  },
};

await writeCsv(path.join(topRoot, topFixtures["X English"].filename), topFixtures["X English"].rows);
await writeWorkbook(path.join(topRoot, topFixtures["X French"].filename), [["Posts", XLSX.utils.json_to_sheet(topFixtures["X French"].rows)]]);
await writeWorkbook(path.join(topRoot, topFixtures.Facebook.filename), [["Posts", XLSX.utils.json_to_sheet(topFixtures.Facebook.rows)]], "biff8");
await writeCsv(path.join(topRoot, topFixtures.Instagram.filename), topFixtures.Instagram.rows);
await writeWorkbook(path.join(topRoot, topFixtures.LinkedIn.filename), [
  ["Overview", XLSX.utils.aoa_to_sheet([["Synthetic fixture"]])],
  ["All posts", sheetWithMetadata(topFixtures.LinkedIn.rows)],
]);

const comparisonFixtures = {
  "X English": {
    before: [
      { Reach: 1000, "Mentions J’aime": 101, Replies: 10, Reposts: 4, Bookmarks: 2 },
      { Reach: 800, "Mentions J’aime": 100, Replies: 5, Reposts: 2, Bookmarks: 1 },
      { Reach: 500, "Mentions J’aime": 0, Replies: "not available", Reposts: 1, Bookmarks: 0 },
      { Reach: 300, "Mentions J’aime": "not available", Replies: 1, Reposts: 0, Bookmarks: 1 },
    ],
    review: [
      { Reach: 1200, "Mentions J’aime": 150, Replies: 15, Reposts: 8, Bookmarks: 3 },
      { Reach: 900, "Mentions J’aime": 130, Replies: 10, Reposts: 5, Bookmarks: 2 },
      { Reach: 600, "Mentions J’aime": 100, Replies: 4, Reposts: 2, Bookmarks: 1 },
      { Reach: 400, "Mentions J’aime": 10, Replies: 2, Reposts: 1, Bookmarks: 0 },
      { Reach: "not available", "Mentions J’aime": "not available", Replies: 1, Reposts: 0, Bookmarks: 0 },
    ],
  },
  "X French": {
    before: [
      { Impressions: 100, Engagements: 20, "J'aime": 11 },
      { Impressions: 200, Engagements: 30, "J'aime": 10 },
      { Impressions: 300, Engagements: 40, "J'aime": 9 },
    ],
    review: [
      { Impressions: 200, Engagements: 50, "J'aime": 20 },
      { Impressions: 250, Engagements: 45, "J'aime": 11 },
      { Impressions: 300, Engagements: 35, "J'aime": 10 },
      { Impressions: 350, Engagements: 20, "J'aime": 5 },
    ],
  },
  Facebook: {
    before: [
      { "Reactions, comments and shares": 130, Reach: 1000, Reactions: 101 },
      { "Reactions, comments and shares": 120, Reach: 900, Reactions: 100 },
      { "Reactions, comments and shares": "not available", Reach: "not available", Reactions: "not available" },
    ],
    review: [
      { "Réactions, commentaires et partages": 180, Couverture: 1500, "Réactions": 140 },
      { "Réactions, commentaires et partages": 150, Couverture: 1300, "Réactions": 110 },
      { "Réactions, commentaires et partages": 105, Couverture: 800, "Réactions": 100 },
      { "Réactions, commentaires et partages": 80, Couverture: 600, "Réactions": 70 },
    ],
  },
  Instagram: {
    before: [
      { "Mentions J’aime": 200, Commentaires: 10, Partages: 8, Enregistrements: 5, Couverture: 2000 },
      { "Mentions J’aime": 199, Commentaires: 9, Partages: 7, Enregistrements: 4, Couverture: 1800 },
      { "Mentions J’aime": 10, Commentaires: "not available", Partages: 1, Enregistrements: 1, Couverture: "not available" },
    ],
    review: [
      { Likes: 201, Comments: 12, Shares: 9, Saves: 6, Reach: 2600 },
      { Likes: 250, Comments: 15, Shares: 11, Saves: 8, Reach: 3100 },
      { Likes: 200, Comments: 10, Shares: 8, Saves: 5, Reach: 2200 },
      { Likes: 50, Comments: 4, Shares: 3, Saves: 2, Reach: 900 },
    ],
  },
  LinkedIn: {
    before: [
      { "Created date": "2026-08-01", "Post title": "A", "Post link": "https://example.test/linkedin/a", Impressions: 1000, Clicks: 20, Likes: 101, Comments: 5, Reposts: 4, Follows: 2 },
      { "Created date": "2026-08-02", "Post title": "B", "Post link": "https://example.test/linkedin/b", Impressions: 900, Clicks: 18, Likes: 100, Comments: 4, Reposts: 3, Follows: 1 },
      { "Created date": "2026-08-03", "Post title": "C", "Post link": "https://example.test/linkedin/c", Impressions: 700, Clicks: "not available", Likes: "not available", Comments: 2, Reposts: 1, Follows: 0 },
    ],
    review: [
      { "Created date": "2026-08-08", "Post title": "D", "Post link": "https://example.test/linkedin/d", Impressions: 1400, Clicks: 30, Likes: 150, Comments: 8, Reposts: 6, Follows: 3 },
      { "Created date": "2026-08-09", "Post title": "E", "Post link": "https://example.test/linkedin/e", Impressions: 1200, Clicks: 25, Likes: 120, Comments: 7, Reposts: 5, Follows: 2 },
      { "Created date": "2026-08-10", "Post title": "F", "Post link": "https://example.test/linkedin/f", Impressions: 1000, Clicks: 20, Likes: 100, Comments: 5, Reposts: 4, Follows: 1 },
      { "Created date": "2026-08-11", "Post title": "G", "Post link": "https://example.test/linkedin/g", Impressions: 800, Clicks: 15, Likes: 80, Comments: 4, Reposts: 3, Follows: 1 },
    ],
  },
};

for (const platform of ["X English", "X French", "Instagram"]) {
  const base = platform.toLowerCase().replaceAll(" ", "-");
  await writeCsv(path.join(comparisonRoot, `${base}-before.csv`), comparisonFixtures[platform].before);
  await writeCsv(path.join(comparisonRoot, `${base}-review.csv`), comparisonFixtures[platform].review);
}
await writeCsv(path.join(comparisonRoot, "facebook-before.csv"), comparisonFixtures.Facebook.before);
await writeCsv(path.join(comparisonRoot, "facebook-review-latin1.csv"), comparisonFixtures.Facebook.review, "latin1");
await writeWorkbook(path.join(comparisonRoot, "linkedin-before.xlsx"), [
  ["Overview", XLSX.utils.aoa_to_sheet([["Synthetic fixture"]])],
  ["All posts", sheetWithMetadata(comparisonFixtures.LinkedIn.before)],
]);
await writeWorkbook(path.join(comparisonRoot, "linkedin-review.xlsx"), [
  ["Overview", XLSX.utils.aoa_to_sheet([["Synthetic fixture"]])],
  ["All posts", sheetWithMetadata(comparisonFixtures.LinkedIn.review)],
]);

const manifest = {
  synthetic: true,
  reportingPeriod: { start: "2026-08-10", end: "2026-08-16" },
  top: Object.fromEntries(
    Object.entries(topFixtures).map(([platform, fixture]) => [
      platform,
      path.posix.join("top", fixture.filename),
    ]),
  ),
  comparison: {
    "X English": ["comparison/x-english-before.csv", "comparison/x-english-review.csv"],
    "X French": ["comparison/x-french-before.csv", "comparison/x-french-review.csv"],
    Facebook: ["comparison/facebook-before.csv", "comparison/facebook-review-latin1.csv"],
    Instagram: ["comparison/instagram-before.csv", "comparison/instagram-review.csv"],
    LinkedIn: ["comparison/linkedin-before.xlsx", "comparison/linkedin-review.xlsx"],
  },
};
await writeFile(path.join(fixtureRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Generated synthetic parity fixtures in ${fixtureRoot}`);
