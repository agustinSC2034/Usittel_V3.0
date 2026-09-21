<?php
declare(strict_types=1);
namespace MiUsittel;

// Diagnostics only: never expose ticket identifiers, free text or arbitrary states.
function ticketInspectionShape(array $data,string $step): array {
    $list=array_is_list($data);
    $r=['result_type'=>get_debug_type($data),'list'=>$list,'count'=>count($data)];
    if($step==='existence') {
        $r['id_present']=array_key_exists('IDTT',$data);
        $r['id_type']=get_debug_type($data['IDTT']??null);
        $r['no_ticket_id']=$r['id_present']&&in_array($data['IDTT'],[null,0,'0',''],true);
        $r['id_empty_string']=($data['IDTT']??null)==='';
        $r['permit_present']=array_key_exists('Permitir',$data);
        $r['permit_type']=get_debug_type($data['Permitir']??null);
        $r['permit_value']=in_array($data['Permitir']??null,[0,1,'0','1'],true)?$data['Permitir']:null;
        return $r;
    }
    $valid=$list;
    $states=[];$unknown=0;
    foreach($data as $row) {
        if(!is_array($row) || array_is_list($row)) {$valid=false;continue;}
        $state=$row['Estado']??null;
        if(in_array($state,['Abierto','Pendiente','Resuelto','Cerrado','Rechazado'],true)) $states[]=$state;
        else $unknown++;
    }
    $r['ticket_count']=$valid?count($data):null;
    $r['states']=array_values(array_unique($states));$r['unknown_state_count']=$unknown;
    if($list) foreach(array_slice($data,0,1) as $row) if(is_array($row))
        foreach(['ID','IDTT','IDA','Categoria','Delegacion','Estado','Fecha'] as $field)
            $r['sample'][$field]=['present'=>array_key_exists($field,$row),'type'=>get_debug_type($row[$field]??null)];
    return $r;
}

function inspectorArguments(array $args): array {
    if(!in_array(count($args),[2,3],true) || ($args[1]??null)!=='1'
        || (isset($args[2]) && $args[2]!=='--auth-get')) throw new Failure('INSPECTOR_ARGUMENTS');
    return ['ida'=>1,'authForm'=>false,'authGet'=>($args[2]??null)==='--auth-get'];
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
