(() => {
  const launcher = document.getElementById('site-chat-launcher');
  const panel = document.getElementById('site-chat-panel');
  const close = document.getElementById('site-chat-close');
  if (!launcher || !panel || !close) return;

  const setOpen = open => {
    panel.hidden = !open;
    launcher.hidden = open;
    launcher.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('site-chat-open', open);
    if (open) close.focus({ preventScroll: true });
    else launcher.focus({ preventScroll: true });
  };

  launcher.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });

  const query = new URLSearchParams(location.search);
  if (query.get('chat') === 'open') setOpen(true);
})();
