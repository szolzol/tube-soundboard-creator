const CACHE_NAME = "soundboard-cache-v1";
const OFFLINE_URL = "/offline.html";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  // Add more static assets here
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response || fetch(event.request).catch(() => caches.match(OFFLINE_URL))
      );
    })
  );
});

// Background sync and push notification stubs
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending") {
    // TODO: handle background sync
  }
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Tube Soundboard", {
      body: data.body || "Extraction completed!",
      icon: "/icons/icon-192.png",
    })
  );
});
