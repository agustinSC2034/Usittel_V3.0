// Development only: single origin, private PHP router, no framework or proxy.
const { spawn } = require('node:child_process');
const path = require('node:path');
const php = process.env.MI_USITTEL_PHP || 'php';
const port = process.env.PORT || '4174';
if (!/^\d{4,5}$/.test(port)) throw new Error('Invalid PORT');
const child = spawn(php, ['-d','display_errors=0','-d','zend.exception_ignore_args=1',
  '-S',`127.0.0.1:${port}`,'-t',__dirname,path.join(__dirname,'server/router.php')], {stdio:'inherit'});
child.on('error', () => { console.error('PHP no disponible. Configurá MI_USITTEL_PHP con la ruta a PHP 8.2+ (extensión curl habilitada).'); process.exitCode=1; });
child.on('exit', code => { process.exitCode=code || 0; });
process.on('SIGINT',()=>child.kill());
