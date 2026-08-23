export const PLATFORMS = ["X English", "X French", "Facebook", "Instagram", "LinkedIn"];

export const TOP_POST_COLUMNS = [
  "Platform",
  "Rank",
  "Date",
  "Post text",
  "Link",
  "Impressions",
  "Engagements",
  "Reactions",
  "Comments",
  "Shares",
];

export const COMPARISON_COLUMNS = ["Metric", "Week Before", "Week in Review", "Change"];

const PLATFORM_CONFIG = {
  "X English": {
    rename: { Link: "Post Link" },
    columns: [
      [["Date"], "Date"],
      [["Post text"], "Post text"],
      [["Post Link"], "Link"],
      [["Impressions"], "Impressions"],
      [["Engagements"], "Engagements"],
      [["Likes"], "Reactions"],
      [["Replies"], "Comments"],
      [["Reposts"], "Shares"],
    ],
    engagementColumns: ["Engagements"],
  },
  "X French": {
    rename: { Lien: "Lien du post" },
    columns: [
      [["Date"], "Date"],
      [["Texte du post"], "Post text"],
      [["Lien du post"], "Link"],
      [["Impressions"], "Impressions"],
      [["Engagements"], "Engagements"],
      [["J'aime"], "Reactions"],
      [["Réponses"], "Comments"],
      [["Reposts"], "Shares"],
    ],
    engagementColumns: ["Engagements"],
  },
  Facebook: {
    columns: [
      [["Publish time", "Heure de publication"], "Date"],
      [["Title", "Titre"], "Post text"],
      [["Permalink", "Permalien"], "Link"],
      [["Reach", "Couverture"], "Impressions"],
      [["Reactions", "Réactions"], "Reactions"],
      [["Comments", "Commentaires"], "Comments"],
      [["Shares", "Partages"], "Shares"],
    ],
    engagementColumns: ["Reactions", "Comments", "Shares"],
  },
  Instagram: {
    columns: [
      [["Publish time", "Heure de publication"], "Date"],
      [["Description"], "Post text"],
      [["Permalink", "Permalien"], "Link"],
      [["Reach", "Couverture"], "Impressions"],
      [["Likes", "Mentions J’aime"], "Reactions"],
      [["Shares", "Partages"], "Shares"],
      [["Follows", "Followers en plus"], "Follows"],
      [["Comments", "Commentaires"], "Comments"],
      [["Saves", "Enregistrements"], "Saves"],
    ],
    engagementColumns: ["Reactions", "Shares", "Follows", "Comments", "Saves"],
  },
  LinkedIn: {
    columns: [
      [["Created date"], "Date"],
      [["Post title"], "Post text"],
      [["Post link"], "Link"],
      [["Impressions"], "Impressions"],
      [["Clicks"], "Clicks"],
      [["Likes"], "Reactions"],
      [["Comments"], "Comments"],
      [["Reposts"], "Shares"],
      [["Follows"], "Follows"],
    ],
    engagementColumns: ["Clicks", "Reactions", "Comments", "Shares", "Follows"],
  },
};

function asBytes(fileBytes) {
  if (fileBytes instanceof Uint8Array) return fileBytes;
  if (fileBytes instanceof ArrayBuffer) return new Uint8Array(fileBytes);
  if (ArrayBuffer.isView(fileBytes)) {
    return new Uint8Array(fileBytes.buffer, fileBytes.byteOffset, fileBytes.byteLength);
  }
  throw new TypeError("The file could not be read as binary data.");
}

function rowsFromSheet(sheet, xlsx, skipRows = 0) {
  return xlsx.utils.sheet_to_json(sheet, {
    raw: true,
    defval: null,
    blankrows: false,
    range: skipRows,
  });
}

function workbookRows(fileBytes, xlsx, { sheetName, skipRows = 0 } = {}) {
  const workbook = xlsx.read(asBytes(fileBytes), { type: "array", cellDates: true });
  const selectedSheet = sheetName || workbook.SheetNames[0];
  if (!selectedSheet || !workbook.Sheets[selectedSheet]) {
    if (sheetName) throw new Error(`Workbook sheet “${sheetName}” was not found.`);
    throw new Error("The workbook does not contain a readable sheet.");
  }
  return rowsFromSheet(workbook.Sheets[selectedSheet], xlsx, skipRows);
}

function decodeCsv(fileBytes, encoding = "utf-8") {
  return new TextDecoder(encoding, { fatal: encoding === "utf-8" }).decode(asBytes(fileBytes));
}

function csvRows(fileBytes, xlsx, encoding = "utf-8") {
  const csvText = decodeCsv(fileBytes, encoding);
  const workbook = xlsx.read(csvText, { type: "string" });
  return rowsFromSheet(workbook.Sheets[workbook.SheetNames[0]], xlsx);
}

