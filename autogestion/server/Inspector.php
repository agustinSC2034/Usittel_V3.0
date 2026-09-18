<?php
declare(strict_types=1);
namespace MiUsittel;

function inspectorArguments(array $args): array {
    if(!in_array(count($args),[2,3],true) || !in_array($args[1]??null,['1','5'],true)
        || (isset($args[2]) && !in_array($args[2],['--auth-form','--auth-get'],true))
        || (($args[2]??null)==='--auth-get' && $args[1]!=='1')) throw new Failure('INSPECTOR_ARGUMENTS');
    return ['ida'=>(int)$args[1],'authForm'=>($args[2]??null)==='--auth-form','authGet'=>($args[2]??null)==='--auth-get'];
}
function safeDiagnosticCode(\Throwable $e): string {
    return $e instanceof Failure && preg_match('/^[A-Z][A-Z0-9_]{1,63}$/D',$e->kind) ? $e->kind : 'UNEXPECTED';
}
function safeDiagnosticMessage(\Throwable $e): ?string {
    if(!$e instanceof \JsonException) return null;
    $file=realpath($e->getFile());$root=realpath(__DIR__);
    if(!$file || !$root || !str_starts_with(strtolower(str_replace('\\','/',$file)),strtolower(str_replace('\\','/',$root)).'/')) return null;
    $message=$e->getMessage();
    $safeMessages=['Syntax error','Malformed UTF-8 characters, possibly incorrectly encoded','Recursion detected',
        'Inf and NaN cannot be JSON encoded','Maximum stack depth exceeded'];
    return in_array($message,$safeMessages,true)?$message:null;
}
function writeInspectorFailure(string $stage,\Throwable $e): int {
    $source=$e instanceof InspectionFailure?$e->getPrevious():$e;
    $code=$e instanceof InspectionFailure && preg_match('/^[A-Z][A-Z0-9_]{1,63}$/D',$e->safeCode)?$e->safeCode:safeDiagnosticCode($source);
    $safeStage=preg_match('/^[a-z_]{3,32}$/D',$stage)?$stage:'desconocida';
    fwrite(STDERR,'Etapa: '.$safeStage.PHP_EOL.'Código: '.$code.PHP_EOL);
    if($source instanceof Failure && $source->upstreamHttp!==null && $source->upstreamHttp>=100 && $source->upstreamHttp<=599) {
        fwrite(STDERR,'HTTP: '.$source->upstreamHttp.PHP_EOL);
    }
    if($source instanceof Failure && $source->kind==='PHANTOM_FORMAT' && in_array($source->responseFormat,[
        'RESPUESTA_VACIA','PREFIJO_BOM_UTF8','APARIENCIA_HTML','UTF8_INVALIDO','JSON_PROFUNDIDAD_EXCEDIDA',
        'TEXTO_O_JSON_INVALIDO','JSON_STRING','JSON_BOOLEAN','JSON_NULL','JSON_NUMBER','JSON_DENTRO_DE_STRING',
    ],true)) fwrite(STDERR,'Formato: '.$source->responseFormat.PHP_EOL);
    if(!($source instanceof Failure)) {
        $class=preg_replace('/[^A-Za-z0-9_]/','',str_replace('\\','_',$source::class))?:'Throwable';
        fwrite(STDERR,'Excepción: '.$class.PHP_EOL);
        fwrite(STDERR,'Archivo: '.basename($source->getFile()).PHP_EOL);
        fwrite(STDERR,'Línea: '.$source->getLine().PHP_EOL);
        $message=safeDiagnosticMessage($source);
        if($message!==null) fwrite(STDERR,'Mensaje: '.$message.PHP_EOL);
    }
    return 1;
}
function runInspector(Phantom $phantom,int $ida): int {
    try {
        echo json_encode($phantom->inspectSchema($ida),JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE).PHP_EOL;
        return 0;
    } catch(InspectionFailure $e) { return writeInspectorFailure($e->stage,$e); }
    catch(\Throwable $e) { return writeInspectorFailure('procesamiento',$e); }
}
