const assert = require('node:assert/strict');

(async () => {
  const { formatOfferPrice, offerCta } = await import('../js/service-catalog.js');
  assert.equal(formatOfferPrice({currency:'ARS',price_monthly:6999,price_once:null}),'$6.999 por mes');
  assert.equal(formatOfferPrice({currency:'ARS',price_monthly:null,price_once:10000}),'$10.000 pago único');
  assert.equal(formatOfferPrice({currency:'ARS',price_monthly:7750,price_once:10000}),'$7.750 por mes · $10.000 pago único');
  assert.equal(formatOfferPrice({currency:'USD',price_monthly:1,price_once:null}),'1 por mes');
  assert.equal(offerCta('speed'),'Quiero mejorar mi plan');
  assert.equal(offerCta('mesh'),'Me interesa');
  console.log('service catalog: 6 assertions');
})().catch(error => { console.error(error); process.exitCode = 1; });
