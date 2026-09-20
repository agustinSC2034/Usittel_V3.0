document.addEventListener('click', function (e) {
  var link = e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
  if (link && typeof gtag === 'function') {
    gtag('event', 'conversion', {
      'send_to': 'AW-18203865712/GiCdCOKU1uAcEPDko-hD',
      'value': 1.0,
      'currency': 'ARS'
    });
  }
});
