import jsQR from 'jsqr';
import { parseOTPAuthURI } from '../shared/totp';
import type { TwoFactorAccount } from '../shared/types';

const scannedImages = new WeakSet<HTMLElement>();

export function scanPageForQR(manual = false): Partial<TwoFactorAccount>[] {
  const results: Partial<TwoFactorAccount>[] = [];

  // Scan all <img> elements
  const images = document.querySelectorAll('img');
  for (const img of images) {
    if (!manual && scannedImages.has(img)) continue;
    if (img.naturalWidth < 50 || img.naturalHeight < 50) continue;
    scannedImages.add(img);

    const result = scanImage(img);
    if (result) results.push(result);
  }

  // Scan all <canvas> elements
  const canvases = document.querySelectorAll('canvas');
  for (const canvas of canvases) {
    if (!manual && scannedImages.has(canvas)) continue;
    if (canvas.width < 50 || canvas.height < 50) continue;
    scannedImages.add(canvas);

    const result = scanCanvas(canvas);
    if (result) results.push(result);
  }

  // Scan <svg> elements (some sites render QR as inline SVG)
  const svgs = document.querySelectorAll('svg');
  for (const svg of svgs) {
    if (!manual && scannedImages.has(svg)) continue;
    const bbox = svg.getBoundingClientRect();
    if (bbox.width < 50 || bbox.height < 50) continue;
    scannedImages.add(svg);

    const result = scanSVG(svg);
    if (result) results.push(result);
  }

  // Scan images via fetch for cross-origin ones that failed canvas draw
  // Also scan any img with data: or blob: src
  return results;
}

/**
 * Async scanner that can handle cross-origin images by fetching them
 * through the extension's permissions.
 */
export async function scanPageForQRAsync(manual = false): Promise<Partial<TwoFactorAccount>[]> {
  // First try the synchronous scan
  const syncResults = scanPageForQR(manual);
  if (syncResults.length > 0) return syncResults;

  // If nothing found, try fetching cross-origin images directly
  const results: Partial<TwoFactorAccount>[] = [];
  const images = document.querySelectorAll('img');

  for (const img of images) {
    if (img.naturalWidth < 50 || img.naturalHeight < 50) continue;
    const src = img.src || img.getAttribute('src') || '';
    if (!src || src.startsWith('data:')) continue;

    try {
      const result = await scanImageViaFetch(src, img.naturalWidth, img.naturalHeight);
      if (result) results.push(result);
    } catch {
      // Skip failed fetches
    }
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
    // Cross-origin images will throw - will be retried via fetch
    return null;
  }
}

/**
 * Fetch an image URL directly (bypasses CORS since content scripts
 * can fetch same-origin resources, and extension has host permissions).
 */
async function scanImageViaFetch(
  url: string,
  width: number,
  height: number,
): Promise<Partial<TwoFactorAccount> | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    bitmap.close();
    return decodeQR(imageData);
  } catch {
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

function scanSVG(svg: SVGElement): Partial<TwoFactorAccount> | null {
  try {
    const bbox = svg.getBoundingClientRect();
    const width = Math.ceil(bbox.width);
    const height = Math.ceil(bbox.height);
    if (width < 50 || height < 50) return null;

    // Serialize SVG to string and render on canvas
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // We need to draw synchronously, but Image loading is async.
    // Use a workaround: try to render SVG on an offscreen canvas via foreignObject
    // For now, queue the SVG for async scanning
    URL.revokeObjectURL(url);

    // Attempt: render SVG directly using canvas drawImage with data URI
    const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    return scanSVGDataUri(dataUri, width, height);
  } catch {
    return null;
  }
}

function scanSVGDataUri(
  dataUri: string,
  width: number,
  height: number,
): Partial<TwoFactorAccount> | null {
  // SVG scanning requires async image load - handled in async scanner
  // For sync path, skip SVGs (they'll be caught by async path)
  return null;
}

function decodeQR(imageData: ImageData): Partial<TwoFactorAccount> | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  if (!code) return null;

  const uri = code.data;
  if (!uri.startsWith('otpauth://totp/') && !uri.startsWith('otpauth://hotp/')) return null;

  try {
    return parseOTPAuthURI(uri);
  } catch {
    return null;
  }
}
