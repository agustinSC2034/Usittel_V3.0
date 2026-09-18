// Small, local demo PDF. Never represents a fiscal invoice or real receipt.
// Built-in PDF fonts avoid a runtime PDF dependency in this prototype.
export function downloadDocument(invoice, receipt = false) {
  const lines = [
    'MI USITTEL - DOCUMENTO DE EJEMPLO', 'SIN VALIDEZ FISCAL - NO ACREDITA UN PAGO REAL', '',
    receipt ? 'Comprobante de pago (demostracion)' : 'Factura (demostracion)',
    `Periodo: ${invoice.period}`, `Importe: $${invoice.amount.toLocaleString('es-AR')}`,
    `Vencimiento: ${invoice.due}`, `Estado: ${invoice.status}`,
    ...(receipt ? [`Fecha de pago de ejemplo: ${invoice.paidAt}`] : ['Concepto: Abono Fibra 300 Mbps']),
    '', 'Agustin - Costa Rica 550, Tandil',
  ];
  const pdfString = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').replace(/[\\()]/g, '\\$&');
  const stream = `BT /F1 12 Tf 50 790 Td 22 TL ${lines.map((line, index) => `${index ? 'T* ' : ''}(${pdfString(line)}) Tj`).join('\n')} ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const start = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${receipt ? 'comprobante' : 'factura'}-DEMO-${invoice.id}.pdf`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
