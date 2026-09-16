/**
 * LifeOS service worker.
 *
 * Deliberately small: its job is to make the app installable and to keep the
 * shell usable on a bad connection, not to mirror the whole app offline.
 *
 * Two rules matter for correctness:
 *
 * 1. It never touches cross-origin traffic. Firebase Auth and Firestore live on
 *    other origins — caching their requests would break sign-in and the
 *    real-time subscriptions. `/api/*` is skipped too, so nothing dynamic is
 *    ever answered from a stale cache.
 * 2. It only caches GET requests, and only ever returns a cached *document* for
 *    a navigation. RSC payloads and other same-origin requests go straight to
 *    the network, because replaying a stale payload would render the wrong page
 *    after a deploy.
 *
 * Nothing here touches authentication: pages are static shells whose data is
 * loaded client-side, so a cached shell carries no user data.
 */

const CACHE_NAME = "lifeos-v2";

/** Immutable, content-hashed build output plus the PWA/static assets. */
const PRECACHE_PATHS = [
  "/_next/static/",
  "/pwa/",
  "/images/",
  "/icons/",
];

/**
 * The routes a signed-in user opens first. They are fetched on install so the
 * shell survives a cold offline start, instead of only working once each page
 * has been visited at least once (the runtime rules in `fetch` below).
 */
const SHELL_ROUTES = [
  "",
  "/habits",
  "/goals",
  "/analytics",
  "/notes",
  "/schedule",
  "/profile",
];

const SHELL_URLS = [
  ...SHELL_ROUTES.map((route) => `/${route}`),
  ...SHELL_ROUTES.map((route) => `/ru${route}`),
];

/** Request destinations worth caching even outside the paths above. */
const CACHEABLE_DESTINATIONS = new Set(["font", "image", "script", "style"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // One request per route rather than `addAll`, whose single rejection
      // (offline install, a route that fails to render) would abort the whole
      // batch and leave the cache empty.
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) await cache.put(url, response);
          } catch {
            // Nothing to do: the runtime rules fill the entry in on first visit.
          }
        }),
      );

      // Take over as soon as the new worker is installed; the app is a thin
      // client and its data is fetched from Firestore, so there is no migration
      // to wait on.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => (name === CACHE_NAME ? undefined : caches.delete(name))),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Firebase, the AI routes and anything else we did not put here on purpose.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  const isStaticPath = PRECACHE_PATHS.some((path) => url.pathname.startsWith(path));
  if (isStaticPath || CACHEABLE_DESTINATIONS.has(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/** Fresh when the network answers, last visited copy when it does not. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

/** Serve from cache immediately, refresh it in the background. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  });

  if (cached) {
    // The refresh is fire-and-forget; a failure here changes nothing for the
    // user, who already got the cached copy.
    network.catch(() => undefined);
    return cached;
  }

  return network;
}
