import {
  COMPARISON_COLUMNS,
  PLATFORMS,
  TOP_POST_COLUMNS,
  compareReports,
  processTopPosts,
  readComparisonFile,
  readTopPostsFile,
} from "./signal-core.mjs";
import { createExcelBlob, createWordReport } from "./report-downloads.mjs";

const topFiles = new Map();
const topResults = new Map();
let comparisonRows = [];
let processSequence = 0;

const elements = {
  tabs: [...document.querySelectorAll("[role='tab']")],
  panels: [...document.querySelectorAll("[role='tabpanel']")],
  topStart: document.querySelector("#top-start-date"),
  topEnd: document.querySelector("#top-end-date"),
  topGrid: document.querySelector("#top-upload-grid"),
  topStatus: document.querySelector("#top-status"),
  topResults: document.querySelector("#top-results"),
  platformResults: document.querySelector("#platform-results"),
  topCombined: document.querySelector("#top-combined-table"),
  comparisonPlatform: document.querySelector("#comparison-platform"),
  comparisonGuidance: document.querySelector("#comparison-guidance"),
  comparisonStatus: document.querySelector("#comparison-status"),
  comparisonResults: document.querySelector("#comparison-results"),
  comparisonTitle: document.querySelector("#comparison-results-title"),
  comparisonTable: document.querySelector("#comparison-table"),
};

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function createUploadItem({ id, label, accept = ".csv,.xls,.xlsx" }) {
  const wrapper = document.createElement("div");
  wrapper.className = "upload-item";

  const fileLabel = document.createElement("label");
  fileLabel.className = "file-label";
  fileLabel.htmlFor = id;

  const title = document.createElement("span");
  title.textContent = label;

  const control = document.createElement("span");
  control.className = "file-control";

  const buttonText = document.createElement("span");
  buttonText.className = "file-button";
  buttonText.textContent = "Choose file";

  const fileName = document.createElement("span");
  fileName.className = "file-name";
  fileName.textContent = "No file selected";

  const input = document.createElement("input");
  input.id = id;
  input.type = "file";
  input.accept = accept;
  input.setAttribute("aria-describedby", `${id}-message`);

  control.append(buttonText, fileName, input);
  fileLabel.append(title, control);

  const message = document.createElement("p");
  message.className = "file-message";
  message.id = `${id}-message`;

  wrapper.append(fileLabel, message);
  return { wrapper, input, fileName, message };
}

function setFileMessage(messageElement, text = "", isError = false) {
  messageElement.textContent = text;
  messageElement.classList.toggle("is-error", isError);
}

function setStatus(element, text = "", isError = false) {
  element.textContent = text;
  element.classList.toggle("is-error", isError);
}

function switchPanel(tab) {
  const panelName = tab.dataset.panel;
  for (const candidate of elements.tabs) {
    const active = candidate === tab;
    candidate.classList.toggle("is-active", active);
    candidate.setAttribute("aria-selected", String(active));
    candidate.tabIndex = active ? 0 : -1;
  }
  for (const panel of elements.panels) panel.hidden = panel.id !== `panel-${panelName}`;
}

for (const tab of elements.tabs) {
  tab.addEventListener("click", () => switchPanel(tab));
  tab.addEventListener("keydown", (event) => {
    const currentIndex = elements.tabs.indexOf(tab);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % elements.tabs.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + elements.tabs.length) % elements.tabs.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = elements.tabs.length - 1;
    if (nextIndex !== currentIndex) {
      event.preventDefault();
      switchPanel(elements.tabs[nextIndex]);
      elements.tabs[nextIndex].focus();
    }
  });
}

function isValidPostUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function displayValue(value) {
  if (value === null || value === undefined || (typeof value === "number" && !Number.isFinite(value))) {
    return "—";
  }
  if (typeof value === "number") return value.toLocaleString("en-US", { maximumFractionDigits: 20 });
  return String(value);
}

