const cacheName = "tp2PWA-v1";
const staticCacheName = "tp2PWA-static-v1";
const dynamicCacheName = "tp2PWA-dynamic-v1";

const cacheAssets = [
  "./",
  "./index.html",
  "./show.html",
  "./css/styles.css",
  "./js/main.js",
  "./js/show.js",
  "./manifest.json",
  "./icons/logo.png",
  "./icons/android-chrome-192x192.png",
  "./icons/android-chrome-512x512.png",
  "./icons/apple-touch-icon.png",
  "./favicon.ico",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"
];

self.addEventListener("install", function (event) {
  console.log("Service Worker: Installing...", event);
  
  self.skipWaiting();

  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      console.log("Service Worker: Caching static assets");
      return cache.addAll(cacheAssets);
    }).catch(function(error) {
      console.error("Service Worker: Error caching static assets", error);
    })
  );
});

self.addEventListener("activate", function (event) {
  console.log("Service Worker: Activating...", event);
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cache) {
          if (cache !== staticCacheName && cache !== dynamicCacheName) {
            console.log("Service Worker: Clearing old cache", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  const requestUrl = new URL(event.request.url);
  
  if (cacheAssets.some(asset => event.request.url.includes(asset.replace('./', '')))) {
    event.respondWith(
      caches.match(event.request).then(function (response) {
        return response || fetch(event.request);
      })
    );
    return;
  }
  
  if (requestUrl.hostname === 'api.tvmaze.com' || requestUrl.hostname === 'api.breakingbadquotes.xyz') {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          const responseClone = response.clone();
          
          if (response.status === 200) {
            caches.open(dynamicCacheName).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          
          return response;
        })
        .catch(function() {
          return caches.match(event.request).then(function(response) {
            if (response) {
              return response;
            }
            
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            return new Response('Offline - content not available', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      }
      
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseToCache = response.clone();
        
        caches.open(dynamicCacheName).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(function() {
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
        
        return new Response('Resource not available offline', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

self.addEventListener('push', function(event) {
  console.log('Service Worker: Push received', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New content available!',
    icon: './icons/android-chrome-192x192.png',
    badge: './icons/android-chrome-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: './icons/android-chrome-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './icons/android-chrome-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('TV Shows PWA', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  } else if (event.action === 'close') {
    event.notification.close();
  } else {
    event.waitUntil(
      clients.matchAll().then(function(clientList) {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('./');
      })
    );
  }
});

self.addEventListener('sync', function(event) {
  console.log('Service Worker: Background sync', event);
  
  if (event.tag === 'favorite-sync') {
    event.waitUntil(
      syncFavorites()
    );
  }
});

function syncFavorites() {
  return new Promise((resolve) => {
    console.log('Service Worker: Syncing favorites...');
    setTimeout(() => {
      console.log('Service Worker: Favorites synced');
      resolve();
    }, 1000);
  });
}

self.addEventListener('periodicsync', function(event) {
  console.log('Service Worker: Periodic sync', event);
  
  if (event.tag === 'content-sync') {
    event.waitUntil(
      updateContent()
    );
  }
});

function updateContent() {
  return fetch('https://api.tvmaze.com/shows')
    .then(response => response.json())
    .then(data => {
      return caches.open(dynamicCacheName).then(cache => {
        return cache.put('https://api.tvmaze.com/shows', new Response(JSON.stringify(data)));
      });
    })
    .catch(error => {
      console.log('Service Worker: Failed to update content', error);
    });
}
