// ============================================================
// SERVICE WORKER — MIPyV Red HZT
// Guarda la app en el celular para que funcione sin señal.
// El número de versión NO se cambia acá: se cambia en version.js.
// Cuando version.js cambia, el celular detecta la versión nueva,
// la descarga y la app se recarga sola al volver a la pantalla de inicio.
// ============================================================
importScripts("version.js"); // define APP_VERSION

const CACHE_NAME = "mipyv-cache-" + APP_VERSION;
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./version.js",
  "./app.js",
  "./data.js",
  "./icons.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
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

self.addEventListener("fetch", (e) => {
  // Solo se atienden los archivos propios de la app. Lo que va a la
  // planilla (Apps Script) sale siempre directo a internet.
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then((cached) => cached || fetch(e.request))
  );
});
