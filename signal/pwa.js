(() => {
  "use strict";

  const installButton = document.querySelector("#install-button");
  const installStatus = document.querySelector("#installation-status");
  let installPrompt = null;

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function setInstalledState() {
    installPrompt = null;
    installButton.hidden = true;
    installStatus.textContent =
      "ATG Signal is installed on this computer and remains available without an internet connection.";
  }

  if (isStandalone()) setInstalledState();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
    installStatus.textContent =
      "Installation is available in this browser. Install ATG Signal for direct access and offline use.";
  });

  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installButton.hidden = true;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    installStatus.textContent =
      choice.outcome === "accepted"
        ? "Installation accepted. ATG Signal will open from this computer when setup is complete."
        : "Installation was not completed. You can continue using the browser-native version below.";
  });

  window.addEventListener("appinstalled", setInstalledState);

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch(() => {
        installButton.hidden = true;
        installStatus.textContent =
          "Local installation could not be prepared. You can continue using the browser-native version below.";
      });
    });
  } else if (!isStandalone()) {
    installStatus.textContent =
      "Installation is unavailable in this browser. You can continue using the browser-native version below or use the offline package from OpenATG.";
  }
})();
