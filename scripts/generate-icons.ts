/**
 * Generates proper PNG extension icons with an emerald green shield design.
 * Creates icons at 16, 32, 48, and 128 pixel sizes.
 *
 * The shield shape is drawn programmatically using pixel-level rendering
 * with a gradient from #10b981 to #059669 (emerald green).
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { deflateSync } from 'zlib';

const ICONS_DIR = resolve(__dirname, '..', 'public', 'icons');
mkdirSync(ICONS_DIR, { recursive: true });

// Colors
const EMERALD_TOP = { r: 16, g: 185, b: 129 };   // #10b981
const EMERALD_BOT = { r: 5, g: 150, b: 105 };    // #059669
const WHITE = { r: 255, g: 255, b: 255 };
const DARK = { r: 17, g: 24, b: 39 };             // #111827

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpColor(c1: typeof EMERALD_TOP, c2: typeof EMERALD_TOP, t: number) {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
  };
}

/**
 * Check if a point (px, py) is inside the shield shape.
 * Shield is defined as: top point at (0.5, 0.06), bottom at (0.5, 0.78),
 * left at (0.125, 0.25), right at (0.875, 0.25).
 * The shape tapers from top center down to left/right shoulders,
 * then curves inward at bottom.
 */
function isInsideShield(nx: number, ny: number): boolean {
  // Shield defined in normalized 0..1 coordinates
  const cx = 0.5;
  const topY = 0.06;
  const shoulderY = 0.25;
  const bottomY = 0.78;
  const shoulderHalfWidth = 0.375;

  if (ny < topY || ny > bottomY) return false;

  let halfWidth: number;
  if (ny <= shoulderY) {
    // From top point to shoulders: linear expansion
    const t = (ny - topY) / (shoulderY - topY);
    halfWidth = t * shoulderHalfWidth;
  } else {
    // From shoulders to bottom: tapering with a slight curve
    const t = (ny - shoulderY) / (bottomY - shoulderY);
    // Use a curve that narrows faster near bottom
    halfWidth = shoulderHalfWidth * (1 - t * t);
  }

  return Math.abs(nx - cx) <= halfWidth;
}

/**
 * Check if a point is inside the inner shield (slightly smaller, for the dark overlay)
 */
function isInsideInnerShield(nx: number, ny: number): boolean {
  const cx = 0.5;
  const topY = 0.125;
  const shoulderY = 0.28;
  const bottomY = 0.72;
  const shoulderHalfWidth = 0.32;

  if (ny < topY || ny > bottomY) return false;

  let halfWidth: number;
  if (ny <= shoulderY) {
    const t = (ny - topY) / (shoulderY - topY);
    halfWidth = t * shoulderHalfWidth;
  } else {
    const t = (ny - shoulderY) / (bottomY - shoulderY);
    halfWidth = shoulderHalfWidth * (1 - t * t);
  }

  return Math.abs(nx - cx) <= halfWidth;
}

/**
 * Check if a point is inside the lock shackle (U-shaped arc)
 */
function isInsideLockShackle(nx: number, ny: number, lineWidth: number): boolean {
  const cx = 0.5;
  const arcCenterY = 0.36;
  const arcRadius = 0.09;
  const shackleBottom = 0.45;

  // Left and right vertical bars
  const leftX = cx - arcRadius;
  const rightX = cx + arcRadius;
  const hw = lineWidth / 2;

  // Vertical parts (from arc bottom to lock body top)
  if (ny >= arcCenterY && ny <= shackleBottom) {
    if (Math.abs(nx - leftX) <= hw || Math.abs(nx - rightX) <= hw) {
      return true;
    }
  }

  // Arc part (semicircle at top)
  if (ny <= arcCenterY) {
    const dist = Math.sqrt((nx - cx) ** 2 + (ny - arcCenterY) ** 2);
    if (Math.abs(dist - arcRadius) <= hw && ny <= arcCenterY) {
      return true;
    }
  }

  return false;
}

/**
 * Check if inside lock body (rectangle)
 */
function isInsideLockBody(nx: number, ny: number): boolean {
  return nx >= 0.39 && nx <= 0.61 && ny >= 0.45 && ny <= 0.62;
}

/**
 * Check if inside keyhole (circle + small rect)
 */
function isInsideKeyhole(nx: number, ny: number): boolean {
  const cx = 0.5;
  const cy = 0.51;
  const r = 0.028;

  // Circle
  if ((nx - cx) ** 2 + (ny - cy) ** 2 <= r * r) return true;

  // Small rectangle below circle
  if (nx >= 0.488 && nx <= 0.512 && ny >= cy && ny <= cy + 0.045) return true;

  return false;
}

function renderIcon(size: number): Buffer {
  // RGBA pixel buffer
  const pixels = new Uint8Array(size * size * 4);

  // Anti-aliasing: supersample 2x
  const ss = 2;
  const ssSize = size * ss;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rAcc = 0, gAcc = 0, bAcc = 0, aAcc = 0;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const nx = (x * ss + sx + 0.5) / ssSize;
          const ny = (y * ss + sy + 0.5) / ssSize;

          let r = 0, g = 0, b = 0, a = 0;

          if (isInsideShield(nx, ny)) {
            // Gradient background
            const gradT = ny;
            const gc = lerpColor(EMERALD_TOP, EMERALD_BOT, gradT);
            r = gc.r; g = gc.g; b = gc.b; a = 255;

            // Dark inner overlay
            if (isInsideInnerShield(nx, ny)) {
              r = lerp(r, DARK.r, 0.3);
              g = lerp(g, DARK.g, 0.3);
              b = lerp(b, DARK.b, 0.3);
            }

            // Lock elements (white)
            const lineW = size >= 48 ? 0.035 : 0.045;

            if (isInsideLockBody(nx, ny)) {
              r = WHITE.r; g = WHITE.g; b = WHITE.b;

              // Keyhole (dark on white)
              if (isInsideKeyhole(nx, ny)) {
                r = EMERALD_BOT.r; g = EMERALD_BOT.g; b = EMERALD_BOT.b;
              }
            } else if (isInsideLockShackle(nx, ny, lineW)) {
              r = WHITE.r; g = WHITE.g; b = WHITE.b;
            }
          }

          rAcc += r; gAcc += g; bAcc += b; aAcc += a;
        }
      }

      const samples = ss * ss;
      const idx = (y * size + x) * 4;
      pixels[idx + 0] = Math.round(rAcc / samples);
      pixels[idx + 1] = Math.round(gAcc / samples);
      pixels[idx + 2] = Math.round(bAcc / samples);
      pixels[idx + 3] = Math.round(aAcc / samples);
    }
  }

  return encodePNG(size, size, pixels);
}

function encodePNG(width: number, height: number, pixels: Uint8Array): Buffer {
  // Build raw scanline data (filter byte + RGBA for each row)
  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter: None
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rawData.push(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]);
    }
  }

  const deflated = deflateSync(Buffer.from(rawData));

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);   // color type: RGBA
  ihdr.writeUInt8(0, 10);  // compression
  ihdr.writeUInt8(0, 11);  // filter
  ihdr.writeUInt8(0, 12);  // interlace

  function crc32(buf: Buffer): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const typeBuffer = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate all icon sizes
const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const png = renderIcon(size);
  const filePath = join(ICONS_DIR, `icon-${size}.png`);
  writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${size}x${size}, ${png.length} bytes)`);
}

console.log('\nIcon generation complete.');
