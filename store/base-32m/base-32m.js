(() => {
  "use strict";

  const button = document.querySelector("#copy-checksum");
  const checksum = document.querySelector("#checkpoint-sha")?.textContent?.trim();
  const feedback = document.querySelector("#copy-feedback");

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Use the local selection fallback when clipboard permission is unavailable.
      }
    }

    const field = document.createElement("textarea");
    field.value = value;
    field.readOnly = true;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("The browser did not copy the checksum.");
  }

  button?.addEventListener("click", async () => {
    if (!checksum || !feedback) return;

    button.disabled = true;
    feedback.classList.remove("is-error");
    try {
      await copyText(checksum);
      feedback.textContent = "Checksum copied.";
    } catch {
      feedback.classList.add("is-error");
      feedback.textContent = "Checksum could not be copied. Select the checksum above to copy it.";
    } finally {
      button.disabled = false;
    }
  });
})();
