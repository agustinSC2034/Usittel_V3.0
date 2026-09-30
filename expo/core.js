(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExpoCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function shuffle(items, random = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function chooseQuestions(bank, count, random = Math.random) {
    if (!Array.isArray(bank) || count < 1 || count > bank.length || new Set(bank.map(q => q.id)).size !== bank.length) throw Error('Banco inválido');
    return Array.from(bank).slice(0, count).map(q => ({ ...q, options: Array.from(q.options, option => ({ ...option })) }));
  }
  function score(answers) { return answers.filter(a => a.correcta ?? a.selectedId === a.correctId).length; }
  function normalizeDni(value) { return String(value || '').replace(/\D/g, ''); }
  function validate(form) {
    const nombre = String(form.nombre || '').trim().replace(/\s+/g, ' ');
    const dni = normalizeDni(form.dni);
    const telefono = String(form.telefono || '').trim();
    const direccion = String(form.direccion || '').trim().replace(/\s+/g, ' ');
    if (nombre.length < 5 || !nombre.includes(' ')) return 'Ingresá nombre y apellido.';
    if (!/^\d{7,9}$/.test(dni)) return 'Ingresá un DNI válido, solo números (7 a 9 dígitos).';
    if (telefono.replace(/\D/g, '').length < 8 || telefono.replace(/\D/g, '').length > 15) return 'Ingresá un teléfono válido.';
    if (direccion.length < 5) return 'Ingresá una dirección completa.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email || '').trim()) || String(form.email || '').length > 254) return 'Ingresá un email válido.';
    return null;
  }
  function csvCell(value) {
    // Prevent spreadsheet formula execution when the file is opened in Excel/Sheets.
    const raw = String(value ?? '');
    const safe = /^[\s\u0000-\u001f]*[=+@\-]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replace(/"/g, '""') + '"';
  }
  function toCsv(rows) {
    const columns = [
      ['createdAt', 'Fecha y hora'], ['nombre', 'Nombre completo'], ['dni', 'DNI'], ['telefono', 'Teléfono'],
      ['direccion', 'Dirección'], ['email', 'Email'], ['cantidadCorrectas', 'Total correctas'], ['id', 'ID inscripción'],
      ['syncStatus', 'Estado sync'], ['syncedAt', 'Sincronizado el']
    ];
    for (let i = 0; i < 5; i++) columns.splice(6 + i * 4, 0,
      [`pregunta${i + 1}`, `Pregunta ${i + 1}`], [`respuesta${i + 1}`, `Respuesta ${i + 1}`],
      [`correcta${i + 1}`, `Correcta ${i + 1}`], [`respuestaCorrecta${i + 1}`, `Respuesta correcta ${i + 1}`]);
    const values = rows.map(row => columns.map(([key]) => {
      const match = key.match(/^(pregunta|respuesta|correcta|respuestaCorrecta)([1-5])$/);
      if (!match) return row[key];
      const answer = row.respuestas?.[Number(match[2]) - 1];
      return answer?.[match[1]] ?? '';
    }));
    return '\uFEFF' + [columns.map(([, title]) => title), ...values].map(line => line.map(csvCell).join(',')).join('\r\n');
  }
  return { shuffle, chooseQuestions, score, normalizeDni, validate, toCsv };
});
