<?php
declare(strict_types=1);
namespace MiUsittel;
require_once __DIR__.'/ServiceDiagnostics.php';

// Direct Phantom relationships and strict, exact document matches may authorize candidates.
function serviceCandidates(array $root): array {
    $rows=$root['Conexiones_Asociadas']??[];
    if(!is_array($rows) || !array_is_list($rows) || count($rows)>10) throw new Failure('SERVICES_SCHEMA');
    $ids=[];
    foreach($rows as $row) {
        if($row==='') continue; // Phantom uses [""] when no direct association exists.
        if(is_string($row) && preg_match('/^[1-9][0-9]{0,9}$/D',$row)) {$ids[(int)$row]=(int)$row;continue;}
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
function preferredIdentityDocument(array $record): ?string {
    $documents=recordDocuments($record);
    foreach(['Cuit','CUIT','Cuit_Cuil','Documento','DNI','dni'] as $field) {
        if(isset($documents[$field]) && documentKind($documents[$field])!=='cuit_invalid') return $documents[$field];
    }
    return null;
}
function documentCandidateIds(array $rows,string $source,int $rootId): array {
    if(documentKind($source)==='cuit_invalid') throw new Failure('SERVICES_DOCUMENT_SCHEMA');
    if(!array_is_list($rows) || $rows===[] || count($rows)>20) throw new Failure('SERVICES_DOCUMENT_SCHEMA');
    $ids=[];
    foreach($rows as $row) {
        if(!is_array($row) || array_is_list($row)) throw new Failure('SERVICES_DOCUMENT_SCHEMA');
        $id=$row['ID']??null;
        if(!is_string($id) || !preg_match('/^[1-9][0-9]{0,9}$/D',$id)) throw new Failure('SERVICES_DOCUMENT_SCHEMA');
        $matches=false;foreach(recordDocuments($row) as $candidate) if(documentsEquivalent($source,$candidate)){$matches=true;break;}
        if(!$matches) throw new Failure('SERVICES_DOCUMENT_MISMATCH');
        $ids[(int)$id]=(int)$id;
        if(count($ids)>10) throw new Failure('SERVICES_LIMIT');
    }
    if(!isset($ids[$rootId])) throw new Failure('SERVICES_DOCUMENT_ROOT');
    return array_values($ids);
}
function discoverServices(Phantom $ph,int $rootId,?callable $inspect=null): array {
    $root=$ph->customer($rootId);
    if($inspect!==null) $inspect('root',$root);
    $rows=[$rootId=>$root];$candidates=[];$success=false;$warning=false;
    $stage='association_structure';
    try {
        $ids=serviceCandidates($root);
        $scope=array_values(array_unique([$rootId,...$ids]));$ph->scope($scope);
        $stage='associated_customer';
        $direct=[];foreach($ids as $id) if($id!==$rootId) $direct[$id]=$ph->customer($id);
        $candidates+=$direct;
        $success=true;
    } catch(Failure $e) {
        $warning=true;
        if($inspect!==null) $inspect($stage,['code'=>in_array($e->kind,['SERVICES_SCHEMA','SERVICES_LIMIT','CUSTOMER_IDENTITY','FORBIDDEN'],true)?$e->kind:'ASSOCIATED_READ_FAILED']);
    }
    $source=preferredIdentityDocument($root);
    if($source!==null) {
        $stage='document_search';
        try {
            $ids=documentCandidateIds($ph->customersByDocument($source),$source,$rootId);
            $ph->scope(array_values(array_unique([$rootId,...$ids,...array_keys($candidates)])));
            $stage='document_customer';
            $documentCandidates=[];
            foreach($ids as $id) {
                if($id===$rootId) continue;
                $record=$ph->customer($id);$match=false;
                foreach(recordDocuments($record) as $candidate) if(documentsEquivalent($source,$candidate)){$match=true;break;}
                if(!$match) throw new Failure('SERVICES_DOCUMENT_MISMATCH');
                $documentCandidates[$id]=$record;
            }
            $candidates+=$documentCandidates;
            $success=true;
        } catch(Failure $e) {
            $warning=true;
            if($inspect!==null) $inspect($stage,['code'=>in_array($e->kind,['SERVICES_DOCUMENT_SCHEMA','SERVICES_DOCUMENT_MISMATCH','SERVICES_DOCUMENT_ROOT','SERVICES_LIMIT','CUSTOMER_IDENTITY','FORBIDDEN'],true)?$e->kind:'DOCUMENT_READ_FAILED']);
        }
    }
    $rows+=$candidates;
    // Any ambiguous/incomplete discovery retains only the authenticated contract.
    $ph->scope(array_keys($rows));$services=[];
    foreach($rows as $id=>$record) {
        $p=$ph->publicProfile($record);
        $services[]=['id'=>(string)$id,'address'=>$p['address'],'plan'=>$p['plan'],'serviceStatus'=>$p['serviceStatus']];
    }
    return ['services'=>$services,'servicesUnavailable'=>!$success || $warning];
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
