const CACHE = 'sugar-tracker-v17';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Network-first for Supabase API and CDN
  if (url.includes('supabase.co') || url.includes('cdn.jsdelivr')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});

// Show notification requested by the main thread
self.addEventListener('message', e => {
  if (e.data?.type !== 'show-notification') return;
  const { title, body, tag, notifType } = e.data;
  const vibrate = notifType === 'both' ? [200,100,200,100,200,100,200]
                : notifType === 'injection' ? [200,100,200]
                : [150,100,150,100,150];
  e.waitUntil(
    self.registration.showNotification(title, {
      body, icon: './icon.svg', badge: './icon.svg',
      tag, vibrate,
      data: { url: self.location.origin + self.location.pathname.replace('sw.js','') },
    })
  );
});

// Open / focus the app when notification is tapped
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow(e.notification.data?.url || './');
    })
  );
});
