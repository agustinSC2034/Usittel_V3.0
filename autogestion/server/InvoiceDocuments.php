<?php
declare(strict_types=1);
namespace MiUsittel;

const INVOICE_PDF_MAX_BYTES=10485760;
require_once __DIR__.'/DocumentTransport.php';

interface InvoiceDocumentSource {
    public function available(): bool;
    /** Future verified upstream adapter must enforce the size limit while reading. */
    public function fetch(int $ida,string $idt,string $hash): array;
}
final class UnconfirmedInvoiceDocuments implements InvoiceDocumentSource {
    public function available(): bool {return false;}
    public function fetch(int $ida,string $idt,string $hash): array {throw new Failure('DOCUMENT_NOT_CONFIGURED',503);}
}
final class PhantomInvoiceDocuments implements InvoiceDocumentSource {
    public function __construct(private array $config) {}
    public function available(): bool {return $this->config['mode']==='phantom' && in_array(1,$this->config['allowed_idas'],true);}
    public function fetch(int $ida,string $idt,string $hash): array {
        if(!$this->available() || $ida<1) throw new Failure('FORBIDDEN',403);
        $response=requestInvoiceDocument($this->config,$hash,true);
        if($response['http']!==200) throw new Failure('DOCUMENT_HTTP',503,$response['http']);
        $document=['contentType'=>$response['headers']['content-type']??'', 'bytes'=>$response['bytes']];
        validateInvoicePdf($document);
        return $document;
    }
}
function invoiceDocumentAvailability(array $page,InvoiceDocumentSource $source): array {
    foreach($page['items'] as &$item) $item['downloadAvailable']=$source->available();
    unset($item);
    return $page;
}
function validInvoiceHash(mixed $value): bool {
    return is_string($value) && $value!=='' && strlen($value)<=4096 && !preg_match('/[\x00-\x20\x7f]/',$value);
}
function validateInvoicePdf(array $document): string {
    $type=$document['contentType']??null;$bytes=$document['bytes']??null;
    if(!is_string($type) || strtolower(trim(explode(';',$type,2)[0]))!=='application/pdf') throw new Failure('DOCUMENT_MIME');
    if(!is_string($bytes) || strlen($bytes)>INVOICE_PDF_MAX_BYTES) throw new Failure('DOCUMENT_SIZE');
    if(!preg_match('/^%PDF-[12]\.[0-9]/',$bytes) || !str_contains(substr($bytes,-1024),'%%EOF')) throw new Failure('DOCUMENT_FORMAT');
    return $bytes;
}
function invoiceDocument(Phantom $phantom,InvoiceDocumentSource $source,int $ida,string $id): string {
    $row=authorizedInvoice($phantom,$ida,$id);
    if(!$source->available()) throw new Failure('DOCUMENT_NOT_CONFIGURED',503);
    $hash=$row['Hash_Descarga']??null;
    if(!validInvoiceHash($hash)) throw new Failure('DOCUMENT_UNAVAILABLE',404);
    try {$document=$source->fetch($ida,$id,$hash);}
    catch(Failure $e) {throw $e;}
    catch(\Throwable) {throw new Failure('DOCUMENT_UPSTREAM');}
    return validateInvoicePdf($document);
}
function pdfReply(string $id,string $bytes): never {
    header('Content-Type: application/pdf');header('X-Content-Type-Options: nosniff');
    header('Content-Disposition: attachment; filename="factura-'.$id.'.pdf"');
    header('Content-Length: '.strlen($bytes));header('Cache-Control: no-store, private');header('Pragma: no-cache');
    header("Content-Security-Policy: sandbox; default-src 'none'");
    echo $bytes;exit;
}