function buildTable(rows, columns) {
  const scroll = document.createElement("div");
  scroll.className = "table-scroll";

  const table = document.createElement("table");
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = columns.includes("Platform")
    ? "Top-performing social media posts"
    : "Week-on-week metrics";
  table.append(caption);

  const head = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const column of columns) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = column;
    headerRow.append(th);
  }
  head.append(headerRow);
  table.append(head);

  const body = document.createElement("tbody");
  for (const row of rows) {
    const tableRow = document.createElement("tr");
    for (const column of columns) {
      const cell = document.createElement("td");
      cell.dataset.column = column;
      if (column === "Link" && isValidPostUrl(row[column])) {
        const link = document.createElement("a");
        link.href = String(row[column]);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open post ↗";
        link.setAttribute("aria-label", `Open ${row.Platform} rank ${row.Rank} post`);
        cell.append(link);
      } else {
        cell.textContent = displayValue(row[column]);
      }
      if (column === "Change") {
        cell.classList.toggle("change-up", String(row[column]).startsWith("▲"));
        cell.classList.toggle("change-down", String(row[column]).startsWith("▼"));
      }
      tableRow.append(cell);
    }
    body.append(tableRow);
  }
  table.append(body);
  scroll.append(table);
  return scroll;
}

function combinedTopRows() {
  return PLATFORMS.flatMap((platform) => topResults.get(platform) || []);
}

function renderTopResults() {
  const combined = combinedTopRows();
  elements.topResults.hidden = combined.length === 0;
  elements.platformResults.replaceChildren();
  elements.topCombined.replaceChildren();
  if (!combined.length) return;

  for (const platform of PLATFORMS) {
    const rows = topResults.get(platform);
    if (!rows) continue;
    const details = document.createElement("details");
    details.className = "platform-result";
    details.open = topResults.size === 1;
    const summary = document.createElement("summary");
    summary.textContent = `${platform} — top posts`;
    details.append(summary, buildTable(rows, TOP_POST_COLUMNS));
    elements.platformResults.append(details);
  }
  elements.topCombined.append(buildTable(combined, TOP_POST_COLUMNS));
}

async function processTopFiles() {
  const sequence = ++processSequence;
  topResults.clear();
  const selectedPlatforms = PLATFORMS.filter((platform) => topFiles.has(platform));
  if (!selectedPlatforms.length) {
    setStatus(elements.topStatus);
    renderTopResults();
    return;
  }

  setStatus(elements.topStatus, "Processing files locally…");
  let errors = 0;
  await Promise.all(
    selectedPlatforms.map(async (platform) => {
      const file = topFiles.get(platform);
      const message = document.querySelector(`#top-${slug(platform)}-message`);
      try {
        const bytes = await file.arrayBuffer();
        const rows = readTopPostsFile(bytes, file.name, platform);
        const result = processTopPosts(
          rows,
          platform,
          elements.topStart.value,
          elements.topEnd.value,
        );
        if (sequence !== processSequence) return;
        topResults.set(platform, result);
        setFileMessage(message, `${file.name} · ${rows.length} data rows`);
      } catch (error) {
        errors += 1;
        setFileMessage(message, error instanceof Error ? error.message : String(error), true);
      }
    }),
  );
  if (sequence !== processSequence) return;

  renderTopResults();
  const count = topResults.size;
  if (count) {
    setStatus(
      elements.topStatus,
      `Processed ${count} platform${count === 1 ? "" : "s"} locally${errors ? `; ${errors} needs attention` : ""}.`,
      errors > 0,
    );
  } else {
    setStatus(elements.topStatus, "No report could be produced. Review the file message above.", true);
  }
}

elements.topStart.value = localIsoDate();
elements.topEnd.value = localIsoDate();
elements.topStart.addEventListener("change", processTopFiles);
elements.topEnd.addEventListener("change", processTopFiles);

