const SW_VERSION = '1.1.0';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Receive notification requests from the main page
self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, taskId } = e.data;
    self.registration.showNotification(title, {
      body,
      tag: tag || ('task-' + taskId),
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%2311151F"/><rect x="16" y="12" width="38" height="4" rx="1" fill="%23FF9F1C"/><rect x="42" y="12" width="5" height="38" fill="%23FF9F1C"/><rect x="49" y="16" width="6" height="5" fill="%23FF9F1C"/><rect x="20" y="16" width="2" height="10" fill="%23FF9F1C"/><rect x="17" y="26" width="8" height="3" rx="1" fill="%23FF9F1C"/><path d="M8 40 L21 30 L34 40 Z" fill="%23FF9F1C"/><rect x="12" y="40" width="18" height="12" rx="1" fill="%23ffffff"/><rect x="18.5" y="45" width="5" height="7" rx="0.5" fill="%2311151F"/><rect x="38" y="50" width="16" height="3" rx="1.5" fill="%23FF9F1C"/></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="%2311151F"/></svg>',
      vibrate: [200, 100, 200],
      data: { taskId }
    });
  }
});

// Open/focus the app when notification is tapped
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Web Push (for future server-side push support)
self.addEventListener('push', e => {
  const d = e.data?.json?.() || {};
  e.waitUntil(
    self.registration.showNotification(d.title || 'Planory Erinnerung', {
      body: d.body || '',
      tag: d.tag || 'planory-push',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%2311151F"/><rect x="16" y="12" width="38" height="4" rx="1" fill="%23FF9F1C"/><rect x="42" y="12" width="5" height="38" fill="%23FF9F1C"/><rect x="49" y="16" width="6" height="5" fill="%23FF9F1C"/><rect x="20" y="16" width="2" height="10" fill="%23FF9F1C"/><rect x="17" y="26" width="8" height="3" rx="1" fill="%23FF9F1C"/><path d="M8 40 L21 30 L34 40 Z" fill="%23FF9F1C"/><rect x="12" y="40" width="18" height="12" rx="1" fill="%23ffffff"/><rect x="18.5" y="45" width="5" height="7" rx="0.5" fill="%2311151F"/><rect x="38" y="50" width="16" height="3" rx="1.5" fill="%23FF9F1C"/></svg>',
      data: d
    })
  );
});
