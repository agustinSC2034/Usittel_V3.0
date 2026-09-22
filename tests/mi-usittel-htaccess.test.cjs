const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'autogestion', '.htaccess');
const source = fs.readFileSync(file, 'utf8');
const router = fs.readFileSync(path.join(__dirname, '..', 'autogestion', 'server', 'router.php'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, '..', 'autogestion', 'js', 'api.js'), 'utf8');
const payments = fs.readFileSync(path.join(__dirname, '..', 'autogestion', 'server', 'Payments.php'), 'utf8');

assert.match(source, /^Options -Indexes$/m);
assert.match(source, /^DirectoryIndex index\.html$/m);
assert.doesNotMatch(source, /^DirectoryIndex disabled$/m);
assert.doesNotMatch(source, /RewriteRule[\s\S]*production-router\.php/);
assert.match(source, /FilesMatch "\^\(\?!production-router\\\.php\$\)\.\+\\\.php\$"/);
assert.match(router, /Content-Security-Policy:[^\n]*https:\/\/web\.central\.chat/);
assert.match(router, /\$measurementOrigin/);
assert.match(router, /production-router\.php/);
assert.match(api, /server\/production-router\.php/);
assert.doesNotMatch(api, /fetch\(`api\//);
assert.match(payments, /route=payment-return/);
console.log('Mi USITTEL physical entrypoint: 11 assertions');
