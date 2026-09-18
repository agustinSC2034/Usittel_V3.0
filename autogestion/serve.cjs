// Local preview only. Does not execute PHP or expose the commercial checkout.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end(); }
  if (pathname === '/autogestion/api/bootstrap') {
    if (new URL(req.url, 'http://localhost').search) { res.writeHead(400); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ mode: 'demo', backend: false, authenticated: false }));
  }
  if (pathname === '/') { res.writeHead(302, { Location: '/autogestion/' }); return res.end(); }
  if (pathname === '/autogestion') { res.writeHead(302, { Location: '/autogestion/' }); return res.end(); }
  if (!pathname.startsWith('/autogestion/')) { res.writeHead(404); return res.end('Not found'); }
  const relative = pathname.slice('/autogestion/'.length) || 'index.html';
  const filename = path.resolve(root, relative);
  const ext = path.extname(filename);
  if (!filename.startsWith(root + path.sep) || !types[ext]) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(filename, (error, buffer) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': types[ext], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
    });
    res.end(req.method === 'HEAD' ? undefined : buffer);
  });
}).listen(port, '127.0.0.1', () => console.log(`Mi USITTEL: http://127.0.0.1:${port}/autogestion/`));
