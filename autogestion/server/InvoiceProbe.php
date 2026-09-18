<?php
declare(strict_types=1);
namespace MiUsittel;

function runInvoiceProbe(array $config): int {
    $stage='autenticacion';$failure=null;$output=null;
    ob_start();set_error_handler(static function() {throw new Failure('PROBE_PHP');});
    try {
        if(PHP_SAPI!=='cli' || $config['mode']!=='phantom' || !in_array(1,$config['allowed_idas'],true)) throw new Failure('CONFIGURATION');
        $token=inspectionAuthGetToken($config);$transport=new CurlTransport($config,inspectResponseFormat:true);
        $ids=[];$pages=[];
        foreach([0,INVOICE_PAGE_SIZE] as $offset) {
            $stage=$offset===0?'facturas_pagina_1':'facturas_pagina_2';
            $rows=$transport->post($config['phantom_url'].'?'.http_build_query([
                'action'=>'Phantom_Ultima_Factura','JSON'=>1,'IDA'=>1,'Limit'=>INVOICE_PAGE_SIZE,'Offset'=>$offset]),['token'=>$token]);
            if((int)($rows['code']??0)===400 && ($rows['message']??null)==='Error: No se encontró factura para el cliente (400)') $rows=[];
            if(isset($rows['code']) || isset($rows['error'])) throw new Failure('PHANTOM_FUNCTIONAL');
            $rows=validateInvoiceRows($rows,INVOICE_PAGE_SIZE);
            $ids[]=array_map(static fn($r)=>invoiceId($r['IDT']),$rows);
            $hashTypes=[];$hashCount=0;
            foreach($rows as $row) if(array_key_exists('Hash_Descarga',$row)) {
                $hashCount++;$hashTypes[get_debug_type($row['Hash_Descarga'])]=true;
            }
            $pages[]=['offset'=>$offset,'count'=>count($rows),'unique_ids'=>true,'descending_id'=>true,
                'short_page'=>count($rows)<INVOICE_PAGE_SIZE,'hash_field'=>['present_count'=>$hashCount,'types'=>array_keys($hashTypes)]];
        }
        $overlap=count(array_intersect($ids[0],$ids[1]));
        $continuity=$ids[0]!==[] && $ids[1]!==[] ? compareInvoiceIds(end($ids[0]),$ids[1][0])>0 && $overlap===0:null;
        $output=json_encode(['invoices'=>['limit'=>INVOICE_PAGE_SIZE,'pages'=>$pages,'overlap_count'=>$overlap,
            'page_2_older'=>$continuity,'two_nonempty_pages'=>count($ids[0])===INVOICE_PAGE_SIZE && $ids[1]!==[],
            'short_first_then_nonempty_second'=>count($ids[0])<INVOICE_PAGE_SIZE && $ids[1]!==[]]],JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT);
    } catch(\Throwable $e) {$failure=$e;}
    finally {unset($token,$rows,$ids);restore_error_handler();ob_end_clean();}
    if($failure!==null) return writeInspectorFailure($stage,$failure);
    echo $output.PHP_EOL;return 0;
}
