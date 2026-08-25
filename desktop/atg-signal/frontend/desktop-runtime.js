(() => {
  "use strict";

  const tauri = globalThis.__TAURI__;
  const isTauri = Boolean(globalThis.__TAURI_INTERNALS__ && tauri?.dialog && tauri?.fs);
  if (!isTauri) return;

  document.documentElement.dataset.runtime = "tauri";

  function reportStatus(filename, message, isError = false) {
    const comparison = filename.endsWith("_Week_Comparison.xlsx");
    const element = document.querySelector(comparison ? "#comparison-status" : "#top-status");
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-error", isError);
  }

  function fileType(filename) {
    if (filename.toLowerCase().endsWith(".docx")) {
      return { name: "Word document", extensions: ["docx"] };
    }
    return { name: "Excel workbook", extensions: ["xlsx"] };
  }

  async function saveBlob(blob, filename) {
    document.documentElement.dataset.lastSave = "selecting";
    try {
      const selectedPath = await tauri.dialog.save({
        title: "Save ATG Signal report",
        defaultPath: filename,
        canCreateDirectories: true,
        filters: [fileType(filename)],
      });
      if (!selectedPath) {
        document.documentElement.dataset.lastSave = "cancelled";
        return false;
      }

      const contents = new Uint8Array(await blob.arrayBuffer());
      await tauri.fs.writeFile(selectedPath, contents);
      document.documentElement.dataset.lastSave = "saved";
      reportStatus(filename, `${filename} was saved locally.`);
      return true;
    } catch (error) {
      document.documentElement.dataset.lastSave = "error";
      reportStatus(
        filename,
        `The report could not be saved. ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
      return false;
    }
  }

  globalThis.ATGDesktop = Object.freeze({
    runtime: "tauri",
    pwaRegistration: "skipped",
    saveBlob,
  });

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".brand")?.removeAttribute("href");
    document.querySelector(".brand")?.setAttribute("aria-label", "ATG Signal");

    const privacy = document.querySelector(".privacy-inner p");
    if (privacy) {
      privacy.innerHTML =
        "<strong>Private by design.</strong> Files are processed locally on this Mac and are never uploaded.";
    }

    const footer = document.querySelector(".site-footer p");
    if (footer) footer.textContent = "ATG Signal · Local processing";

    document.addEventListener(
      "click",
      (event) => {
        const link = event.target.closest?.('a[href^="http://"], a[href^="https://"]');
        if (!link) return;
        event.preventDefault();
        reportStatus("Social_Media_Report.xlsx", "External links stay closed in the local desktop app.");
      },
      true,
    );
  });
})();

