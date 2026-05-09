// ============================================================
// Balancing Act — Service Worker
// Handles push notifications, notification clicks, caching,
// offline support, and background sync for metric entries
// ============================================================

const CACHE_NAME = 'balancing-act-v2';

// Only cache truly static assets — NOT pages.
// Next.js handles page caching via _next/static/ hashed filenames.
// Caching pages causes stale content after deploys.
const APP_SHELL = [
  '/manifest.json',
  '/icon-192.png',
];

// ---- IndexedDB helpers for offline sync queue ----

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('balancing-act-sync', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending-entries')) {
        db.createObjectStore('pending-entries', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueEntry(body) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-entries', 'readwrite');
    tx.objectStore('pending-entries').add({ body, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function drainQueue() {
  const db = await openSyncDB();
  const entries = await new Promise((resolve, reject) => {
    const tx = db.transaction('pending-entries', 'readonly');
    const req = tx.objectStore('pending-entries').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (!entries.length) return;

  for (const entry of entries) {
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.body),
      });

      if (res.ok) {
        // Remove from queue on success
        const delTx = db.transaction('pending-entries', 'readwrite');
        delTx.objectStore('pending-entries').delete(entry.id);
        await new Promise((resolve) => { delTx.oncomplete = resolve; });
      }
    } catch {
      // Still offline — stop trying, we'll retry later
      break;
    }
  }
}

// ---- Install — cache the app shell ----

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ---- Activate — clean up old caches ----

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch — routing strategy ----

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip API calls — let them go to network (app handles failures)
  // Exception: intercept POST /api/entries to queue when offline
  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'POST' && url.pathname === '/api/entries') {
      event.respondWith(handleEntryPost(request));
    }
    return;
  }

  // Static assets (JS, CSS, images, fonts) — cache-first (stale-while-revalidate)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Page navigations — network-first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else — network-first
  event.respondWith(networkFirst(request));
});

function isStaticAsset(pathname) {
  return /\.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/i.test(pathname) ||
    pathname.startsWith('/_next/static/');
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || networkFetch;
}

async function handleEntryPost(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch {
    // Offline — queue the entry for later
    const body = await request.json();
    await enqueueEntry(body);

    // Register for background sync if available
    if (self.registration.sync) {
      await self.registration.sync.register('sync-entries');
    }

    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ---- Background sync ----

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-entries') {
    event.waitUntil(drainQueue());
  }
});

// Fallback: periodic check when online (for browsers without Background Sync)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ONLINE') {
    drainQueue();
  }
});

// ---- Push notifications ----

self.addEventListener('push', (event) => {
  let data = { title: 'Balancing Act', body: 'Time for a check-in!', url: '/chat' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'default',
    data: { url: data.url || '/chat' },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ---- Notification click ----

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});
