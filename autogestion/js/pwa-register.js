// The worker is scoped to this portal and never handles requests or stores data.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
      console.warn('No se pudo registrar el service worker de Mi USITTEL.', error);
    });
  });
}
