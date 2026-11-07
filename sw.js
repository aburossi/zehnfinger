/* Zehnfinger Service Worker
   Online: holt immer die neuste Version vom Server (Updates sofort sichtbar) und legt sie ab.
   Offline: nimmt die abgelegte Version.
   Neue Dateien in ASSETS eintragen und CACHE hochzählen. */
const CACHE = "zehnfinger-v3";
const FONT_CACHE = "zehnfinger-fonts";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./data.js",
  "./logic.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const timeout = ms => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Eigene Dateien: zuerst Netz (mit 4 s Geduld), sonst Ablage.
  if (url.origin === self.location.origin) {
    const network = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    });
    e.respondWith(
      Promise.race([network, timeout(4000)]).catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === "navigate") { const home = await caches.match("./index.html"); if (home) return home; }
        return network;
      })
    );
    return;
  }

  // Schrift von Google Fonts: aus der Ablage, im Hintergrund auffrischen.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const fresh = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || fresh;
    }));
  }
});
