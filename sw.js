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
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%2311151f"/><rect x="42" y="8.5" width="16" height="4" rx="2" fill="%23222b3c"/><rect x="40" y="90" width="20" height="2.6" rx="1.3" fill="%232a3446"/><rect x="20" y="56" width="30" height="28" fill="%23ffffff"/><rect x="50" y="69" width="20" height="15" fill="%23ffffff"/><rect x="48" y="66" width="24" height="3.5" rx="1" fill="%23ff9f1c"/><rect x="52.5" y="72" width="15" height="12" fill="%2311151f"/><path d="M15 56 L35 44 L55 56 Z" fill="%23ff9f1c"/><rect x="24" y="72" width="9" height="12" fill="%2311151f"/><rect x="38" y="62" width="8" height="8" fill="%23ff9f1c"/><g stroke="%23ff9f1c" stroke-width="1.25" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M79.5 84 V26 M83 84 V26"/><path d="M79.5 82 L83 79 L79.5 76 L83 73 L79.5 70 L83 67 L79.5 64 L83 61 L79.5 58 L83 55 L79.5 52 L83 49 L79.5 46 L83 43 L79.5 40 L83 37 L79.5 34 L83 31 L79.5 28"/><path d="M76 84 H86.5"/><path d="M79.5 26 L81.25 19 L83 26"/><path d="M32 26 H83"/><path d="M37 29.5 H79.5"/><path d="M32 26 L37 29.5 L44 26 L51 29.5 L58 26 L65 29.5 L72 26 L79 29.5"/><path d="M81.25 19 L48 26 M81.25 19 L60 26 M81.25 19 L72 26 M81.25 19 L89 26"/><path d="M83 26 H90"/><path d="M48 29.5 V34"/></g><rect x="86.5" y="26.3" width="4.4" height="5.4" rx=".8" fill="%23ff9f1c"/><circle cx="48" cy="29.5" r="1.1" fill="%23ff9f1c"/></svg>',
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
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%2311151f"/><rect x="42" y="8.5" width="16" height="4" rx="2" fill="%23222b3c"/><rect x="40" y="90" width="20" height="2.6" rx="1.3" fill="%232a3446"/><rect x="20" y="56" width="30" height="28" fill="%23ffffff"/><rect x="50" y="69" width="20" height="15" fill="%23ffffff"/><rect x="48" y="66" width="24" height="3.5" rx="1" fill="%23ff9f1c"/><rect x="52.5" y="72" width="15" height="12" fill="%2311151f"/><path d="M15 56 L35 44 L55 56 Z" fill="%23ff9f1c"/><rect x="24" y="72" width="9" height="12" fill="%2311151f"/><rect x="38" y="62" width="8" height="8" fill="%23ff9f1c"/><g stroke="%23ff9f1c" stroke-width="1.25" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M79.5 84 V26 M83 84 V26"/><path d="M79.5 82 L83 79 L79.5 76 L83 73 L79.5 70 L83 67 L79.5 64 L83 61 L79.5 58 L83 55 L79.5 52 L83 49 L79.5 46 L83 43 L79.5 40 L83 37 L79.5 34 L83 31 L79.5 28"/><path d="M76 84 H86.5"/><path d="M79.5 26 L81.25 19 L83 26"/><path d="M32 26 H83"/><path d="M37 29.5 H79.5"/><path d="M32 26 L37 29.5 L44 26 L51 29.5 L58 26 L65 29.5 L72 26 L79 29.5"/><path d="M81.25 19 L48 26 M81.25 19 L60 26 M81.25 19 L72 26 M81.25 19 L89 26"/><path d="M83 26 H90"/><path d="M48 29.5 V34"/></g><rect x="86.5" y="26.3" width="4.4" height="5.4" rx=".8" fill="%23ff9f1c"/><circle cx="48" cy="29.5" r="1.1" fill="%23ff9f1c"/></svg>',
      data: d
    })
  );
});
