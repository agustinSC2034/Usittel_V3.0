(function () {
  'use strict';
  const video = document.querySelector('[data-hero-video]');
  const toggle = document.querySelector('[data-video-toggle]');
  if (!video || !toggle) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let pausedByUser = reducedMotion.matches;
  toggle.hidden = false;
  function updateLabel() {
    const label = video.paused ? 'Reproducir video' : 'Pausar video';
    toggle.textContent = label;
    toggle.setAttribute('aria-label', label + ' de fondo');
  }
  function syncPlayback() {
    if (!visible || document.hidden || pausedByUser) video.pause();
    else video.play().catch(updateLabel);
  }
  video.addEventListener('play', updateLabel);
  video.addEventListener('pause', updateLabel);
  toggle.addEventListener('click', () => { pausedByUser = !video.paused; syncPlayback(); });
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', event => { pausedByUser = event.matches; syncPlayback(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncPlayback(); }).observe(video);
  } else { visible = true; syncPlayback(); }
})();
