import QRCode from 'qrcode';
import type { TwoFactorAccount } from './types';

/** Build a standard otpauth:// URI for a single account. */
export function buildOtpauthUri(a: TwoFactorAccount): string {
  const labelPart = a.label
    ? `${encodeURIComponent(a.issuer)}:${encodeURIComponent(a.label)}`
    : encodeURIComponent(a.issuer);
  const params = new URLSearchParams({
    secret: a.secret,
    issuer: a.issuer,
    algorithm: a.algorithm,
    digits: String(a.digits),
    period: String(a.period),
  });
  return `otpauth://totp/${labelPart}?${params.toString()}`;
}

/** Render text to a PNG data URL QR code, themed for the current mode. */
export async function toQrDataUrl(text: string, size = 240): Promise<string> {
  const styles = getComputedStyle(document.documentElement);
  const dark = styles.getPropertyValue('--text').trim() || '#0f141c';
  const light = styles.getPropertyValue('--surface-1').trim() || '#ffffff';
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: size,
    color: { dark, light },
  });
}
