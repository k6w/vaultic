import jsQR from 'jsqr';
import { parseOTPAuthURI } from '../shared/totp';
import type { TwoFactorAccount } from '../shared/types';

const scannedImages = new WeakSet<HTMLElement>();

export function scanPageForQR(): Partial<TwoFactorAccount>[] {
  const results: Partial<TwoFactorAccount>[] = [];

  // Scan all <img> elements
  const images = document.querySelectorAll('img');
  for (const img of images) {
    if (scannedImages.has(img)) continue;
    if (img.naturalWidth < 50 || img.naturalHeight < 50) continue;
    scannedImages.add(img);

    const result = scanImage(img);
    if (result) results.push(result);
  }

  // Scan all <canvas> elements
  const canvases = document.querySelectorAll('canvas');
  for (const canvas of canvases) {
    if (scannedImages.has(canvas)) continue;
    if (canvas.width < 50 || canvas.height < 50) continue;
    scannedImages.add(canvas);

    const result = scanCanvas(canvas);
    if (result) results.push(result);
  }

  return results;
}

function scanImage(img: HTMLImageElement): Partial<TwoFactorAccount> | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return decodeQR(imageData);
  } catch {
    // Cross-origin images will throw - silently skip
    return null;
  }
}

function scanCanvas(canvas: HTMLCanvasElement): Partial<TwoFactorAccount> | null {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return decodeQR(imageData);
  } catch {
    return null;
  }
}

function decodeQR(imageData: ImageData): Partial<TwoFactorAccount> | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  if (!code) return null;

  const uri = code.data;
  if (!uri.startsWith('otpauth://totp/')) return null;

  return parseOTPAuthURI(uri);
}
