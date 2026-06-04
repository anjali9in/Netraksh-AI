/** Pure base64 decode — Hermes does not provide global atob. */
const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decodes a base64 string into raw bytes without atob/Buffer.
 */
export function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const trimmed = base64.replace(/\s/g, '');
  const padding =
    trimmed.endsWith('==') ? 2 : trimmed.endsWith('=') ? 1 : 0;
  const cleanStr = trimmed.replace(/=+$/, '');
  const bytes: number[] = [];

  let i = 0;
  while (i < cleanStr.length) {
    const code1 = BASE64_CHARS.indexOf(cleanStr.charAt(i++));
    const code2 =
      i < cleanStr.length ? BASE64_CHARS.indexOf(cleanStr.charAt(i++)) : 0;
    const code3 =
      i < cleanStr.length ? BASE64_CHARS.indexOf(cleanStr.charAt(i++)) : 0;
    const code4 =
      i < cleanStr.length ? BASE64_CHARS.indexOf(cleanStr.charAt(i++)) : 0;

    if (code1 < 0 || code2 < 0) {
      throw new Error('Invalid base64 input');
    }

    bytes.push((code1 << 2) | (code2 >> 4));
    if (i - 2 < cleanStr.length && code3 >= 0) {
      bytes.push(((code2 & 15) << 4) | (code3 >> 2));
    }
    if (i - 1 < cleanStr.length && code4 >= 0) {
      bytes.push(((code3 & 3) << 6) | code4);
    }
  }

  if (padding > 0) {
    bytes.length -= padding;
  }

  return Uint8Array.from(bytes);
}
