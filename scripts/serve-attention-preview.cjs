// Loopback-only, static preview. No PHP execution, API proxy or customer data.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.ico':'image/x-icon', '.pdf':'application/pdf' };
function createPreviewServer({ channelKey = '' } = {}) {
  return http.createServer((req, res) => {
    const send = (status, body = '') => { res.writeHead(status); res.end(req.method === 'HEAD' ? undefined : body); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    // Mitigate DNS rebinding: a non-loopback Host cannot obtain preview settings.
    if (!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(req.headers.host || '')) return send(403);
    if (!['GET', 'HEAD'].includes(req.method)) return send(405);
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(400); }
    if (pathname.includes('\\') || pathname.includes('\0')) return send(404);
    const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'";
    const hub = /^\/atencion\/?$/.test(pathname);
    const real = hub;
    // Only this explicit preview page may load the SDK and its cross-origin frame.
    // Public home keeps its existing external assets; requests are blocked in QA.
    if (hub || pathname.startsWith('/autogestion/')) res.setHeader('Content-Security-Policy', real ? csp.replace("script-src 'self'", "script-src 'self' https://web.central.chat").replace("frame-src 'none'", 'frame-src https://web.central.chat') : csp);
    if (pathname === '/attention-preview-config.json') {
      res.setHeader('Content-Type', 'application/json');
      if (!/^[A-Za-z0-9_-]{1,100}\|[A-Za-z0-9_-]{1,100}$/.test(channelKey)) return send(503, JSON.stringify({ available:false }));
      return send(200, JSON.stringify({ channelKey }));
    }
    if (pathname === '/autogestion/api/bootstrap' && !new URL(req.url, 'http://localhost').search) {
      res.setHeader('Content-Type', 'application/json');
      return send(200, JSON.stringify({ mode:'demo', backend:false, authenticated:false }));
    }
    if (pathname === '/') pathname = '/index.html';
    if (hub) pathname = '/atencion/index.html';
    if (pathname === '/autogestion') pathname = '/autogestion/index.html';
    if (pathname.endsWith('/')) pathname += 'index.html';
    // Closed roots: do not expose server/, tests/, vendor/, private files or .git.
    const allowed = pathname === '/index.html' || /^\/(?:assets|js|pages|atencion)\/[a-zA-Z0-9_./-]+$/.test(pathname) || /^\/autogestion\/(?:index\.html|js\/[a-z-]+\.js|assets\/[a-zA-Z0-9_.-]+)$/.test(pathname);
    const filename = path.resolve(root, '.' + pathname);
    const ext = path.extname(filename).toLowerCase();
    if (!allowed || pathname.split('/').includes('..') || !filename.startsWith(root + path.sep) || !types[ext]) return send(404);
    fs.readFile(filename, (error, body) => {
      if (error) return send(404);
      res.setHeader('Content-Type', types[ext] + (['.html','.css','.js'].includes(ext) ? '; charset=utf-8' : ''));
      send(200, body);
    });
  });
}
if (require.main === module) {
  const port = Number(process.env.ATTENTION_PREVIEW_PORT || 4175);
  createPreviewServer({ channelKey: process.env.CENTRAL_CHAT_CHANNEL_KEY || '' }).listen(port, '127.0.0.1', () => {
    console.log(`Atención USITTEL: http://127.0.0.1:${port}/atencion`);
    console.log('Vista local. No ejecuta PHP ni modifica WhatsApp.');
  });
}
module.exports = { createPreviewServer };
