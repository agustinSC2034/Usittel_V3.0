// Keep the existing worker and its relative scope, without a fetch handler.
const scope = self.registration.scope;
const routes = new Set(['inicio', 'facturas', 'servicio', 'cuenta']);
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));

// Register before Firebase so the click on our own notification is handled here.
self.addEventListener('notificationclick', event => {
  if (event.notification.data?.source !== 'mi-usittel') return;
  event.stopImmediatePropagation();
  event.notification.close();
  const route = event.notification.data.route;
  const url = new URL(`?notificacion=${routes.has(route) ? route : 'inicio'}`, scope);
  url.hash = `#/${url.searchParams.get('notificacion')}`;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const portal = windows.find(client => new URL(client.url).pathname === new URL(scope).pathname);
    if (portal) {
      const navigated = await portal.navigate(url.href).catch(() => null);
      if (navigated) return navigated.focus();
    }
    return self.clients.openWindow(url.href);
  })());
});

let pushReadiness = 'firebase-unavailable';
self.addEventListener('message', event => {
  if (event.data === 'mi-usittel-push-ready') event.ports[0]?.postMessage(pushReadiness);
});

try {
  importScripts('./js/push-config.js');
  const { version, firebase: config, vapidKey } = self.miUsittelPush;
  if (vapidKey) {
    const sdk = `https://www.gstatic.com/firebasejs/${version}`;
    importScripts(`${sdk}/firebase-app-compat.js`, `${sdk}/firebase-messaging-compat.js`);
    firebase.initializeApp(config);
    firebase.messaging().onBackgroundMessage(({ data }) => {
      if (!data?.title || !data.body || !/^[a-f0-9]{64}$/.test(data.tag)) return;
      return self.registration.showNotification(data.title, {
        body: data.body,
        icon: new URL('assets/pwa-icon-192.png', scope).href,
        tag: data.tag,
        data: { source: 'mi-usittel', route: data.route }
      });
    });
    pushReadiness = version;
  }
} catch {
  // A failed CDN load must not prevent installing the portal's network-only worker.
  console.warn('No se pudo inicializar Firebase Messaging en el service worker.');
}
