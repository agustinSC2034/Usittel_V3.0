<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1')exit(2);
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/ServiceRequests.php';
$dir=getenv('MI_USITTEL_RUNTIME');
$gateway=new class($dir) implements TicketGateway {
    public function __construct(private string $dir) {}
    public function open(int $ida): array {return [];}
    public function clear(int $ida): bool {return true;}
    public function detail(int $ida,string $ticket): array {return ['ID'=>'432','IDA'=>$ida,'Categoria'=>'Fixture','Estado'=>'Abierto'];}
    public function create(int $ida,array $body): string {file_put_contents($this->dir.'/writes','1',FILE_APPEND);return '432';}
};
$c=['tickets'=>['enabled'=>true,'lab_ida'=>8,'products'=>['MESH'=>['category'=>'Fixture','delegation'=>'Fixture','priority'=>2,'subject'=>'Fixture','contracted_labels'=>['Fixture Mesh'],'states'=>['Abierto'=>'RECEIVED']]]]];
$service=new ServiceRequests(new ServiceRequestStore($dir),$gateway,$c);
echo json_encode($service->create(8,'MESH',$argv[1],fn()=>[]));
