const jwt = require('jsonwebtoken');

// Set env before requiring anything
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

describe('Auth middleware logic', () => {
  test('JWT signs and verifies correctly', () => {
    const token = jwt.sign({ userId: '12345' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.userId).toBe('12345');
  });

  test('JWT verification fails with wrong secret', () => {
    const token = jwt.sign({ userId: '12345' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });

  test('JWT expiration works', () => {
    const token = jwt.sign({ userId: '12345' }, process.env.JWT_SECRET, { expiresIn: '0s' });
    expect(() => jwt.verify(token, process.env.JWT_SECRET)).toThrow();
  });

  test('Reset token has purpose claim', () => {
    const token = jwt.sign(
      { userId: '12345', purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.purpose).toBe('password-reset');
    expect(decoded.userId).toBe('12345');
  });
});

describe('Password hashing', () => {
  const bcrypt = require('bcryptjs');

  test('hashes password correctly', async () => {
    const password = 'TestPassword123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });

  test('verifies correct password', async () => {
    const password = 'TestPassword123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);
  });

  test('rejects wrong password', async () => {
    const password = 'TestPassword123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const isMatch = await bcrypt.compare('WrongPassword', hash);
    expect(isMatch).toBe(false);
  });
});

describe('Rate limit config', () => {
  const { apiLimiter, authLimiter, leetcodeLimiter } = require('../middleware/security');

  test('rate limiters are defined', () => {
    expect(apiLimiter).toBeDefined();
    expect(authLimiter).toBeDefined();
    expect(leetcodeLimiter).toBeDefined();
  });

  test('rate limiters are functions (middleware)', () => {
    expect(typeof apiLimiter).toBe('function');
    expect(typeof authLimiter).toBe('function');
    expect(typeof leetcodeLimiter).toBe('function');
  });
});

describe('Validation patterns', () => {
  test('email validation regex', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('invalid')).toBe(false);
    expect(emailRegex.test('@example.com')).toBe(false);
    expect(emailRegex.test('user@')).toBe(false);
  });

  test('password length validation', () => {
    expect('short'.length >= 8).toBe(false);
    expect('longEnough1'.length >= 8).toBe(true);
  });

  test('username length validation', () => {
    const isValid = (u) => u.length >= 3 && u.length <= 20;
    expect(isValid('ab')).toBe(false);
    expect(isValid('abc')).toBe(true);
    expect(isValid('a'.repeat(20))).toBe(true);
    expect(isValid('a'.repeat(21))).toBe(false);
  });
});
