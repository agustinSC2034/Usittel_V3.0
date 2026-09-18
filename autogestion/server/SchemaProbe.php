<?php
declare(strict_types=1);
namespace MiUsittel;

// Explicit CLI laboratory probe. No portal transport, session or cache changes.
function runGetSchemaInspector(array $config): int {
    $stage='configuracion';$failure=null;$output=null;
    ob_start();
    set_error_handler(static function() {throw new Failure('PROBE_PHP');});
    try {
        if(PHP_SAPI!=='cli' || $config['mode']!=='phantom' || !in_array(1,$config['allowed_idas'],true)) throw new Failure('CONFIGURATION');
        $stage='autenticacion';
        $token=inspectionAuthGetToken($config);
        $transport=new CurlTransport($config,inspectResponseFormat:true);
        $result=[];
        foreach([
            ['cliente','customer','Consulta_Cliente_Avanzada',[]],
            ['estado_cuenta','account','Phantom_Mi_Estado_Cuenta',[]],
            ['factura','invoice','Phantom_Ultima_Factura',['Limit'=>1,'Offset'=>0]],
        ] as [$stage,$section,$action,$params]) {
            $data=$transport->post($config['phantom_url'].'?'.http_build_query(['action'=>$action,'JSON'=>1,'IDA'=>1]+$params),['token'=>$token]);
            // Only the documented no-invoice response is treated as an empty list.
            if($action==='Phantom_Ultima_Factura' && (int)($data['code']??0)===400
                && ($data['message']??null)==='Error: No se encontró factura para el cliente (400)') $data=[];
            if((isset($data['code']) && (int)$data['code']!==200) || isset($data['error'])
                || (isset($data['message']) && is_string($data['message']) && str_starts_with($data['message'],'Error:'))) throw new Failure('PHANTOM_FUNCTIONAL');
            // Preserve raw envelopes. A representative array item's shape is NOT
            // selection of an authenticated customer or a profile/balance mapping.
            $remaining=120;
            $result[$section]=inspectionShape($data,$remaining);
            unset($data);
        }
        $output=json_encode($result,JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
    } catch(\Throwable $e) {$failure=$e;}
    finally {unset($token,$data);restore_error_handler();ob_end_clean();}
    if($failure!==null) return writeInspectorFailure($stage,$failure);
    echo $output.PHP_EOL;
    return 0;
}
