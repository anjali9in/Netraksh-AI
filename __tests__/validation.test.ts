import {validateEmployeeId} from '../src/utils/validation';

describe('validateEmployeeId', () => {
  it('returns true for a valid employee id', () => {
    expect(validateEmployeeId('EMP001')).toBe(true);
  });

  it('returns false for an empty employee id', () => {
    expect(validateEmployeeId('')).toBe(false);
  });

  it('returns false for a too short employee id', () => {
    expect(validateEmployeeId('AB')).toBe(false);
  });
});
