// Copy into a standalone Google Apps Script project and set SPREADSHEET_ID.
// Deploy as a web app: execute as you; access: anyone. See ../README.md.
const SPREADSHEET_ID = 'PEGAR_ID_DE_LA_PLANILLA';
const SHEET_NAME = 'Participantes';
const HEADERS = [
  'Fecha y hora', 'Nombre completo', 'DNI', 'Teléfono', 'Dirección',
  'Pregunta 1', 'Respuesta 1', 'Correcta 1', 'Pregunta 2', 'Respuesta 2', 'Correcta 2',
  'Pregunta 3', 'Respuesta 3', 'Correcta 3', 'Total correctas', 'Instagram confirmado',
  'ID inscripción', 'Privacidad aceptada'
];

function doPost(event) {
  let id = '';
  let nonce = '';
  let origin = '*';
  try {
    const raw = String(event && event.parameter && event.parameter.payload || '');
    if (raw.length > 20000) throw new Error('Solicitud demasiado grande');
    const request = JSON.parse(raw);
    id = String(request.entry && request.entry.id || '');
    nonce = String(request.nonce || '');
    origin = /^https?:\/\/(?:localhost|127\.0\.0\.1|usittel\.com\.ar)(?::\d+)?$/.test(String(request.origin || '')) ? request.origin : '*';
    const entry = request.entry;
    validateEntry_(entry);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('Servidor ocupado; intentá nuevamente');
    let status;
    try {
      const sheet = getSheet_();
      const last = sheet.getLastRow();
      if (last > 1) {
        const values = sheet.getRange(2, 3, last - 1, 15).getValues();
        const duplicate = values.some(row => String(row[0]) === String(entry.dni) || String(row[14]) === id);
        if (duplicate) status = 'exists';
      }
      if (!status) {
        const answers = entry.respuestas;
        const cells = answers.flatMap(answer => [safeCell_(answer.pregunta), safeCell_(answer.respuesta), answer.correcta ? 'Sí' : 'No']);
        sheet.appendRow([
          entry.createdAt, safeCell_(entry.nombre), String(entry.dni), safeCell_(entry.telefono), safeCell_(entry.direccion),
          ...cells, Number(entry.cantidadCorrectas), entry.instagramConfirmado ? 'Sí' : 'No', id,
          entry.privacidadAceptada ? 'Sí' : 'No'
        ]);
        SpreadsheetApp.flush();
        status = 'created';
      }
    } finally { lock.releaseLock(); }
    return reply_({ type: 'usittel-expo-sync', id, nonce, ok: true, status }, origin);
  } catch (error) {
    return reply_({ type: 'usittel-expo-sync', id, nonce, ok: false, message: String(error.message || 'Error') }, origin);
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function validateEntry_(entry) {
  if (!entry || !/^[0-9a-f-]{36}$/i.test(String(entry.id || ''))) throw new Error('ID inválido');
  if (!/^\d{7,9}$/.test(String(entry.dni || ''))) throw new Error('DNI inválido');
  if (String(entry.nombre || '').trim().length < 5 || String(entry.nombre).length > 100) throw new Error('Nombre inválido');
  if (String(entry.telefono || '').length > 30 || String(entry.direccion || '').length > 140) throw new Error('Datos inválidos');
  if (!entry.instagramConfirmado || !entry.privacidadAceptada) throw new Error('Falta confirmación');
  if (!Array.isArray(entry.respuestas) || entry.respuestas.length !== 3 || new Set(entry.respuestas.map(a => a.questionId)).size !== 3) throw new Error('Respuestas inválidas');
  if (!entry.respuestas.every(a => typeof a.pregunta === 'string' && a.pregunta.length < 200 && typeof a.respuesta === 'string' && a.respuesta.length < 200 && typeof a.correcta === 'boolean')) throw new Error('Respuestas inválidas');
  if (entry.cantidadCorrectas !== entry.respuestas.filter(a => a.correcta).length) throw new Error('Puntaje inválido');
}

function safeCell_(value) {
  const text = String(value == null ? '' : value);
  return /^[\s\u0000-\u001f]*[=+@\-]/.test(text) ? "'" + text : text;
}

function reply_(message, origin) {
  const data = JSON.stringify(message).replace(/</g, '\\u003c');
  const target = JSON.stringify(origin).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.parent.postMessage(' + data + ',' + target + ');<\/script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
