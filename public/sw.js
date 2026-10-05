const CACHE_VERSION = "flow-resilience-v1";
const PAGE_CACHE = CACHE_VERSION + "-pages";
const ASSET_CACHE = CACHE_VERSION + "-assets";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      await Promise.allSettled([
        cache.add(new Request("/", { cache: "reload" })),
        cache.add(new Request("/flow/tokens.css", { cache: "reload" })),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("flow-resilience-") && ![PAGE_CACHE, ASSET_CACHE].includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

async function networkWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const response = await networkWithTimeout(request, timeoutMs);
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request)
      .then((response) => {
        if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      })
      .catch(() => {});
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE, 4500));
    return;
  }

  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".json") ||
    url.pathname.startsWith("/capacity/data/")
  ) {
    event.respondWith(networkFirst(request, ASSET_CACHE, 5000));
    return;
  }

  if (
    url.pathname.startsWith("/flow/") ||
    url.pathname.startsWith("/capacity/") ||
    url.pathname.startsWith("/last-admissions/")
  ) {
    event.respondWith(cacheFirst(request));
  }
});