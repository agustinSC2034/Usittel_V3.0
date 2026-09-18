const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const php = process.env.MI_USITTEL_PHP || 'php';
const result = spawnSync(php, [path.join(__dirname, 'server', 'check-environment.php')], {
  cwd: repo, env: process.env, encoding: 'utf8', windowsHide: true,
});

let checks = [];
if (result.error || result.status !== 0) {
  checks.push({ status: 'fail', label: 'PHP', detail: 'no se pudo ejecutar; configurá MI_USITTEL_PHP con PHP 8.2+' });
} else {
  try { checks = JSON.parse(result.stdout).checks; }
  catch { checks.push({ status: 'fail', label: 'Chequeo PHP', detail: 'respuesta local inválida' }); }
}

const ignoredDirs = new Set(['.git', 'node_modules']);
const forbiddenNames = new Set(['config.local.php']);
const codeExtensions = new Set(['.php', '.js', '.cjs', '.mjs', '.json']);
const findings = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    const relative = path.relative(repo, file).replaceAll('\\', '/');
    if (entry.isDirectory()) { walk(file); continue; }
    const lowerName = entry.name.toLowerCase();
    if (forbiddenNames.has(lowerName) || (lowerName.startsWith('.env') && !lowerName.endsWith('.example'))
      || (lowerName === 'config.php' && relative.startsWith('autogestion/'))) findings.push(`${relative} (archivo privado)`);
    if (!codeExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) findings.push(`${relative} (clave privada)`);
    const assignment = /['"](?:api_user|api_pass|Autogestion_Pass)['"]\s*(?:=>|:)\s*['"]([^'"\r\n]+)['"]/gi;
    for (const match of content.matchAll(assignment)) {
      const value = match[1];
      const fixture = relative.startsWith('autogestion/tests/') && /fixture|00Lab-fixture|do-not-expose/i.test(value);
      if (!fixture && !/^(?:example|placeholder|change-me|your-|test-)/i.test(value)) findings.push(`${relative} (valor sensible incorporado)`);
    }
  }
}
try { walk(repo); }
catch { findings.push('no se pudo completar el escaneo local'); }
checks.push(findings.length
  ? { status: 'fail', label: 'Secretos en el repositorio', detail: findings.join(', ') }
  : { status: 'ok', label: 'Secretos en el repositorio', detail: 'no se detectaron archivos privados ni valores sensibles incorporados' });

const icons = { ok: '✅', warn: '⚠️', fail: '❌' };
console.log('Chequeo local de Mi USITTEL\n');
for (const item of checks) console.log(`${icons[item.status] || '•'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log('\nEste comando no contactó Phantom ni SIRO.');
process.exitCode = checks.some(item => item.status === 'fail') ? 1 : 0;
