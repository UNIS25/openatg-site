(() => {
  "use strict";

  const list = document.querySelector("#application-list");
  const status = document.querySelector("#catalogue-status");
  const dialog = document.querySelector("#application-dialog");
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogCategory = document.querySelector("#dialog-category");
  const dialogContent = document.querySelector("#dialog-content");
  const dialogClose = document.querySelector("#dialog-close");

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function safeLocalPath(value, allowedPrefixes) {
    try {
      const url = new URL(String(value), window.location.origin);
      if (url.origin !== window.location.origin) return null;
      if (!allowedPrefixes.some((prefix) => url.pathname.startsWith(prefix))) return null;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  function stringList(value) {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }

  function addList(parent, items, className = "detail-list") {
    const listNode = element("ul", className);
    for (const item of stringList(items)) listNode.append(element("li", "", item));
    parent.append(listNode);
  }

  function createFact(label, value) {
    const wrapper = document.createElement("div");
    wrapper.append(element("dt", "", label), element("dd", "", value));
    return wrapper;
  }

  function createAction(label, href, className, options = {}) {
    const link = element("a", className, label);
    link.href = href;
    if (options.downloadName) link.download = options.downloadName;
    if (options.external) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    return link;
  }

  function createDetailSection(title) {
    const section = element("section", "detail-section");
    section.append(element("h3", "", title));
    return section;
  }

  function appendDetailValue(grid, label, value, isCode = false) {
    const wrapper = document.createElement("div");
    wrapper.append(element("p", "detail-label", label));
    const detailValue = element("p", "detail-value");
    detailValue.append(isCode ? element("code", "", value) : document.createTextNode(String(value)));
    wrapper.append(detailValue);
    grid.append(wrapper);
  }

  function showDetails(application) {
    dialogTitle.textContent = String(application.name);
    dialogCategory.textContent = String(application.category);
    dialogContent.replaceChildren();

    const description = createDetailSection("Description");
    description.append(element("p", "dialog-description", application.description));
    dialogContent.append(description);

    const capabilities = createDetailSection("Capabilities");
    addList(capabilities, application.capabilities);
    dialogContent.append(capabilities);

    const runtime = createDetailSection("Version and runtime");
    const runtimeGrid = element("div", "detail-grid");
    appendDetailValue(runtimeGrid, "Version", application.version);
    appendDetailValue(runtimeGrid, "Runtime", application.runtime);
    appendDetailValue(runtimeGrid, "Internet after installation", application.internetAfterInstallation);
    appendDetailValue(runtimeGrid, "Offline availability", application.offlineAvailability);
    runtime.append(runtimeGrid);
    const requirementsTitle = element("h3", "", "Runtime requirements");
    requirementsTitle.className = "capabilities-title";
    runtime.append(requirementsTitle);
    addList(runtime, application.runtimeRequirements);
    dialogContent.append(runtime);

    const permissions = createDetailSection("Permissions");
    addList(permissions, application.permissions);
    dialogContent.append(permissions);

    const privacy = createDetailSection("Privacy");
    privacy.append(element("p", "privacy-statement", application.privacy));
    dialogContent.append(privacy);

    const compatibility = createDetailSection("Compatibility");
    const compatibilityGrid = element("div", "compatibility-grid");
    for (const profile of Array.isArray(application.compatibility)
      ? application.compatibility
      : []) {
      const item = element("div", "compatibility-item");
      item.append(element("p", "detail-label", profile.label));
      addList(item, profile.details);
      compatibilityGrid.append(item);
    }
    compatibility.append(compatibilityGrid);
    dialogContent.append(compatibility);

    const packageSection = createDetailSection("Offline package");
    const packageGrid = element("div", "detail-grid");
    appendDetailValue(packageGrid, "Package", application.package.filename);
    appendDetailValue(packageGrid, "Package size", application.package.size);
    appendDetailValue(packageGrid, "SHA-256", application.package.sha256, true);
    appendDetailValue(packageGrid, "Supported systems", stringList(application.supportedOperatingSystems).join(", "));
    packageSection.append(packageGrid);
    dialogContent.append(packageSection);

    const releaseNotes = createDetailSection("Release notes");
    addList(releaseNotes, application.releaseNotes);
    dialogContent.append(releaseNotes);

    const noticePath = safeLocalPath(application.links.thirdPartyNotices, ["/signal/"]);
    if (noticePath) {
      const notices = createDetailSection("Third-party notices");
      const noticeLink = element("a", "notice-link", "Read third-party notices →");
      noticeLink.href = noticePath;
      notices.append(noticeLink);
      dialogContent.append(notices);
    }

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function renderApplication(application) {
    const openPath = safeLocalPath(application.links.open, ["/signal/"]);
    const installPath = safeLocalPath(application.links.install, ["/signal/"]);
    const downloadPath = safeLocalPath(application.links.download, ["/downloads/"]);
    if (!openPath || !installPath || !downloadPath) throw new Error("Catalogue link validation failed.");

    const article = element("article", "application catalogue-item");
    article.setAttribute("role", "listitem");
    article.dataset.itemType = "application";
    article.dataset.applicationId = String(application.id);

    const header = element("header", "application-header");
    const icon = element("div", "application-icon");
    const iconImage = document.createElement("img");
    iconImage.src = "../atg-mark.png";
    iconImage.alt = "";
    iconImage.width = 2000;
    iconImage.height = 2000;
    icon.append(iconImage);

    const identity = document.createElement("div");
    identity.append(
      element("p", "application-category", application.category),
      element("h3", "application-title", application.name),
    );
    header.append(icon, identity, element("span", "status", application.status));
    article.append(header);

    const layout = element("div", "application-layout");
    const summary = document.createElement("div");
    summary.append(element("p", "application-description", application.description));
    summary.append(element("h4", "capabilities-title", "Capabilities"));
    addList(summary, application.capabilities, "capability-list");

    const facts = element("dl", "facts");
    facts.append(
      createFact("Version", application.version),
      createFact("Runtime", application.runtime),
      createFact("Internet after installation", application.internetAfterInstallation),
      createFact("Data processing", application.dataProcessing),
      createFact("Files uploaded elsewhere", application.filesUploadedElsewhere),
      createFact("Publisher", application.publisher),
    );
    layout.append(summary, facts);
    article.append(layout);

    const actions = element("div", "application-actions");
    actions.append(
      createAction("Open ATG Signal", openPath, "primary-action"),
      createAction("Install locally", installPath, "secondary-action"),
      createAction(
        "Download offline package",
        downloadPath,
        "secondary-action",
        { downloadName: application.package.filename },
      ),
    );
    const detailsButton = element("button", "text-button", "View permissions and details");
    detailsButton.type = "button";
    detailsButton.addEventListener("click", () => showDetails(application));
    actions.append(detailsButton);
    article.append(actions);

    const packageNote = element("p", "package-note");
    packageNote.append(
      document.createTextNode(`${application.package.filename} · ${application.package.size} · SHA-256 `),
      element("code", "", application.package.sha256),
    );
    article.append(packageNote);
    return article;
  }

  function renderResearch(research) {
    const researchPath = safeLocalPath(research.action?.path, ["/store/base-32m/"]);
    if (!researchPath) throw new Error("Research link validation failed.");

    const article = element("article", "application catalogue-item research-item");
    article.setAttribute("role", "listitem");
    article.dataset.itemType = "research";
    article.dataset.researchId = String(research.id);

    const header = element("header", "application-header");
    const mark = element("div", "application-icon research-mark", "32M");
    mark.setAttribute("aria-hidden", "true");

    const identity = document.createElement("div");
    const category = element("p", "application-category");
    category.append(element("span", "research-badge", research.category));
    identity.append(category, element("h3", "application-title", research.name));

    const checkpoint = element("span", "status research-status", research.status);
    header.append(mark, identity, checkpoint);
    article.append(header);

    const layout = element("div", "application-layout research-layout");
    layout.append(element("p", "application-description", research.description));
    const researchDetails = document.createElement("div");
    const facts = element("dl", "facts research-facts");
    facts.append(
      createFact("Type", research.typeLabel),
      createFact("Version", research.version),
    );
    const privacy = element("div", "research-privacy");
    privacy.append(
      element("p", "detail-label", "Privacy"),
      element("p", "privacy-statement", research.privacy),
    );
    researchDetails.append(facts, privacy);
    layout.append(researchDetails);
    article.append(layout);

    const actions = element("div", "application-actions");
    actions.append(createAction(research.action.label, researchPath, "primary-action"));
    article.append(actions);
    return article;
  }

  function renderCatalogueItem(item) {
    if (item?.type === "application") return renderApplication(item);
    if (item?.type === "research") return renderResearch(item);
    throw new Error("Catalogue item type is invalid.");
  }

  async function loadCatalogue() {
    try {
      const response = await fetch("./catalog.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Catalogue request returned ${response.status}.`);
      const catalogue = await response.json();
      if (!Array.isArray(catalogue.items)) throw new Error("Catalogue data is invalid.");

      const fragment = document.createDocumentFragment();
      for (const item of catalogue.items) fragment.append(renderCatalogueItem(item));
      list.replaceChildren(fragment);
      status.textContent = catalogue.items.length ? "" : "No catalogue items are available yet.";
    } catch (error) {
      status.className = "catalogue-error";
      status.textContent = "The OpenStore catalogue could not be loaded. Please try again.";
      console.error(error);
    }
  }

  dialogClose.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelector(".skip-link")?.addEventListener("click", () => {
    window.requestAnimationFrame(() => document.querySelector("#main-content")?.focus());
  });

  loadCatalogue();
})();
