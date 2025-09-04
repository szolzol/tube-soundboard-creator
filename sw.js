// sw.js - Service Worker for YouTube Soundboard Creator

const CACHE_VERSION = "v1.0.0";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const AUDIO_CACHE = `audio-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  OFFLINE_URL,
  // Add more static files as needed
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => ![STATIC_CACHE, AUDIO_CACHE, API_CACHE].includes(key)
            )
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for extraction API
  if (url.pathname.startsWith("/api/extract")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Cache-first for audio files
  if (url.pathname.startsWith("/audio/")) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // Cache API responses for layouts
  if (url.pathname.startsWith("/api/layouts")) {
    event.respondWith(cacheFirst(request, API_CACHE));
    return;
  }

  // Static assets
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Fallback: try network, then offline page
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return caches.match(OFFLINE_URL);
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match(OFFLINE_URL);
  }
}

// Background sync for pending extractions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-extractions") {
    event.waitUntil(syncPendingExtractions());
  }
});

async function syncPendingExtractions() {
  // Implement logic to sync queued extraction jobs
  // Notify user on completion
  self.registration.showNotification("Soundboard", {
    body: "Pending extractions have been synced!",
    icon: "/icons/icon-192x192.png",
  });
}

// Push notifications for completed jobs
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || "Soundboard", {
    body: data.body || "Your extraction is ready!",
    icon: "/icons/icon-192x192.png",
  });
});

// Storage quota management (simple warning)
async function checkQuota() {
  if ("storage" in navigator && navigator.storage.estimate) {
    const { quota, usage } = await navigator.storage.estimate();
    if (usage / quota > 0.95) {
      self.registration.showNotification("Storage almost full", {
        body: "Please delete old sounds to free up space.",
        icon: "/icons/icon-192x192.png",
      });
    }
  }
}

// Offline indicator for UI
self.addEventListener("message", (event) => {
  if (event.data === "check-offline") {
    event.ports[0].postMessage(!navigator.onLine);
  }
});
