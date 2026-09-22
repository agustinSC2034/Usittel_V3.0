const assert = require('node:assert/strict');

(async () => {
  const { normalizeServices, serviceOffers, upgradeOffers } = await import('../js/service-catalog.js');
  const catalog = { sensa: ['TV Sensa'], sensa_pack: ['Pack Sensa'], stb: ['Set Top Box'], mesh: ['Wi-Fi Mesh'] };
  assert.equal(normalizeServices(null, catalog).known, false);
  assert.deepEqual(serviceOffers(null, 'Plan', [], catalog), []);
  assert.deepEqual(normalizeServices([], catalog).labels, []);
  assert.deepEqual(normalizeServices(['TV Sensa', 'TV Sensa × 2', 'Set Top Box'], catalog).labels, ['TV Sensa', 'TV Sensa × 2', 'Set Top Box']);
  assert.deepEqual(serviceOffers([], 'Plan', [], catalog).map(o => o.type), ['sensa', 'mesh']);
  assert.deepEqual(serviceOffers(['TV Sensa'], 'Plan', [], catalog).map(o => o.type), ['sensa_pack', 'stb', 'mesh']);
  assert.deepEqual(serviceOffers(['TV Sensa', 'Pack Sensa', 'Set Top Box', 'Wi-Fi Mesh'], 'Plan', [], catalog), []);
  assert.deepEqual(upgradeOffers('Plan', [{ current: 'Plan', target: 'Plan 500', public_name: 'Internet 500 Mbps', current_down: 300, speed_down: 500 }]), [{ type: 'speed', label: 'Internet 500 Mbps', target: 'Plan 500' }]);
  assert.deepEqual(upgradeOffers('Plan', [{ current: 'Plan', target: 'Plan 100', public_name: 'Internet 100 Mbps', current_down: 300, speed_down: 100 }]), []);
  console.log('service catalog: 9 assertions');
})().catch(error => { console.error(error); process.exitCode = 1; });
