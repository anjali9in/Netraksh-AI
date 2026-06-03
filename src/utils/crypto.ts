import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

const KEY_SERVICE = 'netraksh-ai.biometric-key';
const KEY_USERNAME = 'biometric';

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
  const newKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);

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
 * Encrypts a plaintext string using AES-256-CBC with a unique IV.
 * Returns the format `IV_HEX:CIPHERTEXT_HEX`.
 */
export async function encryptData(plaintext: string): Promise<string> {
  const key = await getOrCreateBiometricKey();
  const iv = CryptoJS.lib.WordArray.random(16); // 16-byte IV for CBC mode

  const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Hex.parse(key), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.ciphertext.toString(CryptoJS.enc.Hex);
}

/**
 * Decrypts a ciphertext string of format `IV_HEX:CIPHERTEXT_HEX` using AES-256-CBC.
 */
export async function decryptData(encryptedData: string): Promise<string> {
  if (!encryptedData.includes(':')) {
    throw new Error('Invalid encrypted data format');
  }

  const key = await getOrCreateBiometricKey();
  const [ivHex, ciphertextHex] = encryptedData.split(':');
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
    CryptoJS.enc.Hex.parse(key),
    {
      iv: iv,
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
