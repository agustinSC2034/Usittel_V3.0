(() => {
  if (window.__usittelAttentionEntry) return;
  window.__usittelAttentionEntry = true;
  if (!matchMedia('(min-width: 641px)').matches) return;

  const destination = new URL('../', location.href);
  destination.searchParams.set('chat', 'open');
  const intent = new URLSearchParams(location.search).get('intent');
  if (intent) destination.searchParams.set('intent', intent);
  location.replace(destination.href);
})();
