// Service worker: guarda la app en el teléfono para que funcione sin señal (interior mina).
// Al publicar una versión nueva (p. ej. data.js actualizado) cambie VERSION para forzar la actualización.
const VERSION = "cc101-v5";
const FILES = ["./", "index.html", "styles.css", "app.js", "data.js", "pdf-lib.min.js", "manifest.webmanifest",
  "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => {
  // cada archivo por separado: si falta uno, el resto igual queda guardado
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});
