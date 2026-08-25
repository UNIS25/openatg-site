(() => {
  const header = document.querySelector("[data-header]");
  const menu = document.querySelector("[data-mobile-menu]");
  const menuButton = menu?.querySelector("summary");
  const openStoreMenus = [...document.querySelectorAll("[data-openstore-menu]")];
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
    if (!menu.open) {
      for (const openStoreMenu of openStoreMenus) {
        if (menu.contains(openStoreMenu)) openStoreMenu.open = false;
      }
    }
  });

  const setOpenStoreMenuState = (openStoreMenu, open) => {
    const button = openStoreMenu.querySelector(":scope > summary");
    openStoreMenu.open = open;
    button?.setAttribute("aria-expanded", String(open));
  };

  for (const openStoreMenu of openStoreMenus) {
    const button = openStoreMenu.querySelector(":scope > summary");
    button?.setAttribute("aria-expanded", String(openStoreMenu.open));
    openStoreMenu.addEventListener("toggle", () => {
      button?.setAttribute("aria-expanded", String(openStoreMenu.open));
      if (!openStoreMenu.open) return;
      for (const otherMenu of openStoreMenus) {
        if (otherMenu !== openStoreMenu && !otherMenu.contains(openStoreMenu)) {
          setOpenStoreMenuState(otherMenu, false);
        }
      }
    });
  }

  menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      const linkUrl = new URL(link.href, window.location.href);
      const target =
        linkUrl.origin === window.location.origin &&
        linkUrl.pathname === window.location.pathname &&
        linkUrl.hash
          ? document.querySelector(linkUrl.hash)
          : null;
      setMenuState(false);

      if (target) {
        target.setAttribute("tabindex", "-1");
        window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
        target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openStoreMenu = openStoreMenus.find((candidate) => candidate.open);
    if (openStoreMenu) {
      const button = openStoreMenu.querySelector(":scope > summary");
      setOpenStoreMenuState(openStoreMenu, false);
      button?.focus();
    } else if (menu?.open) {
      setMenuState(false);
      menuButton?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    for (const openStoreMenu of openStoreMenus) {
      if (openStoreMenu.open && !openStoreMenu.contains(event.target)) {
        setOpenStoreMenuState(openStoreMenu, false);
      }
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
