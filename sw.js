// Service worker: guarda la app en el teléfono para que funcione sin señal (interior mina).
// Al publicar una versión nueva (p. ej. data.js actualizado) cambie VERSION para forzar la actualización.
const VERSION = "cc101-v3";
const FILES = ["./", "index.html", "styles.css", "app.js", "data.js", "lib/pdf-lib.min.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // red primero (para tomar datos nuevos), caché si no hay señal
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});
