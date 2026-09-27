const assert = require('node:assert/strict');

(async () => {
  const { validateWifiSsid, validateWifiPassword } = await import('../js/wifi-input.js');
  let checks = 0;
  const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
  check(validateWifiSsid('Mi Casa'), { value: 'Mi_Casa', changed: true });
  check(validateWifiSsid('Agustín-5G'), { value: 'Agustin-5G', changed: true });
  check(validateWifiSsid('ÁéÍóÚñÑ_1'), { value: 'AeIoUñÑ_1', changed: true });
  check(validateWifiSsid('A,.:;*+_-@=!ñÑ1'), { value: 'A,.:;*+_-@=!ñÑ1', changed: false });
  for (const length of [4, 5, 20, 21]) {
    const value = 'A'.repeat(length);
    check(validateWifiSsid(value), length >= 5 && length <= 20
      ? { value, changed: false }
      : { error: 'El nombre de la red debe tener entre 5 y 20 caracteres.' });
  }
  check(validateWifiSsid('abc'), { error: 'El nombre de la red debe tener entre 5 y 20 caracteres.' });
  check(validateWifiSsid('WiFi#Casa'), { error: 'El nombre de la red contiene un carácter no permitido (#).' });
  for (const forbidden of ['/', '\\', '$', '%', '<', '>', '?', '¿', '#', '\t', '\n', '\r', '\u00a0']) {
    assert.ok(validateWifiSsid(`Casa${forbidden}WiFi`).error); checks++;
    assert.ok(validateWifiPassword(`Clave${forbidden}123`).error); checks++;
  }
  check(validateWifiPassword('ClaveCasa123!'), { value: 'ClaveCasa123!' });
  check(validateWifiPassword('Clave Casa'), { error: 'La contraseña no puede contener espacios. Podés usar _ en su lugar.' });
  check(validateWifiPassword('Claveá123'), { error: 'La contraseña no puede contener tildes. Usá letras sin acento.' });
  check(validateWifiPassword('ClaveÁ123'), { error: 'La contraseña no puede contener tildes. Usá letras sin acento.' });
  check(validateWifiPassword('A,.:;*+_-@=!ñÑ1'), { value: 'A,.:;*+_-@=!ñÑ1' });
  for (const length of [7, 8, 20, 21]) {
    const value = 'A'.repeat(length);
    check(validateWifiPassword(value), length >= 8 && length <= 20
      ? { value }
      : { error: 'La contraseña debe tener entre 8 y 20 caracteres.' });
  }
  check(validateWifiSsid('A'.repeat(20)), { value: 'A'.repeat(20), changed: false });
  console.log(`wifi input: ${checks} assertions`);
})().catch(error => { console.error(error); process.exitCode = 1; });
