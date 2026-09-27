const allowed = /^[A-Za-zñÑ0-9,.:;*+_@=!-]$/u;
const accents = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' };
export const WIFI_SSID_PREFIX = 'USITTEL_';

const characterError = (value, label) => {
  for (const character of value) {
    if (allowed.test(character)) continue;
    if (/\s/u.test(character)) return `${label} contiene un espacio no permitido.`;
    return `${label} contiene un carácter no permitido (${character}).`;
  }
  return null;
};

export function validateWifiSsid(value) {
  if (typeof value !== 'string') return { error: 'El nombre de la red no es válido.' };
  if (!value.startsWith(WIFI_SSID_PREFIX)) return { error: 'El nombre de la red debe comenzar con USITTEL_.' };
  const suffix = value.slice(WIFI_SSID_PREFIX.length);
  if (!suffix) return { error: 'Agregá un nombre después de USITTEL_.' };
  const normalized = WIFI_SSID_PREFIX + suffix.replace(/[áéíóúÁÉÍÓÚ]/gu, character => accents[character]).replaceAll(' ', '_');
  const error = characterError(normalized, 'El nombre de la red');
  if (error) return { error };
  const length = [...normalized].length;
  if (length > 20) return { error: 'Podés agregar hasta 12 caracteres después de USITTEL_.' };
  return { value: normalized, changed: normalized !== value };
}

export function validateWifiPassword(value) {
  if (typeof value !== 'string') return { error: 'La contraseña no es válida.' };
  if (value.includes(' ')) return { error: 'La contraseña no puede contener espacios. Podés usar _ en su lugar.' };
  if (/[áéíóúÁÉÍÓÚ]/u.test(value)) return { error: 'La contraseña no puede contener tildes. Usá letras sin acento.' };
  const error = characterError(value, 'La contraseña');
  if (error) return { error };
  const length = [...value].length;
  if (length < 8 || length > 20) return { error: 'La contraseña debe tener entre 8 y 20 caracteres.' };
  return { value };
}
