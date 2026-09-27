(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExpoSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // Apps Script ContentService does not provide a reliable cross-origin fetch response.
  // A form posts to an invisible iframe; HtmlService sends an acknowledgement to this page.
  let running = false;
  const allowedOrigin = /^https:\/\/(?:script\.google\.com|script\.googleusercontent\.com|[a-z0-9-]+\.googleusercontent\.com)$/i;
  function submit(url, entry, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const nonce = crypto.randomUUID();
      const iframe = document.createElement('iframe');
      const form = document.createElement('form');
      iframe.name = `expo_sync_${nonce.replace(/-/g, '')}`;
      iframe.hidden = true;
      iframe.title = 'Sincronización de ExpoTan';
      form.hidden = true;
      form.method = 'POST';
      form.action = url;
      form.target = iframe.name;
      const input = document.createElement('input');
      input.name = 'payload';
      input.value = JSON.stringify({ entry, nonce, origin: location.origin });
      form.append(input);
      let timer;
      const cleanup = () => { clearTimeout(timer); window.removeEventListener('message', onMessage); form.remove(); iframe.remove(); };
      const onMessage = event => {
        if (!allowedOrigin.test(event.origin)) return;
        const data = event.data;
        if (!data || data.type !== 'usittel-expo-sync' || data.nonce !== nonce || data.id !== entry.id) return;
        cleanup();
        if (data.ok && (data.status === 'created' || data.status === 'exists')) resolve(data);
        else reject(Error(data.message || 'El servidor no confirmó la inscripción.'));
      };
      window.addEventListener('message', onMessage);
      document.body.append(iframe, form);
      timer = setTimeout(() => { cleanup(); reject(Error('Sin confirmación del servidor.')); }, timeoutMs);
      try { form.submit(); } catch (error) { cleanup(); reject(error); }
    });
  }
  async function run(store, settings, onUpdate = () => {}) {
    if (running || !settings.appsScriptUrl || !navigator.onLine) return { skipped: true };
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(settings.appsScriptUrl)) throw Error('La URL de Apps Script debe ser HTTPS y terminar en /exec.');
    running = true;
    let synced = 0;
    let errors = 0;
    try {
      const entries = await store.all();
      for (const item of entries.filter(row => row.syncStatus !== 'synced')) {
        try {
          await submit(settings.appsScriptUrl, item);
          const current = await store.get(item.id);
          if (current) await store.put({ ...current, syncStatus: 'synced', syncedAt: new Date().toISOString() });
          synced++;
        } catch (error) {
          const current = await store.get(item.id);
          if (current) await store.put({ ...current, syncStatus: 'error' });
          errors++;
        }
        onUpdate();
      }
      return { synced, errors };
    } finally { running = false; }
  }
  return { run, submit };
});
