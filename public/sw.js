// Service Worker de Voz de Campo: permite abrir la app sin conexión.

// Cambia el número de versión cuando se modifiquen los archivos del shell.
const CACHE = 'vozdecampo-v4';

// Archivos mínimos que se guardan al instalar: shell, iconos, fotos de lote y avatares.
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './assets/images/lote-limon.webp',
  './assets/images/lote-maiz.webp',
  './assets/images/lote-agave.webp',
  './assets/images/lote-general.webp',
  './assets/images/avatar-productor.webp',
  './assets/images/avatar-comprador.webp',
];

// Instala el Service Worker y guarda el shell de la app en caché.
// No se activa solo: espera a que el usuario acepte la actualización (mensaje SKIP_WAITING).
self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

// Activa la versión nueva cuando el usuario pulsa "Actualizar" en la app.
self.addEventListener('message', (evento) => {
  if (evento.data === 'SKIP_WAITING') self.skipWaiting();
});

// Activa la nueva versión y elimina cachés de versiones anteriores.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((clave) => clave !== CACHE).map((clave) => caches.delete(clave)))
      )
      .then(() => self.clients.claim())
  );
});

// Intercepta las peticiones GET del mismo origen.
self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: intenta la red y, si no hay conexión, entrega la app guardada.
  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion).catch(() => caches.match(new URL('./index.html', self.registration.scope).href))
    );
    return;
  }

  // Recursos estáticos: primero caché; si no existe, descarga y guarda una copia.
  evento.respondWith(
    caches.match(peticion).then((enCache) => {
      if (enCache) return enCache;

      return fetch(peticion).then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(peticion, copia));
        }
        return respuesta;
      });
    })
  );
});