export function readTopPostsFile(fileBytes, filename, platform, xlsx = globalThis.XLSX) {
  if (!xlsx) throw new Error("The local spreadsheet reader did not load.");
  const lowerName = String(filename).toLowerCase();
  if (lowerName.endsWith(".csv")) return csvRows(fileBytes, xlsx);
  if (lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx")) {
    return workbookRows(fileBytes, xlsx, {
      sheetName: platform === "LinkedIn" ? "All posts" : undefined,
      skipRows: platform === "LinkedIn" ? 1 : 0,
    });
  }
  throw new Error("Unsupported file format. Upload a CSV, XLS or XLSX file.");
}

export function readComparisonFile(fileBytes, platform, xlsx = globalThis.XLSX) {
  if (!xlsx) throw new Error("The local spreadsheet reader did not load.");
  if (platform === "LinkedIn") {
    return workbookRows(fileBytes, xlsx, { sheetName: "All posts", skipRows: 1 });
  }
  if (platform === "Facebook") {
    try {
      return csvRows(fileBytes, xlsx, "utf-8");
    } catch (utf8Error) {
      try {
        return csvRows(fileBytes, xlsx, "latin1");
      } catch {
        throw utf8Error;
      }
    }
  }
  return csvRows(fileBytes, xlsx, "utf-8");
}

function headersFor(rows) {
  const headers = new Set();
  for (const row of rows) Object.keys(row).forEach((header) => headers.add(header));
  return headers;
}

function renameColumns(rows, renameMap = {}) {
  if (!Object.keys(renameMap).length) return rows;
  return rows.map((row) => {
    const renamed = { ...row };
    for (const [source, target] of Object.entries(renameMap)) {
      if (Object.prototype.hasOwnProperty.call(renamed, source)) {
        renamed[target] = renamed[source];
        delete renamed[source];
      }
    }
    return renamed;
  });
}

function mapColumns(rows, columnDefinitions) {
  const headers = headersFor(rows);
  const mapping = new Map();
  for (const [possibleSources, target] of columnDefinitions) {
    const source = possibleSources.find((candidate) => headers.has(candidate));
    if (source) mapping.set(target, source);
  }
  return mapping;
}

function numberOrZero(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : 0;
}

function numericColumn(rows, column) {
  let float = false;
  const values = rows.map((row) => {
    const value = row[column];
    const converted = numberOrZero(value);
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      !Number.isFinite(Number(value)) ||
      !Number.isInteger(converted)
    ) {
      float = true;
    }
    return converted;
  });
  return { values, sum: values.reduce((total, value) => total + value, 0), float };
}

function metric(value, float = false) {
  return { value, float };
}

function parseDateParts(value, xlsx = globalThis.XLSX) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
    );
  }

  if (typeof value === "number" && Number.isFinite(value) && xlsx?.SSF?.parse_date_code) {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed) return Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
  }

  const text = String(value ?? "").trim();
  if (!text) return Number.NaN;

  const simple = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2})(?:\.\d+)?)?)?$/,
  );
  if (simple) {
    return Date.UTC(
      Number(simple[1]),
      Number(simple[2]) - 1,
      Number(simple[3]),
      Number(simple[4] || 0),
      Number(simple[5] || 0),
      Number(simple[6] || 0),
    );
  }

  const slashed = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/,
  );
  if (slashed) {
    const first = Number(slashed[1]);
    const second = Number(slashed[2]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    return Date.UTC(
      Number(slashed[3]),
      month - 1,
      day,
      Number(slashed[4] || 0),
      Number(slashed[5] || 0),
      Number(slashed[6] || 0),
    );
  }

  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
}

