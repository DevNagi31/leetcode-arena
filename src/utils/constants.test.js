import { EDUCATION_LEVELS, YEAR_OPTIONS, checkPasswordStrength } from './constants';

describe('constants', () => {
  test('EDUCATION_LEVELS contains expected values', () => {
    expect(EDUCATION_LEVELS).toContain('Undergraduate');
    expect(EDUCATION_LEVELS.length).toBeGreaterThan(0);
  });

  test('YEAR_OPTIONS has entries for each education level', () => {
    EDUCATION_LEVELS.forEach(level => {
      expect(YEAR_OPTIONS[level]).toBeDefined();
      expect(YEAR_OPTIONS[level].length).toBeGreaterThan(0);
    });
  });
});

describe('checkPasswordStrength', () => {
  test('returns low score for short password', () => {
    const result = checkPasswordStrength('abc');
    expect(result.score).toBeLessThanOrEqual(2);
  });

  test('returns higher score for strong password', () => {
    const result = checkPasswordStrength('MyStr0ng!Pass#2024');
    expect(result.score).toBeGreaterThanOrEqual(4);
  });

  test('returns message string', () => {
    const result = checkPasswordStrength('test');
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });

  test('returns color string', () => {
    const result = checkPasswordStrength('test');
    expect(typeof result.color).toBe('string');
  });

  test('handles empty string', () => {
    const result = checkPasswordStrength('');
    expect(result.score).toBe(0);
  });
});
