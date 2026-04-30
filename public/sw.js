self.addEventListener('push', function (event) {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/next.svg',
      badge: '/next.svg',
      data: { url: data.url || '/gastos-pendientes' },
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/gastos-pendientes';
  event.waitUntil(clients.openWindow(url));
});