function formatUsDate(timestamp) {
  const date = new Date(timestamp);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}/${day}/${date.getUTCFullYear()}`;
}

function expectedTargets(config) {
  return [
    ...new Set([
      "Date",
      "Post text",
      "Link",
      "Impressions",
      "Reactions",
      "Comments",
      "Shares",
      ...config.engagementColumns,
    ]),
  ];
}

export function processTopPosts(rows, platform, startDate, endDate, xlsx = globalThis.XLSX) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) throw new Error(`Unsupported platform: ${platform}`);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("The report contains no data rows.");

  const renamedRows = renameColumns(rows, config.rename);
  const mapping = mapColumns(renamedRows, config.columns);
  const missing = expectedTargets(config).filter((target) => !mapping.has(target));
  if (missing.length) {
    throw new Error(
      `Missing expected column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
    );
  }

  const start = parseDateParts(startDate, xlsx);
  const end = parseDateParts(endDate, xlsx);
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("Choose valid start and end dates.");
  if (start > end) throw new Error("Start date must be on or before end date.");

  const selected = renamedRows
    .map((row, sourceIndex) => {
      const normalized = { _sourceIndex: sourceIndex };
      for (const [target, source] of mapping) normalized[target] = row[source];
      normalized._timestamp = parseDateParts(normalized.Date, xlsx);
      normalized.Engagements = config.engagementColumns.reduce(
        (total, column) => total + numberOrZero(normalized[column]),
        0,
      );
      return normalized;
    })
    .filter((row) => Number.isFinite(row._timestamp) && row._timestamp >= start && row._timestamp <= end)
    .sort((left, right) => {
      const difference = right.Engagements - left.Engagements;
      return difference || left._sourceIndex - right._sourceIndex;
    })
    .slice(0, 3);

  if (selected.length !== 3) {
    throw new Error(
      `The selected period contains ${selected.length} valid post${selected.length === 1 ? "" : "s"}; the reference report requires at least 3.`,
    );
  }

  return selected.map((row, index) => ({
    Platform: platform,
    Rank: index + 1,
    Date: formatUsDate(row._timestamp),
    "Post text": row["Post text"],
    Link: row.Link,
    Impressions: row.Impressions,
    Engagements: row.Engagements,
    Reactions: row.Reactions,
    Comments: row.Comments,
    Shares: row.Shares,
  }));
}

function findColumn(rows, possibleNames) {
  const headers = headersFor(rows);
  const found = possibleNames.find((name) => headers.has(name));
  if (found) return found;
  throw new Error(
    `None of the expected columns [${possibleNames.join(", ")}] found. Available columns: [${[
      ...headers,
    ].join(", ")}].`,
  );
}

function xEnglishMetrics(rows) {
  const impressions = findColumn(rows, ["Impressions", "Reach", "Couverture"]);
  const likes = findColumn(rows, ["Likes", "J'aime", "Mentions J'aime", "Mentions J’aime"]);
  const comments = findColumn(rows, ["Comments", "Commentaires", "Replies"]);
  const shares = findColumn(rows, ["Shares", "Partages", "Reposts"]);
  const saves = findColumn(rows, ["Saves", "Enregistrements", "Bookmarks"]);
  const impressionValues = numericColumn(rows, impressions);
  const likeValues = numericColumn(rows, likes);
  const commentValues = numericColumn(rows, comments);
  const shareValues = numericColumn(rows, shares);
  const saveValues = numericColumn(rows, saves);
  const engagementFloat =
    likeValues.float || commentValues.float || shareValues.float || saveValues.float;
  return {
    "Total Posts": metric(rows.length),
    "Total Impressions": metric(impressionValues.sum, impressionValues.float),
    "Total Engagements": metric(
      likeValues.sum + commentValues.sum + shareValues.sum + saveValues.sum,
      engagementFloat,
    ),
    "Posts >100 Likes": metric(likeValues.values.filter((value) => value > 100).length),
    "Posts ≤100 Likes": metric(likeValues.values.filter((value) => value <= 100).length),
  };
}

function xFrenchMetrics(rows) {
  const required = ["Impressions", "Engagements", "J'aime"];
  const missing = required.filter((column) => !headersFor(rows).has(column));
  if (missing.length) throw new Error(`Missing expected column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`);
  const impressions = numericColumn(rows, "Impressions");
  const engagements = numericColumn(rows, "Engagements");
  const likes = numericColumn(rows, "J'aime");
  return {
    "Total Posts": metric(rows.length),
    "Total Impressions": metric(impressions.sum, impressions.float),
    "Total Engagements": metric(engagements.sum, engagements.float),
    "Posts >10 Likes": metric(likes.values.filter((value) => value > 10).length),
    "Posts ≤10 Likes": metric(likes.values.filter((value) => value <= 10).length),
  };
}

function facebookMetrics(rows) {
  const engagements = findColumn(rows, [
    "Reactions, Comments and Shares",
    "Reactions, comments and shares",
    "Réactions, commentaires et partages",
  ]);
  const reach = findColumn(rows, ["Reach", "Couverture"]);
  const reactions = findColumn(rows, ["Reactions", "Réactions"]);
  const reachValues = numericColumn(rows, reach);
  const engagementValues = numericColumn(rows, engagements);
  const reactionValues = numericColumn(rows, reactions);
  return {
    "Total Posts": metric(rows.length),
    "Total Reach": metric(reachValues.sum, reachValues.float),
    "Total Engagements": metric(engagementValues.sum, engagementValues.float),
    "Posts >100 Reactions": metric(reactionValues.values.filter((value) => value > 100).length),
    "Posts ≤100 Reactions": metric(reactionValues.values.filter((value) => value <= 100).length),
  };
}

