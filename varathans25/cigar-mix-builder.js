(() => {
  "use strict";

  const locale = location.pathname.match(/\/varathans25\/(de|fr|en)(?:\/|$)/)?.[1] ?? "en";
  const copy = {
    en: {
      eyebrow: "Mix & match · 18+",
      title: "Build your own cigar box.",
      intro: "Choose a box of 4 or 6, then combine Patoro and Davidoff cigars your way.",
      four: "Box of 4",
      six: "Box of 6",
      box: "Your box",
      selected: "selected",
      empty: "Choose cigars from the collection below. You may select the same cigar more than once.",
      add: "Add to box",
      full: "Box full",
      remove: "Remove one",
      clear: "Clear box",
      open: "Choose {count} more",
      complete: "Your box is complete",
      notice: "Preview only. Final availability, pricing, age verification and adult delivery must be confirmed before checkout is enabled.",
    },
    de: {
      eyebrow: "Mix & Match · 18+",
      title: "Stellen Sie Ihre Zigarrenbox zusammen.",
      intro: "Wählen Sie eine 4er- oder 6er-Box und kombinieren Sie Patoro und Davidoff nach Ihrem Geschmack.",
      four: "4er-Box",
      six: "6er-Box",
      box: "Ihre Box",
      selected: "ausgewählt",
      empty: "Wählen Sie unten Ihre Zigarren. Dieselbe Zigarre kann mehrfach gewählt werden.",
      add: "Zur Box hinzufügen",
      full: "Box voll",
      remove: "Eine entfernen",
      clear: "Box leeren",
      open: "Noch {count} auswählen",
      complete: "Ihre Box ist vollständig",
      notice: "Nur Vorschau. Verfügbarkeit, Preise, Altersprüfung und Erwachsenen-Zustellung müssen vor dem Checkout bestätigt werden.",
    },
    fr: {
      eyebrow: "Mix & match · 18+",
      title: "Composez votre coffret de cigares.",
      intro: "Choisissez un coffret de 4 ou 6, puis associez les cigares Patoro et Davidoff selon vos envies.",
      four: "Coffret de 4",
      six: "Coffret de 6",
      box: "Votre coffret",
      selected: "sélectionnés",
      empty: "Choisissez vos cigares ci-dessous. Un même cigare peut être sélectionné plusieurs fois.",
      add: "Ajouter au coffret",
      full: "Coffret complet",
      remove: "Retirer un",
      clear: "Vider le coffret",
      open: "Encore {count} à choisir",
      complete: "Votre coffret est complet",
      notice: "Aperçu uniquement. La disponibilité, les prix, le contrôle de l’âge et la livraison avec vérification doivent être confirmés avant l’activation du paiement.",
    },
  }[locale];

  const storageKey = "varathans25_review_cigar_mix";
  let state = { size: 4, items: [] };
  let observerFrame = 0;

  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    if (saved && [4, 6].includes(saved.size) && Array.isArray(saved.items)) {
      state = { size: saved.size, items: saved.items.slice(0, saved.size) };
    }
  } catch {}

  function persist() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  }

  function productFromCard(card) {
    const link = card.querySelector('a[href*="/cigars/"]');
    const image = card.querySelector(".product-image img");
    const name = card.querySelector("h2")?.textContent?.trim();
    const brand = card.querySelector(".eyebrow")?.textContent?.trim();
    if (!link || !image || !name || !brand) return null;
    return {
      id: link.getAttribute("href"),
      name,
      brand,
      image: image.getAttribute("src"),
    };
  }

  function createBuilder() {
    const section = document.createElement("section");
    section.className = "cigar-mix-builder";
    section.dataset.cigarMixBuilder = "true";
    section.innerHTML = `
      <div class="cigar-mix-builder__inner">
        <div class="cigar-mix-builder__intro">
          <span class="cigar-mix-builder__eyebrow"></span>
          <h2></h2>
          <p></p>
          <div class="cigar-mix-builder__sizes" role="group" aria-label="${copy.box}">
            <button class="cigar-mix-builder__size" type="button" data-size="4"></button>
            <button class="cigar-mix-builder__size" type="button" data-size="6"></button>
          </div>
        </div>
        <div class="cigar-mix-builder__workspace" aria-live="polite">
          <div class="cigar-mix-builder__topline">
            <strong></strong>
            <span class="cigar-mix-builder__progress"></span>
          </div>
          <ol class="cigar-mix-builder__slots"></ol>
          <div class="cigar-mix-builder__summary"></div>
          <div class="cigar-mix-builder__footer">
            <span class="cigar-mix-builder__status"></span>
            <button class="cigar-mix-builder__clear" type="button"></button>
          </div>
          <p class="cigar-mix-builder__notice"></p>
        </div>
      </div>`;

    section.querySelector(".cigar-mix-builder__eyebrow").textContent = copy.eyebrow;
    section.querySelector("h2").textContent = copy.title;
    section.querySelector(".cigar-mix-builder__intro p").textContent = copy.intro;
    section.querySelector('[data-size="4"]').textContent = copy.four;
    section.querySelector('[data-size="6"]').textContent = copy.six;
    section.querySelector(".cigar-mix-builder__topline strong").textContent = copy.box;
    section.querySelector(".cigar-mix-builder__clear").textContent = copy.clear;
    section.querySelector(".cigar-mix-builder__notice").textContent = copy.notice;

    section.querySelectorAll("[data-size]").forEach((button) => {
      button.addEventListener("click", () => {
        const size = Number(button.dataset.size);
        state = { size, items: state.items.slice(0, size) };
        persist();
        render();
      });
    });
    section.querySelector(".cigar-mix-builder__clear").addEventListener("click", () => {
      state.items = [];
      persist();
      render();
    });
    return section;
  }

  function decorateCards() {
    document.querySelectorAll(".cigar-card").forEach((card) => {
      if (card.dataset.cigarMixReady === "true") return;
      const product = productFromCard(card);
      if (!product) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cigar-mix-add";
      button.addEventListener("click", () => {
        if (state.items.length >= state.size) return;
        state.items.push(product);
        persist();
        render();
      });
      card.append(button);
      card.dataset.cigarMixReady = "true";
    });
  }

  function renderSummary(builder) {
    const summary = builder.querySelector(".cigar-mix-builder__summary");
    summary.replaceChildren();
    if (!state.items.length) {
      const empty = document.createElement("p");
      empty.className = "cigar-mix-builder__empty";
      empty.textContent = copy.empty;
      summary.append(empty);
      return;
    }

    const groups = new Map();
    state.items.forEach((item) => {
      const current = groups.get(item.id) ?? { ...item, quantity: 0 };
      current.quantity += 1;
      groups.set(item.id, current);
    });
    groups.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cigar-mix-builder__line";
      const title = document.createElement("span");
      title.textContent = item.name;
      const quantity = document.createElement("small");
      quantity.textContent = `× ${item.quantity}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "cigar-mix-builder__remove";
      remove.textContent = copy.remove;
      remove.addEventListener("click", () => {
        const index = state.items.findLastIndex((entry) => entry.id === item.id);
        if (index >= 0) state.items.splice(index, 1);
        persist();
        render();
      });
      row.append(title, quantity, remove);
      summary.append(row);
    });
  }

  function render() {
    const collection = document.querySelector(".cigar-collection");
    if (!collection) return;
    let builder = document.querySelector('[data-cigar-mix-builder="true"]');
    if (!builder) {
      builder = createBuilder();
      collection.parentElement?.insertBefore(builder, collection);
    }

    builder.querySelectorAll("[data-size]").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.size) === state.size));
    });
    builder.querySelector(".cigar-mix-builder__progress").textContent = `${state.items.length} / ${state.size} ${copy.selected}`;

    const slots = builder.querySelector(".cigar-mix-builder__slots");
    slots.replaceChildren();
    for (let index = 0; index < state.size; index += 1) {
      const slot = document.createElement("li");
      slot.className = "cigar-mix-builder__slot";
      const item = state.items[index];
      if (item) {
        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.name;
        slot.append(image);
      } else {
        const number = document.createElement("span");
        number.textContent = String(index + 1).padStart(2, "0");
        slot.append(number);
      }
      slots.append(slot);
    }

    renderSummary(builder);
    const remaining = state.size - state.items.length;
    builder.querySelector(".cigar-mix-builder__status").textContent = remaining
      ? copy.open.replace("{count}", String(remaining))
      : copy.complete;
    builder.querySelector(".cigar-mix-builder__clear").disabled = state.items.length === 0;

    decorateCards();
    document.querySelectorAll(".cigar-mix-add").forEach((button) => {
      button.disabled = remaining === 0;
      button.textContent = remaining === 0 ? copy.full : copy.add;
    });
  }

  const scheduleRender = () => {
    cancelAnimationFrame(observerFrame);
    observerFrame = requestAnimationFrame(() => {
      render();
    });
  };

  new MutationObserver(scheduleRender).observe(document.querySelector("main") ?? document.body, {
    childList: true,
    subtree: true,
  });
  scheduleRender();
})();
