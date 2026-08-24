"use strict";

const CACHE_NAME = "atg-signal-v1.0.0";
const PRODUCTION_ASSETS = Object.freeze([
  "/atg-mark-transparent.png",
  "/signal/",
  "/signal/index.html",
  "/signal/signal.css",
  "/signal/app.js",
  "/signal/signal-core.mjs",
  "/signal/report-downloads.mjs",
  "/signal/pwa.js",
  "/signal/manifest.webmanifest",
  "/signal/icons/icon-192.png",
  "/signal/icons/icon-512.png",
  "/signal/icons/icon-maskable-512.png",
  "/signal/vendor/xlsx.full.min.js",
  "/signal/vendor/docx.umd.js"
]);
const PRODUCTION_PATHS = new Set(PRODUCTION_ASSETS);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRODUCTION_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("atg-signal-") && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  const assetPath =
    event.request.mode === "navigate" &&
    (requestUrl.pathname === "/signal/" || requestUrl.pathname === "/signal/index.html")
      ? "/signal/"
      : requestUrl.pathname;
  if (!PRODUCTION_PATHS.has(assetPath)) return;

  event.respondWith(
    caches.match(assetPath).then((cachedResponse) => cachedResponse || fetch(event.request)),
  );
});
