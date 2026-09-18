/* Converter service worker.
   App shell is cached so the app opens instantly and works without a signal.
   Currency rates are always fetched from the network (and cached in
   localStorage by the page itself, not here). */

const VERSION = "v1";
const SHELL = "converter-shell-" + VERSION;

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache exchange rates.
  if (url.hostname.indexOf("frankfurter") !== -1) {
    event.respondWith(fetch(req));
    return;
  }

  // Same-origin shell: cache first, then refresh in the background.
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
