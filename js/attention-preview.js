// This entry point ships inert on the public site. No query flag enables it there.
if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
  const { mountChatPreview } = await import('../autogestion/js/attention-chat.js');
  const hub = /^\/atencion\/?$/.test(location.pathname);
  const help = /^\/pages\/centro_de_ayuda\/(?:index\.html)?$/.test(location.pathname);
  if (help) {
    const { mountAttentionHelp } = await import('./attention-help-preview.js');
    mountAttentionHelp();
  }
  const realPreview = hub && new URLSearchParams(location.search).get('chat-provider') === 'central';
  let chat;
  if (realPreview) {
    const { createCentralPreview } = await import('../autogestion/js/central-chat.js');
    chat = await createCentralPreview(mountChatPreview);
  } else if (!help) {
    chat = mountChatPreview({ floating: !hub });
    if (!hub) document.querySelector('.attention-chat-launcher')?.classList.add('attention-chat-home-launcher');
  }
  // Entering /atencion is enough. No second landing choice and no fake handoff.
  const intent = new URLSearchParams(location.search).get('intent') === 'sales' ? 'sales' : null;
  if (hub && intent === 'sales') document.querySelector('h1').textContent = 'Hablemos de tu próximo plan';
  if (chat && hub) chat.open(null, intent);
}
