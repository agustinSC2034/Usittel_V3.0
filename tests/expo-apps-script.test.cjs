const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const rows = [];
const sheet = {
  getLastRow: () => rows.length,
  appendRow: row => rows.push(row),
  getRange: (start, column, count, width) => ({ getValues: () => rows.slice(start - 1, start - 1 + count).map(row => row.slice(column - 1, column - 1 + width)) })
};
const context = {
  SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush: () => {} },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
  HtmlService: { XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }, createHtmlOutput: html => ({ html, setXFrameOptionsMode() { return this; } }) }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('expo/apps-script/Code.gs', 'utf8'), context);
const entry = {
  id: '0d21e38a-764e-4b35-aedf-3231fd0f1301', createdAt: '2026-10-02T10:00:00.000Z',
  nombre: 'Prueba Local', dni: '99999999', telefono: '2494000000', direccion: 'Calle Prueba 123',
  instagramConfirmado: true, privacidadAceptada: true,
  respuestas: [1, 2, 3].map(i => ({ questionId: `q${i}`, pregunta: `Pregunta ${i}`, respuesta: `Respuesta ${i}`, correcta: i === 1 })),
  cantidadCorrectas: 1
};
const send = value => context.doPost({ parameter: { payload: JSON.stringify({ entry: value, nonce: 'test-nonce', origin: 'http://localhost:8000' }) } }).html;
assert.match(send(entry), /"status":"created"/);
assert.equal(rows.length, 2); // Header + one participant.
assert.match(send(entry), /"status":"exists"/);
assert.equal(rows.length, 2);
assert.match(send({ ...entry, id: '1d21e38a-764e-4b35-aedf-3231fd0f1301' }), /"status":"exists"/);
assert.equal(rows.length, 2);
assert.match(send({ ...entry, dni: '88888888' }), /"status":"exists"/);
assert.equal(rows.length, 2);
assert.match(send({ ...entry, id: '1d21e38a-764e-4b35-aedf-3231fd0f1301', dni: '88888888', nombre: '=BAD FORMULA' }), /"status":"created"/);
assert.equal(rows.length, 3);
assert.equal(rows[2][1], "'=BAD FORMULA");
console.log('ExpoTan Apps Script validation, duplicate prevention and Sheet escaping passed.');
