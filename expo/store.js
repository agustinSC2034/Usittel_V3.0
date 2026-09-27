(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExpoStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const NAME = 'usittel-expotan-2026';
  const VERSION = 1;
  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(NAME, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        const entries = db.createObjectStore('entries', { keyPath: 'id' });
        entries.createIndex('dni', 'dni', { unique: true });
        entries.createIndex('syncStatus', 'syncStatus');
        db.createObjectStore('draft', { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(Error('Cerrá otras pestañas de ExpoTan y volvé a intentar.'));
    });
  }
  async function transact(storeName, mode, callback) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      let result;
      try { result = callback(tx.objectStore(storeName)); } catch (error) { tx.abort(); reject(error); return; }
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => { db.close(); reject(tx.error || Error('La operación no se completó.')); };
    });
  }
  async function getFrom(name, key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, 'readonly');
      const request = tx.objectStore(name).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }
  function add(entry) { return transact('entries', 'readwrite', store => store.add(entry)); }
  function put(entry) { return transact('entries', 'readwrite', store => store.put(entry)); }
  function get(id) { return getFrom('entries', id); }
  async function byDni(dni) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('entries', 'readonly');
      const request = tx.objectStore('entries').index('dni').get(dni);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }
  async function all() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('entries', 'readonly');
      const request = tx.objectStore('entries').getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }
  function saveDraft(value) { return transact('draft', 'readwrite', store => store.put({ key: 'active', value })); }
  async function getDraft() { return (await getFrom('draft', 'active'))?.value || null; }
  function clearDraft() { return transact('draft', 'readwrite', store => store.delete('active')); }
  return { add, put, get, byDni, all, saveDraft, getDraft, clearDraft };
});
