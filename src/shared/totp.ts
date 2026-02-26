import * as OTPAuth from 'otpauth';
import type { TwoFactorAccount } from './types';

export function generateTOTP(account: TwoFactorAccount): string {
  const totp = new OTPAuth.TOTP({
    issuer: account.issuer,
    label: account.label,
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period,
    secret: account.secret,
  });

  return totp.generate();
}

export function parseOTPAuthURI(uri: string): Partial<TwoFactorAccount> {
  const parsed = OTPAuth.URI.parse(uri);

  if (!(parsed instanceof OTPAuth.TOTP)) {
    throw new Error('Only TOTP URIs are supported');
  }

  return {
    issuer: parsed.issuer || '',
    label: parsed.label || '',
    secret: parsed.secret.base32,
    algorithm: parsed.algorithm as TwoFactorAccount['algorithm'],
    digits: parsed.digits as TwoFactorAccount['digits'],
    period: parsed.period,
  };
}

export function buildOTPAuthURI(account: TwoFactorAccount): string {
  const totp = new OTPAuth.TOTP({
    issuer: account.issuer,
    label: account.label,
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period,
    secret: account.secret,
  });

  return totp.toString();
}

export function getRemainingSeconds(period: number = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}
