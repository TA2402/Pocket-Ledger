// App-shell cache so Pocket Ledger opens instantly (and works offline) once
// installed. Bump CACHE_NAME whenever you redeploy app.js so phones pick up
// the new version instead of serving a stale cached copy.
const CACHE_NAME = "pocket-ledger-v2";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./storage-shim.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the app shell (so you get updates when online), falling
// back to cache when offline. Everything else (CDN scripts) passes through.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
