<?php
declare(strict_types=1);

// cPanel serves public_html/autogestion as the document root of mi.usittel.com.ar.
// Keep credentials and mutable state outside public_html.
$accountRoot=dirname(__DIR__,2);
putenv('MI_USITTEL_CONFIG='.$accountRoot.'/mi-usittel-private/config.php');
putenv('MI_USITTEL_RUNTIME='.$accountRoot.'/mi-usittel-private/runtime');
require __DIR__.'/server/router.php';
