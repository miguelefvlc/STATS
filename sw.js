const CACHE_NAME = 'nba-stats-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Usamos catch para que si un recurso falla (ej. los iconos aún no existen), no se rompa la instalación
        return cache.addAll(urlsToCache).catch(err => console.warn('Cache addAll failed', err));
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si hay conexión y la respuesta es válida, la devolvemos y actualizamos la caché
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si no hay conexión (offline), intentamos servir desde la caché
        return caches.match(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