function instagramMetrics(rows) {
  const likes = findColumn(rows, ["Likes", "J'aime", "Mentions J'aime", "Mentions J’aime"]);
  const comments = findColumn(rows, ["Comments", "Commentaires"]);
  const shares = findColumn(rows, ["Shares", "Partages"]);
  const saves = findColumn(rows, ["Saves", "Enregistrements"]);
  const reach = findColumn(rows, ["Reach", "Couverture"]);
  const likeValues = numericColumn(rows, likes);
  const commentValues = numericColumn(rows, comments);
  const shareValues = numericColumn(rows, shares);
  const saveValues = numericColumn(rows, saves);
  const reachValues = numericColumn(rows, reach);
  const engagementFloat =
    likeValues.float || commentValues.float || shareValues.float || saveValues.float;
  return {
    "Total Posts": metric(rows.length),
    "Total Reach": metric(reachValues.sum, reachValues.float),
    "Total Engagements": metric(
      likeValues.sum + commentValues.sum + shareValues.sum + saveValues.sum,
      engagementFloat,
    ),
    "Posts >200 Likes": metric(likeValues.values.filter((value) => value > 200).length),
    "Posts ≤200 Likes": metric(likeValues.values.filter((value) => value <= 200).length),
  };
}

function linkedInMetrics(rows, threshold = 100) {
  const required = [
    "Created date",
    "Post title",
    "Post link",
    "Impressions",
    "Clicks",
    "Likes",
    "Comments",
    "Reposts",
    "Follows",
  ];
  const headers = headersFor(rows);
  const missing = required.filter((column) => !headers.has(column));
  if (missing.length) {
    throw new Error(
      `Missing expected columns: [${missing.join(", ")}]. Available columns: [${[
        ...headers,
      ].join(", ")}].`,
    );
  }
  const impressions = numericColumn(rows, "Impressions");
  const clicks = numericColumn(rows, "Clicks");
  const likes = numericColumn(rows, "Likes");
  const comments = numericColumn(rows, "Comments");
  const reposts = numericColumn(rows, "Reposts");
  const follows = numericColumn(rows, "Follows");
  const engagementFloat =
    clicks.float || likes.float || comments.float || reposts.float || follows.float;
  return {
    "Total Posts": metric(rows.length),
    "Total Impressions": metric(impressions.sum, impressions.float),
    "Total Engagements": metric(
      clicks.sum + likes.sum + comments.sum + reposts.sum + follows.sum,
      engagementFloat,
    ),
    [`Posts >${threshold} Reactions`]: metric(
      likes.values.filter((value) => value > threshold).length,
    ),
    [`Posts ≤${threshold} Reactions`]: metric(
      likes.values.filter((value) => value <= threshold).length,
    ),
  };
}

const METRIC_FUNCTIONS = {
  "X English": xEnglishMetrics,
  "X French": xFrenchMetrics,
  Facebook: facebookMetrics,
  Instagram: instagramMetrics,
  LinkedIn: linkedInMetrics,
};

function commaNumber(value, forceFloat = false) {
  if (Object.is(value, -0)) return "-0";
  const formatted = Number(value).toLocaleString("en-US", { maximumFractionDigits: 20 });
  return forceFloat && Number.isInteger(value) ? `${formatted}.0` : formatted;
}

function signedNumber(value, forceFloat = false) {
  const prefix = value >= 0 && !Object.is(value, -0) ? "+" : "";
  return `${prefix}${commaNumber(value, forceFloat)}`;
}

export function formatChange(current, previous, forceFloat = false) {
  const delta = current - previous;
  const symbol = delta > 0 ? "▲" : delta < 0 ? "▼" : "—";
  const percent = previous ? Number(((delta / previous) * 100).toFixed(2)) : 0;
  const percentText = new Intl.NumberFormat("en-US", {
    signDisplay: "always",
    useGrouping: false,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent);
  return `${symbol} ${signedNumber(delta, forceFloat)} (${percentText}%)`;
}

export function compareReports(platform, weekBefore, weekInReview) {
  const metricFunction = METRIC_FUNCTIONS[platform];
  if (!metricFunction) throw new Error(`Unsupported platform: ${platform}`);
  if (!weekBefore.length || !weekInReview.length) throw new Error("Both reports must contain data rows.");
  const before = metricFunction(weekBefore.map((row) => ({ ...row })));
  const review = metricFunction(weekInReview.map((row) => ({ ...row })));
  return Object.keys(before).map((metric) => ({
    Metric: metric,
    "Week Before": commaNumber(Math.trunc(before[metric].value)),
    "Week in Review": commaNumber(Math.trunc(review[metric].value)),
    Change: formatChange(
      review[metric].value,
      before[metric].value,
      review[metric].float || before[metric].float,
    ),
  }));
}
