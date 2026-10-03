// Guarda la aplicación en el teléfono para que abra sin señal.
// Las cargas no pasan por acá: las maneja la aplicación con su propia cola.
const CACHE = 'manifiestos-piloto-2';
const ARCHIVOS = ['./', './index.html', './manifest.json', './icono-192.png', './icono-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // el sistema (Apps Script) siempre va directo
  // Primero la red (para recibir actualizaciones); sin señal, la copia guardada
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
