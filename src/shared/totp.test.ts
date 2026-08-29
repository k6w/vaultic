import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOTPAuthURI, generateTOTP, getRemainingSeconds, parseOTPAuthURI } from './totp';
import type { TwoFactorAccount } from './types';

const rfcAccount: TwoFactorAccount = {
  id: 'rfc', issuer: 'RFC', label: 'test', secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
  algorithm: 'SHA1', digits: 8, period: 30, createdAt: 0, updatedAt: 0,
};

afterEach(() => vi.useRealTimers());

describe('TOTP', () => {
  it('matches the RFC 6238 SHA-1 vector at 59 seconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(59_000);
    expect(generateTOTP(rfcAccount)).toBe('94287082');
    expect(getRemainingSeconds(30)).toBe(1);
  });

  it('round-trips supported account parameters', () => {
    const parsed = parseOTPAuthURI(buildOTPAuthURI({ ...rfcAccount, algorithm: 'SHA256', period: 45 }));
    expect(parsed).toMatchObject({ issuer: 'RFC', label: 'test', algorithm: 'SHA256', digits: 8, period: 45 });
  });

  it('rejects HOTP rather than treating it as TOTP', () => {
    expect(() => parseOTPAuthURI('otpauth://hotp/Test?secret=JBSWY3DPEHPK3PXP&counter=0')).toThrow('Only TOTP');
  });
});
