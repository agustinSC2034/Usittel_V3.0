const assert = require('node:assert/strict');
const { indexedDB } = require('fake-indexeddb');
const core = require('../expo/core.js');

global.indexedDB = indexedDB;
global.navigator = { onLine: false };
global.location = { origin: 'https://usittel.com.ar' };

const messageListeners = new Set();
global.window = {
  addEventListener(type, listener) { if (type === 'message') messageListeners.add(listener); },
  removeEventListener(type, listener) { if (type === 'message') messageListeners.delete(listener); }
};
global.document = {
  body: { append() {} },
  createElement(type) {
    if (type === 'input') return { name: '', value: '' };
    if (type === 'iframe') return { name: '', hidden: false, title: '', remove() {} };
    if (type === 'form') return {
      append(input) { this.input = input; },
      remove() {},
      submit() {
        const { entry, nonce } = JSON.parse(this.input.value);
        setImmediate(() => {
          for (const listener of messageListeners) listener({
            origin: 'https://script.google.com',
            data: { type: 'usittel-expo-sync', id: entry.id, nonce, ok: true, status: 'created' }
          });
        });
      }
    };
    throw Error(`Elemento inesperado: ${type}`);
  }
};

const store = require('../expo/store.js');
const sync = require('../expo/sync.js');
const settings = { appsScriptUrl: 'https://script.google.com/macros/s/expo-test/exec' };
const answers = [1, 2, 3].map(index => ({
  questionId: `q${index}`, pregunta: `Pregunta ${index}`, respuesta: `Respuesta ${index}`,
  correcta: index === 1, respuestaCorrecta: `Respuesta correcta ${index}`
}));
function entry(id, dni, status = 'pending') {
  return {
    id, createdAt: '2026-10-02T10:00:00.000Z', nombre: `Participante ${dni}`,
    dni, telefono: '2494123456', direccion: 'Calle de prueba 123',
    preguntasRespondidas: answers.map(answer => answer.questionId), respuestas: answers,
    cantidadCorrectas: 1, syncStatus: status, syncedAt: null
  };
}

(async () => {
  const first = entry('0d21e38a-764e-4b35-aedf-3231fd0f1301', '99999999');
  await store.add(first);
  assert.equal((await store.all()).length, 1, 'add debe dejar una inscripción local');

  global.navigator.onLine = true;
  assert.deepEqual(await sync.run(store, settings), { synced: 1, errors: 0 });
  let rows = await store.all();
  assert.equal(rows.length, 1, 'sincronizar no debe eliminar la inscripción');
  assert.equal(rows[0].syncStatus, 'synced');
  assert.ok(rows[0].syncedAt);

  delete require.cache[require.resolve('../expo/store.js')];
  const reopenedStore = require('../expo/store.js');
  rows = await reopenedStore.all();
  assert.equal(rows.length, 1, 'reabrir IndexedDB debe conservar la inscripción');
  const csvSynced = core.toCsv(rows);
  assert.ok(csvSynced.includes('Participante 99999999'));
  assert.ok(csvSynced.includes('synced'));
  assert.ok(!csvSynced.includes('Instagram confirmado'));
  assert.ok(!csvSynced.includes('Privacidad aceptada'));

  global.navigator.onLine = false;
  const second = entry('1d21e38a-764e-4b35-aedf-3231fd0f1301', '88888888');
  await reopenedStore.add(second);
  assert.equal((await sync.run(reopenedStore, settings)).skipped, true);
  rows = await reopenedStore.all(); // La administración lee exactamente esta lista.
  assert.equal(rows.length, 2);
  assert.equal(rows.filter(row => row.syncStatus === 'pending').length, 1);
  assert.ok(core.toCsv(rows).includes('Participante 88888888'));

  global.navigator.onLine = true;
  assert.deepEqual(await sync.run(reopenedStore, settings), { synced: 1, errors: 0 });
  rows = await reopenedStore.all();
  assert.equal(rows.length, 2, 'volver a Internet no debe borrar registros');
  assert.equal(rows.filter(row => row.syncStatus === 'synced').length, 2);

  await reopenedStore.add(entry('3d21e38a-764e-4b35-aedf-3231fd0f1301', '77777777', 'error'));
  rows = await reopenedStore.all();
  const completeCsv = core.toCsv(rows);
  assert.equal(rows.length, 3);
  assert.ok(completeCsv.includes('Participante 77777777'));
  assert.ok(completeCsv.includes('error'));

  await assert.rejects(
    reopenedStore.add(entry('2d21e38a-764e-4b35-aedf-3231fd0f1301', '88888888')),
    error => error?.name === 'ConstraintError'
  );
  assert.equal((await reopenedStore.all()).length, 3, 'DNI duplicado no debe agregar otra inscripción');
  console.log('ExpoTan IndexedDB persistence, synchronization, offline recovery, CSV and unique DNI passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
