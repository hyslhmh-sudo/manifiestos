// Guarda la aplicación en el teléfono para que abra sin señal.
// Las cargas no pasan por acá: las maneja la aplicación con su propia cola.
const CACHE = 'manifiestos-piloto-10';
const ARCHIVOS = ['./', './index.html', './manifest.json', './icono-192.png', './icono-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // el sistema (Apps Script) siempre va directo
  // Primero la red (para recibir actualizaciones); sin señal, la copia guardada
  // Solo se guardan respuestas buenas. Los módulos con ?v= se guardan sin el ?v= (una sola copia por archivo, el caché no crece con cada versión).
  // Sin señal, una página que no está guardada abre Mi establecimiento; un script o imagen que no está guardado da error (no se le entrega una página en su lugar).
  const clave = u.search.startsWith('?v=') ? new Request(u.origin + u.pathname) : e.request;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(clave, c)); } return r; })
    .catch(() => caches.match(clave).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
