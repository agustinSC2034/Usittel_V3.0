(() => {
  'use strict';
  const cfg = window.EXPO_SETTINGS;
  const core = window.ExpoCore;
  const store = window.ExpoStore;
  const sync = window.ExpoSync;
  const screen = document.getElementById('screen');
  const pinDialog = document.getElementById('pin-dialog');
  let draft = null;
  let stage = 'welcome';
  let saving = false;
  let resetTimer = null;
  let resetInterval = null;
  let toastTimer = null;
  let adminUnlocked = false;
  let stageBeforeAdmin = 'welcome';
  const DRAFT_BACKUP_KEY = 'usittel-expotan-active-draft';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const entryDraft = () => ({ stage, questions: draft?.questions || [], answers: draft?.answers || [], form: draft?.form || {} });
  function backupDraft() { if (draft) try { localStorage.setItem(DRAFT_BACKUP_KEY, JSON.stringify(entryDraft())); } catch {} }
  async function persistDraft() { if (draft) { backupDraft(); await store.saveDraft(entryDraft()); } }
  async function clearDraft() { try { localStorage.removeItem(DRAFT_BACKUP_KEY); } catch {} await store.clearDraft(); }
  function toast(message) {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { element.hidden = true; }, 4500);
  }
  function connection() {
    const online = navigator.onLine;
    document.getElementById('connection-dot').classList.toggle('offline', !online);
    document.getElementById('connection-label').textContent = online ? 'Con conexión' : 'Sin conexión';
  }
  function setScreen(html) { screen.innerHTML = html; screen.focus({ preventScroll: true }); }
  function cancelReset() { clearTimeout(resetTimer); clearInterval(resetInterval); resetTimer = null; resetInterval = null; }
  function welcome() {
    cancelReset(); stage = 'welcome'; draft = null;
    setScreen(`<section class="panel welcome"><div><div class="event-pill"><span></span>${escapeHtml(cfg.eventTitle)} · ${escapeHtml(cfg.eventDates)}</div><p class="eyebrow">USITTEL te invita</p><h1>Participá del sorteo de USITTEL</h1><p class="lead">Respondé 3 preguntas, completá tus datos y participá.</p><button class="button primary" id="begin">Comenzar <span aria-hidden="true">→</span></button></div><div class="visual" aria-hidden="true"><img src="../assets/img/logos/usittel-logo_and_name.webp" alt=""></div></section>`);
    document.getElementById('begin').addEventListener('click', begin, { once: true });
  }
  async function begin() {
    try {
      draft = { questions: core.chooseQuestions(cfg.questions, cfg.questionsPerEntry), answers: [], form: {} };
      stage = 'quiz';
      await persistDraft();
      renderQuiz();
    } catch { toast('No se pudo preparar la participación. Revisá el almacenamiento de la tablet.'); }
  }
  function renderQuiz() {
    stage = 'quiz';
    const index = draft.answers.length;
    const q = draft.questions[index];
    if (!q) { renderForm(); return; }
    setScreen(`<section class="panel"><div class="steps" aria-hidden="true">${draft.questions.map((_, i) => `<span class="${i <= index ? 'active' : ''}"></span>`).join('')}</div><p class="quiz-meta">Pregunta ${index + 1} de ${draft.questions.length}</p><h2>${escapeHtml(q.text)}</h2><div class="answers">${q.options.map(option => `<button class="answer" type="button" data-option="${escapeHtml(option.id)}">${escapeHtml(option.text)}</button>`).join('')}</div></section>`);
    screen.querySelectorAll('.answer').forEach(button => button.addEventListener('click', async () => {
      if (saving) return;
      saving = true;
      screen.querySelectorAll('.answer').forEach(item => { item.disabled = true; });
      const selected = q.options.find(option => option.id === button.dataset.option);
      const correct = q.options.find(option => option.id === q.correctId);
      draft.answers.push({ questionId: q.id, pregunta: q.text, selectedId: selected.id, respuesta: selected.text, correctId: q.correctId, respuestaCorrecta: correct.text, correcta: selected.id === q.correctId });
      try { await persistDraft(); renderQuiz(); }
      catch { draft.answers.pop(); toast('No se pudo guardar tu respuesta. Volvé a intentar.'); renderQuiz(); }
      finally { saving = false; }
    }));
  }
  function renderForm() {
    stage = 'form';
    const f = draft.form;
    setScreen(`<section class="panel"><div class="steps" aria-hidden="true"><span class="active"></span><span class="active"></span><span class="active"></span></div><p class="eyebrow">Ya respondiste las 3 preguntas</p><h2>Completá tus datos</h2><p class="lead">Estos datos nos permiten registrar tu participación.</p><form id="details" novalidate><div class="form-grid"><label class="field">Nombre y apellido<input name="nombre" autocomplete="name" required maxlength="100" value="${escapeHtml(f.nombre || '')}"></label><label class="field">DNI <span class="hint">Solo números, sin puntos</span><input name="dni" inputmode="numeric" autocomplete="off" required maxlength="12" value="${escapeHtml(f.dni || '')}"></label><label class="field">Teléfono<input name="telefono" type="tel" autocomplete="tel" required maxlength="30" value="${escapeHtml(f.telefono || '')}"></label><label class="field">Dirección<input name="direccion" autocomplete="street-address" required maxlength="140" value="${escapeHtml(f.direccion || '')}"></label></div><p class="error" id="form-error" role="alert"></p><div class="form-actions"><button class="button primary" type="submit">Continuar <span aria-hidden="true">→</span></button></div></form></section>`);
    const form = document.getElementById('details');
    let inputTimer;
    form.addEventListener('input', () => {
      draft.form = Object.fromEntries(new FormData(form));
      backupDraft();
      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => persistDraft().catch(() => toast('No se pudieron guardar los datos.')), 250);
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (saving) return;
      draft.form = Object.fromEntries(new FormData(form));
      draft.form.dni = core.normalizeDni(draft.form.dni);
      const error = core.validate({ ...draft.form, instagramConfirmado: true, privacidadAceptada: true });
      if (error) { document.getElementById('form-error').textContent = error; return; }
      saving = true;
      try {
        if (await store.byDni(draft.form.dni)) { document.getElementById('form-error').textContent = 'Este DNI ya está registrado en esta tablet. Gracias por participar.'; return; }
        stage = 'confirm'; await persistDraft(); renderConfirm();
      } catch { document.getElementById('form-error').textContent = 'No se pudo consultar el registro local. Intentá de nuevo.'; }
      finally { saving = false; }
    });
  }
  function renderConfirm() {
    stage = 'confirm';
    const f = draft.form;
    setScreen(`<section class="panel"><p class="eyebrow">Último paso</p><h2>Confirmá tu participación</h2><p class="lead">Tu participación no depende de cuántas respuestas acertaste.</p><div class="soft-card instagram"><div><div class="eyebrow">Seguinos en Instagram</div><div class="handle">${escapeHtml(cfg.instagramHandle)}</div></div><a class="button ghost" href="${escapeHtml(cfg.instagramUrl)}" target="_blank" rel="noopener noreferrer">Seguir a USITTEL en Instagram ↗</a></div><form id="confirmation" novalidate><div class="checks"><label class="check"><input type="checkbox" name="instagram" ${f.instagramConfirmado ? 'checked' : ''}><span>Confirmo que sigo a ${escapeHtml(cfg.instagramHandle)}.</span></label><label class="check"><input type="checkbox" name="privacy" ${f.privacidadAceptada ? 'checked' : ''}><span>Acepto que mis datos sean utilizados por USITTEL para gestionar mi participación en el sorteo.</span></label></div>${cfg.basesUrl ? `<p><a href="${escapeHtml(cfg.basesUrl)}" target="_blank" rel="noopener noreferrer">Leer Bases y Condiciones</a></p>` : ''}<p class="error" id="confirm-error" role="alert"></p><div class="confirm-actions"><button type="button" class="button secondary" id="edit-details">Volver a mis datos</button><button type="submit" class="button primary" id="save-entry">Confirmar participación</button></div></form></section>`);
    document.getElementById('edit-details').addEventListener('click', () => { renderForm(); persistDraft().catch(() => {}); });
    const form = document.getElementById('confirmation');
    form.addEventListener('change', () => {
      draft.form.instagramConfirmado = form.elements.instagram.checked;
      draft.form.privacidadAceptada = form.elements.privacy.checked;
      persistDraft().catch(() => toast('No se pudo guardar la confirmación.'));
    });
    form.addEventListener('submit', saveEntry);
  }
  async function saveEntry(event) {
    event.preventDefault();
    if (saving) return;
    const form = document.getElementById('confirmation');
    draft.form.instagramConfirmado = form.elements.instagram.checked;
    draft.form.privacidadAceptada = form.elements.privacy.checked;
    const error = core.validate(draft.form);
    if (error) { document.getElementById('confirm-error').textContent = error; return; }
    saving = true;
    const button = document.getElementById('save-entry'); button.disabled = true; button.textContent = 'Guardando…';
    try {
      const existing = await store.byDni(draft.form.dni);
      if (existing) { document.getElementById('confirm-error').textContent = 'Este DNI ya está registrado en esta tablet. Gracias por participar.'; return; }
      const entry = {
        id: crypto.randomUUID(), createdAt: new Date().toISOString(),
        nombre: draft.form.nombre.trim().replace(/\s+/g, ' '), dni: draft.form.dni,
        telefono: draft.form.telefono.trim(), direccion: draft.form.direccion.trim().replace(/\s+/g, ' '),
        instagramConfirmado: true, privacidadAceptada: true,
        preguntasRespondidas: draft.answers.map(a => a.questionId), respuestas: draft.answers,
        cantidadCorrectas: core.score(draft.answers), syncStatus: 'pending', syncedAt: null
      };
      await store.add(entry); // Unique DNI index makes duplicate taps atomic.
      await clearDraft().catch(() => {});
      draft = null;
      success();
      sync.run(store, cfg).catch(() => {});
    } catch (reason) {
      document.getElementById('confirm-error').textContent = reason?.name === 'ConstraintError' ? 'Este DNI ya está registrado en esta tablet.' : 'No se pudo guardar la participación. Intentá de nuevo; tus datos siguen en pantalla.';
    } finally { saving = false; if (button.isConnected) { button.disabled = false; button.textContent = 'Confirmar participación'; } }
  }
  function success() {
    stage = 'success';
    const zone = cfg.newZone ? `<p class="zone">Nueva zona: <strong>${escapeHtml(cfg.newZone)}</strong></p>` : '';
    setScreen(`<section class="panel success"><div class="success-icon" aria-hidden="true">✓</div><p class="eyebrow">Inscripción guardada en esta tablet</p><h1>¡Ya estás participando!</h1><p class="lead">Gracias por participar con USITTEL.</p>${cfg.finalMessage ? `<p class="zone">${escapeHtml(cfg.finalMessage)}</p>` : ''}${zone}<p class="countdown" id="countdown"></p><button id="new-entry" class="button secondary">Nueva participación</button></section>`);
    document.getElementById('new-entry').addEventListener('click', resetToWelcome);
    const seconds = Math.max(8, Math.min(60, Number(cfg.resetSeconds) || 10));
    let remaining = seconds;
    const label = document.getElementById('countdown');
    label.textContent = `La pantalla se reinicia en ${remaining} segundos.`;
    resetInterval = setInterval(() => { remaining--; if (label.isConnected) label.textContent = `La pantalla se reinicia en ${remaining} segundos.`; }, 1000);
    resetTimer = setTimeout(resetToWelcome, seconds * 1000);
  }
  async function resetToWelcome() { cancelReset(); draft = null; await clearDraft().catch(() => {}); welcome(); }
  async function admin() {
    if (!adminUnlocked) return;
    if (stage !== 'admin') stageBeforeAdmin = stage;
    cancelReset(); stage = 'admin';
    const rows = await store.all();
    const counts = { synced: 0, pending: 0, error: 0 };
    rows.forEach(row => counts[row.syncStatus]++);
    setScreen(`<section class="panel admin-panel"><div class="admin-head"><div><p class="eyebrow">Administración local</p><h1>Panel del stand</h1></div><button id="exit-admin" class="button secondary">Volver al kiosco</button></div><div class="stat-grid"><div class="stat"><strong>${rows.length}</strong><span>Participantes</span></div><div class="stat"><strong>${counts.synced}</strong><span>Sincronizados</span></div><div class="stat"><strong>${counts.pending}</strong><span>Pendientes</span></div><div class="stat"><strong>${counts.error}</strong><span>Con error</span></div></div><p class="admin-status">Conexión: ${navigator.onLine ? 'online' : 'offline'} · Endpoint: ${cfg.appsScriptUrl ? 'configurado' : 'sin configurar'} · <span id="cache-status">Comprobando cache…</span></p><div class="admin-actions"><button id="sync-now" class="button primary">Forzar sincronización</button><button id="export-csv" class="button ghost">Exportar respaldo completo CSV</button></div><label class="field">Buscar por nombre o DNI<input class="search" id="admin-search" type="search" placeholder="Buscar participantes" autocomplete="off"></label><div class="records" id="records" aria-label="Participantes registrados"></div></section>`);
    const records = document.getElementById('records');
    const renderRows = query => {
      records.replaceChildren();
      const filtered = rows.filter(row => `${row.nombre} ${row.dni}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
      if (!filtered.length) { records.textContent = 'No hay registros para mostrar.'; return; }
      filtered.forEach(row => {
        const line = document.createElement('div'); line.className = 'record';
        const name = document.createElement('span'); name.textContent = row.nombre;
        const dni = document.createElement('span'); dni.textContent = `DNI ${row.dni}`;
        const status = document.createElement('span'); status.textContent = row.syncStatus;
        status.className = row.syncStatus === 'error' ? 'error-status' : row.syncStatus;
        line.append(name, dni, status); records.append(line);
      });
    };
    renderRows('');
    document.getElementById('admin-search').addEventListener('input', event => renderRows(event.target.value));
    document.getElementById('exit-admin').addEventListener('click', async () => { adminUnlocked = false; if (draft) { stage = stageBeforeAdmin; await persistDraft().catch(() => {}); if (stage === 'quiz') renderQuiz(); else if (stage === 'confirm') renderConfirm(); else renderForm(); } else welcome(); });
    document.getElementById('export-csv').addEventListener('click', () => {
      const blob = new Blob([core.toCsv(rows)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      link.download = `usittel-expotan-respaldo-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
    document.getElementById('sync-now').addEventListener('click', async event => {
      const button = event.currentTarget; button.disabled = true;
      try { const result = await sync.run(store, cfg); toast(result.skipped ? (cfg.appsScriptUrl ? 'Sin conexión o sincronización en curso.' : 'Configurá el endpoint de Apps Script para sincronizar.') : `${result.synced} sincronizados, ${result.errors} con error.`); await admin(); }
      catch { toast('No se pudo iniciar la sincronización.'); button.disabled = false; }
    });
    const cacheStatus = document.getElementById('cache-status');
    if ('caches' in window) {
      caches.keys().then(keys => { if (cacheStatus.isConnected) cacheStatus.textContent = keys.some(key => key.startsWith('usittel-expo-')) ? 'cache offline instalado' : 'cache offline pendiente'; }).catch(() => { cacheStatus.textContent = 'cache no disponible'; });
    } else cacheStatus.textContent = 'cache no disponible';
  }
  function wireAdmin() {
    const trigger = document.getElementById('admin-trigger');
    let hold;
    trigger.addEventListener('contextmenu', event => event.preventDefault());
    trigger.addEventListener('pointerdown', () => { hold = setTimeout(() => { document.getElementById('pin').value = ''; document.getElementById('pin-error').textContent = ''; pinDialog.showModal(); document.getElementById('pin').focus(); }, 3500); });
    for (const name of ['pointerup', 'pointercancel', 'pointerleave']) trigger.addEventListener(name, () => clearTimeout(hold));
    document.addEventListener('keydown', event => {
      if (!(event.ctrlKey && event.altKey && event.key.toLowerCase() === 'a')) return;
      event.preventDefault();
      document.getElementById('pin').value = '';
      document.getElementById('pin-error').textContent = '';
      pinDialog.showModal();
      document.getElementById('pin').focus();
    });
    document.getElementById('pin-cancel').addEventListener('click', () => pinDialog.close());
    document.getElementById('pin-form').addEventListener('submit', event => {
      event.preventDefault();
      if (document.getElementById('pin').value !== cfg.adminPin) { document.getElementById('pin-error').textContent = 'PIN incorrecto.'; return; }
      pinDialog.close(); adminUnlocked = true; admin().catch(() => toast('No se pudo abrir el panel.'));
    });
  }
  async function init() {
    document.getElementById('event-label').textContent = cfg.eventTitle;
    connection(); wireAdmin();
    window.addEventListener('online', () => { connection(); sync.run(store, cfg, () => { if (stage === 'admin') admin().catch(() => {}); }).catch(() => {}); });
    window.addEventListener('offline', connection);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync.run(store, cfg).catch(() => {}); });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => toast('No se pudo preparar el modo offline.'));
    try {
      await store.all(); // Fail closed if local persistence is unavailable.
      draft = await store.getDraft();
      try { const backup = JSON.parse(localStorage.getItem(DRAFT_BACKUP_KEY) || 'null'); if (backup?.questions?.length) draft = backup; } catch {}
      if (draft?.form?.dni && await store.byDni(core.normalizeDni(draft.form.dni))) { draft = null; await clearDraft().catch(() => {}); success(); }
      else if (draft?.questions?.length && draft.answers.length < draft.questions.length) renderQuiz();
      else if (draft?.questions?.length && draft.answers.length === draft.questions.length) draft.stage === 'confirm' ? renderConfirm() : renderForm();
      else welcome();
      sync.run(store, cfg).catch(() => {});
    } catch {
      setScreen('<section class="panel"><h1>Almacenamiento no disponible</h1><p class="lead">La tablet no puede guardar participaciones. Habilitá el almacenamiento del navegador y recargá la página antes de comenzar.</p></section>');
    }
  }
  init();
})();
