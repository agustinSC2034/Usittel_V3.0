const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../expo/core.js');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../expo/settings.js'), 'utf8'), context);
const cfg = context.window.EXPO_SETTINGS;
assert.equal(cfg.questions.length, 5);
assert.equal(cfg.questionsPerEntry, 3);
assert.equal(new Set(cfg.questions.map(q => q.id)).size, 5);
for (const question of cfg.questions) {
  assert.equal(question.options.length, 4);
  assert.equal(question.options.filter(option => option.id === question.correctId).length, 1);
}
for (let trial = 0; trial < 100; trial++) {
  const selected = core.chooseQuestions(cfg.questions, 3);
  assert.equal(selected.length, 3);
  assert.equal(new Set(selected.map(q => q.id)).size, 3);
  assert.deepEqual(selected.map(q => q.options.find(o => o.id === q.correctId).id), selected.map(q => q.correctId));
  const answers = selected.map(q => ({ selectedId: q.correctId, correctId: q.correctId }));
  assert.equal(core.score(answers), 3);
  answers[0].selectedId = selected[0].options.find(o => o.id !== selected[0].correctId).id;
  assert.equal(core.score(answers), 2);
}
assert.equal(core.normalizeDni(' 12.345.678 '), '12345678');
const valid = { nombre: 'Ana Pérez', dni: '12345678', telefono: '2494123456', direccion: 'Avenida Colón 123', instagramConfirmado: true, privacidadAceptada: true };
assert.equal(core.validate(valid), null);
for (const patch of [{ nombre: 'Ana' }, { dni: '123' }, { telefono: '123' }, { direccion: 'x' }, { instagramConfirmado: false }, { privacidadAceptada: false }]) {
  assert.ok(core.validate({ ...valid, ...patch }));
}
const answer = { pregunta: '¿Pregunta?', respuesta: '=HYPERLINK("bad")', correcta: false, respuestaCorrecta: 'Normal' };
const csv = core.toCsv([{ ...valid, id: 'test', createdAt: '2026-10-02T10:00:00Z', respuestas: [answer, answer, answer], cantidadCorrectas: 0, syncStatus: 'pending', syncedAt: null }]);
assert.ok(csv.startsWith('\uFEFF'));
assert.ok(csv.includes("'=HYPERLINK"));
assert.ok(csv.includes('Pregunta 3'));
assert.equal(csv.split('\r\n').length, 2);
console.log('ExpoTan configuration, random quiz, scoring, validation and CSV passed.');
