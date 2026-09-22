const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'autogestion', '.htaccess');
const source = fs.readFileSync(file, 'utf8');
const router = fs.readFileSync(path.join(__dirname, '..', 'autogestion', 'server', 'router.php'), 'utf8');

assert.match(source, /^Options -Indexes$/m);
assert.match(source, /^DirectoryIndex index\.html$/m);
assert.doesNotMatch(source, /^DirectoryIndex disabled$/m);
assert.match(source, /RewriteRule \^api\(\?:\/\|\$\) server\/production-router\.php \[L\]/);
assert.match(source, /RewriteRule \^pago-\(\?:ok\|error\)\/\[a-f0-9\]\{32\}\$ server\/production-router\.php \[L\]/);
assert.doesNotMatch(source, /RewriteRule \^ server\/production-router\.php \[L\]/);
assert.match(source, /FilesMatch "\^\(\?!production-router\\\.php\$\)\.\+\\\.php\$"/);
assert.match(router, /Content-Security-Policy:[^\n]*https:\/\/web\.central\.chat/);
assert.match(router, /\$measurementOrigin/);
console.log('Mi USITTEL Apache/router: 9 assertions');
