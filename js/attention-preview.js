// This entry point ships inert on the public site. No query flag enables it there.
if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
  const { mountChatPreview } = await import('../autogestion/js/attention-chat.js');
  const hub = /^\/atencion\/?$/.test(location.pathname);
  const realPreview = hub && new URLSearchParams(location.search).get('chat-provider') === 'central';
  let chat;
  if (realPreview) {
    const { createCentralPreview } = await import('../autogestion/js/central-chat.js');
    chat = await createCentralPreview(mountChatPreview);
  } else {
    chat = mountChatPreview({ floating: true });
    if (!hub) document.querySelector('.attention-chat-launcher')?.classList.add('attention-chat-home-launcher');
  }
  if (chat && hub && new URLSearchParams(location.search).get('chat') === 'open') chat.open();
}
