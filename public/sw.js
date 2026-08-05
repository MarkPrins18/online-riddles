// Deliberately does nothing beyond activating — this is a live multiplayer
// game, so a service worker that cached pages/data could easily end up
// serving stale room/question/answer state during an active round. It
// exists purely so the app satisfies PWA installability (Add to Home
// Screen) without any offline-caching behavior.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
