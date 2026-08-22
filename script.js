(() => {
  const header = document.querySelector("[data-header]");
  const menu = document.querySelector("[data-mobile-menu]");
  const menuButton = menu?.querySelector("summary");
  const desktopNavigation = window.matchMedia("(min-width: 901px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let headerFrame = 0;
  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 4);
    headerFrame = 0;
  };

  updateHeader();
  window.addEventListener(
    "scroll",
    () => {
      if (!headerFrame) headerFrame = window.requestAnimationFrame(updateHeader);
    },
    { passive: true },
  );

  const setMenuState = (open) => {
    if (!menu || !menuButton) return;
    menu.open = open;
    menuButton.setAttribute("aria-expanded", String(open));
  };

  menu?.addEventListener("toggle", () => {
    menuButton?.setAttribute("aria-expanded", String(menu.open));
  });

  menu?.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => {
      const target = document.querySelector(link.getAttribute("href"));
      setMenuState(false);

      if (target) {
        target.setAttribute("tabindex", "-1");
        window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
        target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu?.open) {
      setMenuState(false);
      menuButton?.focus();
    }
  });

  desktopNavigation.addEventListener("change", ({ matches }) => {
    if (matches) setMenuState(false);
  });

  document.querySelector(".skip-link")?.addEventListener("click", () => {
    window.requestAnimationFrame(() => document.querySelector("#main-content")?.focus());
  });

  if (!reducedMotion.matches && "IntersectionObserver" in window) {
    const revealItems = [...document.querySelectorAll("[data-reveal]")];
    document.documentElement.classList.add("motion-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );

    revealItems.forEach((item) => observer.observe(item));
  }
})();
