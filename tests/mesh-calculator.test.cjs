const assert = require('node:assert/strict');
const { recommend } = require('../js/mesh-calculator.js');

// Preserve all original recommendation thresholds across every supported home configuration.
let checked = 0;
for (const ambientes of [0, 1, 2]) for (const m2 of [1, 2, 3, 4]) {
  for (const plantas of [0, 2, 3]) for (const distribucion of [1, 2]) {
    const score = ambientes + m2 + plantas + distribucion;
    const expected = score <= 2 ? 0 : score <= 4 ? 1 : score <= 7 ? 2 : score <= 9 ? 3 : 4;
    assert.equal(recommend({ ambientes, m2, plantas, distribucion }).count, expected);
    checked++;
  }
}
for (const invalid of [null, {}, { ambientes: 0, m2: 1, plantas: 0 },
  { ambientes: 0, m2: 1, plantas: 0, distribucion: 99 },
  { ambientes: 0, m2: '1', plantas: 0, distribucion: 1 }]) assert.equal(recommend(invalid), null);
console.log(`${checked} Mesh configurations and 5 invalid/incomplete inputs passed.`);
