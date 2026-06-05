import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

const KEY_SERVICE = 'netraksh-ai.biometric-key';
const KEY_USERNAME = 'biometric';
const AUTHENTICATED_FORMAT_VERSION = 'v2';

function secureRandomWordArray(nBytes: number): CryptoJS.lib.WordArray {
  const getRandomValues = global.crypto?.getRandomValues?.bind(global.crypto);
  if (!getRandomValues) {
    throw new Error(
      'Secure random generator unavailable. Ensure react-native-get-random-values is imported before crypto utilities.',
    );
  }

  const bytes = new Uint8Array(nBytes);
  getRandomValues(bytes);

  const words: number[] = [];
  for (let i = 0; i < nBytes; i++) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
  }

  return (CryptoJS.lib.WordArray as any).create(words, nBytes);
}

function deriveKey(
  masterKeyHex: string,
  purpose: 'encryption' | 'authentication',
): CryptoJS.lib.WordArray {
  return CryptoJS.HmacSHA256(
    `netraksh-ai.biometric.${purpose}.v2`,
    CryptoJS.enc.Hex.parse(masterKeyHex),
  );
}

function buildAuthenticationPayload(ivHex: string, ciphertextHex: string): string {
  return `${AUTHENTICATED_FORMAT_VERSION}:${ivHex}:${ciphertextHex}`;
}

function timingSafeEqualHex(left: string, right: string): boolean {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
  let difference = normalizedLeft.length ^ normalizedRight.length;

  for (let i = 0; i < maxLength; i++) {
    difference |=
      (normalizedLeft.charCodeAt(i) || 0) ^
      (normalizedRight.charCodeAt(i) || 0);
  }

  return difference === 0;
}

function decryptAesCbc(
  ciphertextHex: string,
  ivHex: string,
  encryptionKey: CryptoJS.lib.WordArray,
): string {
  const decrypted = CryptoJS.AES.decrypt(
    {ciphertext: CryptoJS.enc.Hex.parse(ciphertextHex)} as CryptoJS.lib.CipherParams,
    encryptionKey,
    {
      iv: CryptoJS.enc.Hex.parse(ivHex),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  );

  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  if (!decryptedText) {
    throw new Error('Decryption failed: empty result or invalid padding');
  }

  return decryptedText;
}

let cachedKey: string | null = null;

/**
 * Retrieves the biometric encryption key from Keychain or generates a new one if not found.
 */
async function getOrCreateBiometricKey(): Promise<string> {
  if (cachedKey) {
    return cachedKey;
  }

  try {
    const credentials = await Keychain.getGenericPassword({
      service: KEY_SERVICE,
    });

    if (credentials && credentials.password) {
      cachedKey = credentials.password;
      return cachedKey;
    }
  } catch (e) {
    console.error('[Crypto] Failed to read key from keychain:', e);
  }

  // Generate a random 256-bit key (32 bytes = 64 hex characters)
  const newKey = secureRandomWordArray(32).toString(CryptoJS.enc.Hex);

  try {
    await Keychain.setGenericPassword(KEY_USERNAME, newKey, {
      service: KEY_SERVICE,
    });
    cachedKey = newKey;
  } catch (e) {
    console.error('[Crypto] Failed to save key to keychain:', e);
    cachedKey = newKey; // Fallback to in-memory key so the app doesn't crash
  }

  return cachedKey;
}

/**
 * Encrypts plaintext using AES-256-CBC plus HMAC-SHA256.
 * Returns the versioned format `v2:IV_HEX:CIPHERTEXT_HEX:HMAC_HEX`.
 */
export async function encryptData(plaintext: string): Promise<string> {
  const masterKey = await getOrCreateBiometricKey();
  const encryptionKey = deriveKey(masterKey, 'encryption');
  const authenticationKey = deriveKey(masterKey, 'authentication');
  const iv = secureRandomWordArray(16); // 16-byte IV for CBC mode

  const encrypted = CryptoJS.AES.encrypt(plaintext, encryptionKey, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const ivHex = iv.toString(CryptoJS.enc.Hex);
  const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  const payload = buildAuthenticationPayload(ivHex, ciphertextHex);
  const tagHex = CryptoJS.HmacSHA256(
    payload,
    authenticationKey,
  ).toString(CryptoJS.enc.Hex);

  return `${payload}:${tagHex}`;
}

/**
 * Decrypts versioned authenticated ciphertext.
 * Legacy `IV_HEX:CIPHERTEXT_HEX` values are still accepted for existing templates.
 */
export async function decryptData(encryptedData: string): Promise<string> {
  if (!encryptedData.includes(':')) {
    throw new Error('Invalid encrypted data format');
  }

  const masterKey = await getOrCreateBiometricKey();
  const parts = encryptedData.split(':');

  if (parts[0] === AUTHENTICATED_FORMAT_VERSION) {
    if (parts.length !== 4) {
      throw new Error('Invalid authenticated encrypted data format');
    }

    const [, ivHex, ciphertextHex, tagHex] = parts;
    const authenticationKey = deriveKey(masterKey, 'authentication');
    const expectedTagHex = CryptoJS.HmacSHA256(
      buildAuthenticationPayload(ivHex, ciphertextHex),
      authenticationKey,
    ).toString(CryptoJS.enc.Hex);

    if (!timingSafeEqualHex(tagHex, expectedTagHex)) {
      throw new Error('Encrypted data authentication failed');
    }

    return decryptAesCbc(
      ciphertextHex,
      ivHex,
      deriveKey(masterKey, 'encryption'),
    );
  }

  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, ciphertextHex] = parts;
  return decryptAesCbc(
    ciphertextHex,
    ivHex,
    CryptoJS.enc.Hex.parse(masterKey),
  );
}
