// Firebase Messaging Service Worker for JARVIS
// Config is passed via URL search params during registration
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Parse config from SW script URL query string
const params = new URL(self.location.href).searchParams;
const config = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId')
};

if (config.apiKey && config.projectId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(function(payload) {
    console.log('[JARVIS SW] Background message:', payload);

    const title = payload.notification?.title || 'JARVIS';
    const options = {
      body: payload.notification?.body || '',
      tag: payload.data?.tag || 'jarvis-notification',
      data: {
        url: payload.data?.url || '/',
        ...payload.data
      },
      vibrate: [100, 50, 100]
    };

    return self.registration.showNotification(title, options);
  });
} else {
  console.error('[JARVIS SW] No Firebase config in URL params');
}

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        if (windowClients[i].url.indexOf(urlToOpen) !== -1 && 'focus' in windowClients[i]) {
          return windowClients[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
