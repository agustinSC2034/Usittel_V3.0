// Render shared navigation/footer at build time; no client fetch or PHP routing required.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = [
  { file: 'index.html', base: '', active: 'Home' },
  { file: 'pages/contacto/index.html', base: '../../', active: 'Contáctanos' },
  { file: 'pages/empresas/index.html', base: '../../', active: 'Empresas' },
  { file: 'pages/internet/index.html', base: '../../', active: 'Internet' },
  { file: 'pages/tv/index.html', base: '../../', active: 'TV' },
  { file: 'pages/mesh/index.html', base: '../../', active: 'WiFi Mesh' },
  { file: 'pages/centro_de_ayuda/index.html', base: '../../', active: 'Centro de ayuda' },
  { file: 'pages/nosotros/index.html', base: '../../', active: 'Nosotros' },
  { file: 'pages/alcances/index.html', base: '../../', active: '' },
  { file: 'pages/baja/index.html', base: '../../', active: '' },
  { file: 'pages/terminos_y_condiciones/index.html', base: '../../', active: '' },
  { file: 'datos-personales/index.html', base: '../', active: '' },
  ...['pages/index.html', 'assets/index.html', 'assets/icons/index.html', 'assets/img/index.html', 'assets/pdf/index.html', 'js/index.html'].map(file => ({ file, base: '/', active: '', notFound: true })),
  ...['android', 'amazon', 'apple', 'celulares'].map(device => ({
    file: `pages/instructivos/Instructivo_${device}.html`, base: '../../', active: 'Centro de ayuda',
  })),
];
let stale = false;
for (const page of pages) {
  const filename = path.join(root, page.file);
  const original = fs.readFileSync(filename, 'utf8');
  // Earlier builds placed this managed widget after </footer>, outside the
  // replaceable shell. Remove every managed copy before rendering the footer so
  // repeated builds remain idempotent and never mount more than one chat.
  let output = original
    .replace(/\s*<!-- CENTRAL_CHAT_START -->[\s\S]*?<!-- CENTRAL_CHAT_END -->/g, '')
    .replace(/\s*<script src="https:\/\/web\.central\.chat\/widget\/core\.js"><\/script>\s*<central-chat\b[^>]*><\/central-chat>/g, '');
  if (page.notFound) {
    const content = fs.readFileSync(path.join(root, 'includes/public/not-found.html'), 'utf8').trim();
    output = output.replace(/<main\b[\s\S]*?<\/main>/, () => `<main id="main-content">\n${content}\n</main>`);
  }
  for (const part of ['header', 'footer']) {
    let template = fs.readFileSync(path.join(root, 'includes/public', part + '.html'), 'utf8').trim().replaceAll('{{base}}', page.base);
    if (part === 'header') {
      const label = page.active.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      template = template.replace(new RegExp('<a\\b([^>]*?)>' + label + '</a>', 'g'), (_, attributes) => {
        const activeAttributes = /\bclass="/.test(attributes)
          ? attributes.replace(/class="([^"]*)"/, 'class="$1 active"')
          : attributes + ' class="active"';
        const current = page.file.startsWith('pages/instructivos/') ? 'location' : 'page';
        return `<a${activeAttributes} aria-current="${current}">${page.active}</a>`;
      });
      if (['Internet', 'TV', 'WiFi Mesh'].includes(page.active)) {
        template = template.replace('>Productos ▾</a>', ' class="active">Productos ▾</a>');
      }
    }
    output = output.replace(new RegExp('<' + part + '\\b[\\s\\S]*?</' + part + '>'), () => template);
  }
  if (output !== original) {
    if (process.argv.includes('--check')) { stale = true; console.error('Shared shell needs rebuilding:', page.file); }
    else fs.writeFileSync(filename, output);
  }
}
if (stale) process.exitCode = 1;
