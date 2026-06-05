describe('crypto utilities', () => {
  const originalCrypto = global.crypto;
  const fixedKeyHex =
    '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });

  it('encrypts and decrypts without overriding CryptoJS randomness or using Math.random', async () => {
    jest.resetModules();

    let nextByte = 1;
    const getRandomValues = jest.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = nextByte % 256;
        nextByte++;
      }
      return array;
    });

    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: {getRandomValues},
    });

    jest.doMock('react-native-keychain', () => ({
      getGenericPassword: jest.fn().mockResolvedValue({
        username: 'biometric',
        password: fixedKeyHex,
      }),
      setGenericPassword: jest.fn().mockResolvedValue(true),
      resetGenericPassword: jest.fn().mockResolvedValue(true),
    }));

    const mathRandomSpy = jest
      .spyOn(Math, 'random')
      .mockImplementation(() => {
        throw new Error('Math.random must not be used for biometric crypto');
      });

    const CryptoJS = require('crypto-js');
    const originalWordArrayRandom = CryptoJS.lib.WordArray.random;

    const {encryptData, decryptData} = require('../src/utils/crypto');

    expect(CryptoJS.lib.WordArray.random).toBe(originalWordArrayRandom);

    const encrypted = await encryptData('sensitive biometric payload');
    const decrypted = await decryptData(encrypted);

    expect(decrypted).toBe('sensitive biometric payload');
    expect(encrypted).toMatch(/^v2:[0-9a-f]{32}:[0-9a-f]+:[0-9a-f]{64}$/);
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(mathRandomSpy).not.toHaveBeenCalled();
  });

  it('rejects authenticated ciphertext when ciphertext is tampered', async () => {
    jest.resetModules();

    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: jest.fn((array: Uint8Array) => {
          array.fill(7);
          return array;
        }),
      },
    });

    jest.doMock('react-native-keychain', () => ({
      getGenericPassword: jest.fn().mockResolvedValue({
        username: 'biometric',
        password: fixedKeyHex,
      }),
      setGenericPassword: jest.fn().mockResolvedValue(true),
      resetGenericPassword: jest.fn().mockResolvedValue(true),
    }));

    const {encryptData, decryptData} = require('../src/utils/crypto');
    const encrypted = await encryptData('template vector');
    const parts = encrypted.split(':');
    parts[2] = `${parts[2].slice(0, -1)}${
      parts[2].endsWith('0') ? '1' : '0'
    }`;

    await expect(decryptData(parts.join(':'))).rejects.toThrow(
      'Encrypted data authentication failed',
    );
  });

  it('rejects authenticated ciphertext when tag is tampered', async () => {
    jest.resetModules();

    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: jest.fn((array: Uint8Array) => {
          array.fill(9);
          return array;
        }),
      },
    });

    jest.doMock('react-native-keychain', () => ({
      getGenericPassword: jest.fn().mockResolvedValue({
        username: 'biometric',
        password: fixedKeyHex,
      }),
      setGenericPassword: jest.fn().mockResolvedValue(true),
      resetGenericPassword: jest.fn().mockResolvedValue(true),
    }));

    const {encryptData, decryptData} = require('../src/utils/crypto');
    const encrypted = await encryptData('template vector');
    const parts = encrypted.split(':');
    parts[3] = `${parts[3].slice(0, -1)}${
      parts[3].endsWith('0') ? '1' : '0'
    }`;

    await expect(decryptData(parts.join(':'))).rejects.toThrow(
      'Encrypted data authentication failed',
    );
  });

  it('can decrypt legacy unversioned AES-CBC ciphertext for migration', async () => {
    jest.resetModules();

    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: jest.fn((array: Uint8Array) => {
          array.fill(11);
          return array;
        }),
      },
    });

    jest.doMock('react-native-keychain', () => ({
      getGenericPassword: jest.fn().mockResolvedValue({
        username: 'biometric',
        password: fixedKeyHex,
      }),
      setGenericPassword: jest.fn().mockResolvedValue(true),
      resetGenericPassword: jest.fn().mockResolvedValue(true),
    }));

    const CryptoJS = require('crypto-js');
    const ivHex = '101112131415161718191a1b1c1d1e1f';
    const encrypted = CryptoJS.AES.encrypt(
      'legacy template vector',
      CryptoJS.enc.Hex.parse(fixedKeyHex),
      {
        iv: CryptoJS.enc.Hex.parse(ivHex),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      },
    );
    const legacyCiphertext = `${ivHex}:${encrypted.ciphertext.toString(
      CryptoJS.enc.Hex,
    )}`;

    const {decryptData} = require('../src/utils/crypto');

    await expect(decryptData(legacyCiphertext)).resolves.toBe(
      'legacy template vector',
    );
  });

  it('fails clearly when secure random generation is unavailable', async () => {
    jest.resetModules();

    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: undefined,
    });

    jest.doMock('react-native-keychain', () => ({
      getGenericPassword: jest.fn().mockResolvedValue(false),
      setGenericPassword: jest.fn().mockResolvedValue(true),
      resetGenericPassword: jest.fn().mockResolvedValue(true),
    }));

    const {encryptData} = require('../src/utils/crypto');

    await expect(encryptData('payload')).rejects.toThrow(
      'Secure random generator unavailable',
    );
  });
});
