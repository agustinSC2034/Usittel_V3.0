(function () {
  'use strict';
  const input = document.getElementById('help-search');
  if (!input) return;
  const search = document.querySelector('.help-search');
  const clear = document.getElementById('help-clear');
  const status = document.getElementById('help-search-status');
  const empty = document.querySelector('.help-empty');
  const categories = [...document.querySelectorAll('.help-category')];
  const questions = [...document.querySelectorAll('.help-question')];
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, ' ').trim();
  // Build the index once from the actual answers; no network or duplicate content store.
  const index = questions.map(element => ({ element, text: normalize(element.textContent) }));
  search.hidden = false;

  function filter() {
    const query = normalize(input.value);
    const words = query.split(' ').filter(Boolean);
    let matches = 0;
    for (const entry of index) {
      const match = words.every(word => entry.text.includes(word));
      entry.element.hidden = !match;
      if (match) matches++;
    }
    categories.forEach(category => {
      category.hidden = !questions.some(question => category.contains(question) && !question.hidden);
      const resources = category.querySelector('.help-resources');
      if (resources) resources.hidden = Boolean(query);
    });
    empty.hidden = matches > 0;
    clear.hidden = input.value.length === 0;
    status.textContent = query ? `${matches} ${matches === 1 ? 'respuesta encontrada' : 'respuestas encontradas'}.` : '';
  }
  function reset() { input.value = ''; filter(); }
  input.addEventListener('input', filter);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { reset(); event.preventDefault(); }
  });
  clear.addEventListener('click', () => { reset(); input.focus(); });

  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = id && document.getElementById(id);
    if (!target || !target.closest('#help-results')) return;
    reset();
    const question = target.closest('.help-question');
    if (question) question.open = true;
    const category = target.closest('.help-category');
    document.querySelectorAll('[data-help-category]').forEach(link => {
      const active = link.hash === '#' + (id === 'medios-de-pago' ? id : category?.id);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (question) question.querySelector('summary').focus({ preventScroll: true });
    });
  }
  document.querySelectorAll('[data-help-category]').forEach(link => link.addEventListener('click', () => {
    reset();
    if (link.hash === location.hash) revealHash();
  }));
  window.addEventListener('hashchange', revealHash);
  revealHash();
})();
