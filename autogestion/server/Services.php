<?php
declare(strict_types=1);
namespace MiUsittel;

// Only direct Phantom relationships authorize candidates. Documents are never searched.
function serviceCandidates(array $root): array {
    $rows=$root['Conexiones_Asociadas']??[];
    if(!is_array($rows) || !array_is_list($rows) || count($rows)>10) throw new Failure('SERVICES_SCHEMA');
    $ids=[];
    foreach($rows as $row) {
        $group=is_array($row) && array_is_list($row)?$row:[$row];
        if(count($group)>10) throw new Failure('SERVICES_SCHEMA');
        foreach($group as $entry) {
            $id=is_array($entry)?($entry['ID']??null):null;
            if(!is_string($id) || !preg_match('/^[1-9][0-9]{0,9}$/D',$id)) throw new Failure('SERVICES_SCHEMA');
            $ids[(int)$id]=(int)$id;
            if(count($ids)>10) throw new Failure('SERVICES_LIMIT');
        }
    }
    return array_values($ids);
}
function discoverServices(Phantom $ph,int $rootId): array {
    $root=$ph->customer($rootId);
    $rows=[$rootId=>$root];$warning=false;
    try {
        $ids=serviceCandidates($root);
        $ph->scope(array_values(array_unique([$rootId,...$ids])));
        foreach($ids as $id) if($id!==$rootId) $rows[$id]=$ph->customer($id);
    } catch(Failure) { $rows=[$rootId=>$root];$warning=true; }
    // Any ambiguous/incomplete discovery retains only the authenticated contract.
    $ph->scope(array_keys($rows));$services=[];
    foreach($rows as $id=>$record) {
        $p=$ph->publicProfile($record);
        $services[]=['id'=>(string)$id,'address'=>$p['address'],'plan'=>$p['plan'],'serviceStatus'=>$p['serviceStatus']];
    }
    return ['services'=>$services,'servicesUnavailable'=>$warning];
}
function serviceSession(): array {
    if(!isset($_SESSION['authenticated_ida'])) return ['services'=>[],'selectedServiceId'=>null,'serviceRevision'=>null];
    $ids=array_map('intval',array_column($_SESSION['authorized_services']??[],'id'));
    $root=$_SESSION['authenticated_ida'];
    if(!in_array($root,$ids,true)) throw new Failure('UNAUTHENTICATED',401);
    if(!in_array($_SESSION['selected_ida']??null,$ids,true)) {
        $_SESSION['selected_ida']=$root;$_SESSION['service_revision']=bin2hex(random_bytes(16));unset($_SESSION['invoice_history']);
    }
    return ['services'=>$_SESSION['authorized_services'],'selectedServiceId'=>(string)$_SESSION['selected_ida'],
        'serviceRevision'=>$_SESSION['service_revision'],'servicesUnavailable'=>$_SESSION['services_unavailable']??false];
}
