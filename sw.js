// Service worker « Analyse Echecs » : l'appli fonctionne hors ligne (appli, Stockfish, pièces, ouvertures).
const V = 'echecs-app-v1';
const CDN_CACHE = 'echecs-cdn-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];
const CDN = /^https:\/\/(unpkg\.com|cdn\.jsdelivr\.net|raw\.githubusercontent\.com)\//;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== CDN_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    // l'appli elle-même : réseau d'abord (mises à jour), copie locale si hors ligne
    e.respondWith(Promise.race([fetch(r), timeout(6000)]).then((res) => {
      if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match('./index.html'))));
    return;
  }
  if (CDN.test(r.url)) {
    // fichiers versionnés (Stockfish, pièces, ouvertures) : copie locale d'abord
    e.respondWith(caches.open(CDN_CACHE).then(async (c) => {
      const m = await c.match(r);
      if (m) return m;
      const res = await fetch(r);
      if (res.ok) c.put(r, res.clone());
      return res;
    }));
  }
  // chess.com, Lichess : toujours le réseau
});
