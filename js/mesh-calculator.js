(function () {
  'use strict';
  const allowed = { ambientes: [0, 1, 2], m2: [1, 2, 3, 4], plantas: [0, 2, 3], distribucion: [1, 2] };
  function recommend(selections) {
    if (!selections || Object.entries(allowed).some(([key, values]) => !values.includes(selections[key]))) return null;
    const score = Object.keys(allowed).reduce((total, key) => total + selections[key], 0);
    if (score <= 2) return { count: 0, title: 'No necesitás WiFi Mesh', detail: 'Con el módem estándar de Usittel tu cobertura es suficiente.' };
    if (score <= 4) return { count: 1, title: '1 Equipo Mesh', detail: 'Ideal para eliminar esa zona difícil y potenciar tu señal.' };
    if (score <= 7) return { count: 2, title: '2 Equipos Mesh', detail: 'La configuración más popular para una cobertura total y sin interrupciones.' };
    if (score <= 9) return { count: 3, title: '3 Equipos Mesh', detail: 'Para hogares grandes con múltiples plantas y alta demanda de conexión.' };
    return { count: 4, title: '4 Equipos o más', detail: 'Para tu caso, te recomendamos consultar con un asesor para un plan a medida.' };
  }
  if (typeof module === 'object' && module.exports) module.exports = { recommend };
  if (typeof document === 'undefined') return;
  const container = document.getElementById('calculator-container');
  if (!container) return;
  const steps = [...container.querySelectorAll('.calculator-step')];
  const next = document.getElementById('mesh-next');
  const back = document.getElementById('mesh-back');
  const progress = document.getElementById('progress-text');
  const progressBar = document.getElementById('progress-bar');
  const stepsContainer = document.getElementById('steps-container');
  const resultScreen = document.getElementById('result-screen');
  let current = 0;

  function showStep(focus = false) {
    steps.forEach((step, index) => { step.hidden = current !== index; });
    next.disabled = !steps[current].querySelector('input:checked');
    next.textContent = current === steps.length - 1 ? 'Ver recomendación' : 'Continuar';
    back.hidden = current === 0;
    progress.textContent = `Paso ${current + 1} de ${steps.length}`;
    progressBar.style.width = `${current / steps.length * 100}%`;
    if (focus) steps[current].querySelector('legend').focus();
  }
  container.addEventListener('change', event => {
    if (event.target.matches('.mesh-radio')) next.disabled = false;
  });
  next.addEventListener('click', () => {
    if (!steps[current].querySelector('input:checked')) return;
    if (current < steps.length - 1) { current++; showStep(true); return; }
    const selected = [...container.querySelectorAll('.mesh-radio:checked')];
    const recommendation = recommend(Object.fromEntries(selected.map(radio => [radio.name, Number(radio.value)])));
    if (!recommendation) return;
    const list = document.getElementById('user-selection');
    list.replaceChildren(...selected.map(radio => {
      const item = document.createElement('li');
      item.textContent = radio.closest('label').textContent.trim();
      return item;
    }));
    document.getElementById('recommendation').textContent = recommendation.title;
    document.getElementById('recommendation-subtext').textContent = recommendation.detail;
    document.getElementById('buy-now').hidden = recommendation.count === 0;
    stepsContainer.hidden = true;
    resultScreen.hidden = false;
    progress.textContent = '¡Sugerencia Lista!';
    progressBar.style.width = '100%';
    resultScreen.querySelector('h3').focus();
  });
  back.addEventListener('click', () => { if (current > 0) { current--; showStep(true); } });
  document.getElementById('retake-test').addEventListener('click', () => {
    container.querySelectorAll('.mesh-radio').forEach(radio => { radio.checked = false; });
    document.getElementById('user-selection').replaceChildren();
    stepsContainer.hidden = false;
    resultScreen.hidden = true;
    current = 0;
    showStep(true);
  });
  showStep();
})();
