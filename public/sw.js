// Card Crew Ledger — Service Worker
// Strategy:
//   /assets/* (hashed JS/CSS/images) → cache-first (safe because filenames change on rebuild)
//   navigation requests               → network-first, fallback to cached app shell
//   supabase.co API                   → network-only (never cache live data)
//   everything else                   → network-only

const CACHE_VERSION = 'v1';
const CACHE_NAME = `card-crew-${CACHE_VERSION}`;

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['/']))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache Supabase API calls — always fresh
  if (url.hostname.endsWith('supabase.co')) return;

  // Hashed static assets (/assets/…) — cache-first
  // Vite content-hashes these filenames so stale is impossible
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation (page loads) — network-first, fall back to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        })
        .catch(() =>
          caches.match('/').then(shell => shell || caches.match(event.request))
        )
    );
    return;
  }

  // Public static files (icons, manifest, badge images not under /assets/)
  // Cache-first with network fallback
  if (
    url.pathname.startsWith('/icon') ||
    url.pathname.startsWith('/apple-touch') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        });
      })
    );
    return;
  }
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'Card Crew Ledger',
    body: 'A new session has been logged!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    url: '/sessions',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    // use defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: { url: data.url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