for (const platform of PLATFORMS) {
  const id = `top-${slug(platform)}`;
  const upload = createUploadItem({ id, label: platform });
  upload.input.addEventListener("change", () => {
    const file = upload.input.files?.[0];
    upload.fileName.textContent = file?.name || "No file selected";
    if (file) topFiles.set(platform, file);
    else topFiles.delete(platform);
    setFileMessage(upload.message);
    processTopFiles();
  });
  elements.topGrid.append(upload.wrapper);
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

document.querySelector("#download-top-excel").addEventListener("click", () => {
  downloadBlob(createExcelBlob(combinedTopRows(), TOP_POST_COLUMNS), "Social_Media_Report.xlsx");
});

document.querySelector("#download-top-word").addEventListener("click", async () => {
  try {
    setStatus(elements.topStatus, "Preparing the Word report locally…");
    const blob = await createWordReport(combinedTopRows(), PLATFORMS);
    downloadBlob(blob, "Weekly_Social_Media_Report.docx");
    setStatus(elements.topStatus, "Word report prepared locally.");
  } catch (error) {
    setStatus(elements.topStatus, error instanceof Error ? error.message : String(error), true);
  }
});

for (const platform of PLATFORMS) {
  const option = document.createElement("option");
  option.value = platform;
  option.textContent = platform;
  elements.comparisonPlatform.append(option);
}

const comparisonBefore = createUploadItem({ id: "comparison-week-before", label: "Week Before" });
const comparisonReview = createUploadItem({ id: "comparison-week-review", label: "Week in Review" });
document.querySelector("#comparison-before-slot").append(comparisonBefore.wrapper);
document.querySelector("#comparison-review-slot").append(comparisonReview.wrapper);

function updateComparisonGuidance() {
  elements.comparisonGuidance.textContent =
    elements.comparisonPlatform.value === "LinkedIn"
      ? "LinkedIn uses XLS or XLSX with an “All posts” sheet and the first row skipped."
      : `${elements.comparisonPlatform.value} week comparison uses CSV exports, matching the reference application.`;
}

function resetComparison() {
  comparisonBefore.input.value = "";
  comparisonReview.input.value = "";
  comparisonBefore.fileName.textContent = "No file selected";
  comparisonReview.fileName.textContent = "No file selected";
  setFileMessage(comparisonBefore.message);
  setFileMessage(comparisonReview.message);
  setStatus(elements.comparisonStatus);
  comparisonRows = [];
  elements.comparisonResults.hidden = true;
  elements.comparisonTable.replaceChildren();
}

async function processComparison() {
  const beforeFile = comparisonBefore.input.files?.[0];
  const reviewFile = comparisonReview.input.files?.[0];
  comparisonBefore.fileName.textContent = beforeFile?.name || "No file selected";
  comparisonReview.fileName.textContent = reviewFile?.name || "No file selected";
  setFileMessage(comparisonBefore.message);
  setFileMessage(comparisonReview.message);
  comparisonRows = [];
  elements.comparisonResults.hidden = true;
  if (!beforeFile || !reviewFile) {
    setStatus(elements.comparisonStatus);
    return;
  }

  const sequence = ++processSequence;
  const platform = elements.comparisonPlatform.value;
  setStatus(elements.comparisonStatus, "Comparing both files locally…");
  try {
    const [beforeBytes, reviewBytes] = await Promise.all([
      beforeFile.arrayBuffer(),
      reviewFile.arrayBuffer(),
    ]);
    const beforeRows = readComparisonFile(beforeBytes, platform);
    const reviewRows = readComparisonFile(reviewBytes, platform);
    const summary = compareReports(platform, beforeRows, reviewRows);
    if (sequence !== processSequence) return;
    comparisonRows = summary;
    elements.comparisonTitle.textContent = `${platform} comparison`;
    elements.comparisonTable.replaceChildren(buildTable(summary, COMPARISON_COLUMNS));
    elements.comparisonResults.hidden = false;
    setFileMessage(comparisonBefore.message, `${beforeFile.name} · ${beforeRows.length} data rows`);
    setFileMessage(comparisonReview.message, `${reviewFile.name} · ${reviewRows.length} data rows`);
    setStatus(elements.comparisonStatus, "Comparison completed locally.");
  } catch (error) {
    if (sequence !== processSequence) return;
    setStatus(
      elements.comparisonStatus,
      `${error instanceof Error ? error.message : String(error)} Check that the selected platform matches both exports and that the expected columns are present.`,
      true,
    );
  }
}

comparisonBefore.input.addEventListener("change", processComparison);
comparisonReview.input.addEventListener("change", processComparison);
elements.comparisonPlatform.addEventListener("change", () => {
  updateComparisonGuidance();
  resetComparison();
});
updateComparisonGuidance();

document.querySelector("#download-comparison").addEventListener("click", () => {
  const filename = `${elements.comparisonPlatform.value.replaceAll(" ", "_")}_Week_Comparison.xlsx`;
  downloadBlob(createExcelBlob(comparisonRows, COMPARISON_COLUMNS), filename);
});

globalThis.ATGSignal = Object.freeze({
  version: "1.0.0",
  processing: "local-only",
  platforms: [...PLATFORMS],
});
