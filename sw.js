const CACHE_NAME = 'srivari-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Cloudflare Workers API, Delhivery, Admin mariyu POST calls eppatiki cache avvakudadhu
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/products') ||
    event.request.url.includes('delhivery') ||
    event.request.url.includes('workers.dev')
  ) {
    return;
  }

  // Network-First strategy: Eppudu network nunchi fresh content vastundi
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
