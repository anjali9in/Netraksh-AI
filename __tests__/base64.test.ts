import {decodeBase64ToUint8Array} from '../src/utils/base64';

describe('decodeBase64ToUint8Array', () => {
  it('decodes without global atob', () => {
    const originalAtob = global.atob;
    // @ts-expect-error test Hermes-like environment
    delete global.atob;

    const bytes = decodeBase64ToUint8Array('SGVsbG8=');
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);

    if (originalAtob) {
      global.atob = originalAtob;
    }
  });
});
