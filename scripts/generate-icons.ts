/**
 * Generates minimal valid PNG placeholder icons.
 * Creates 1x1 pixel solid-color PNGs for each required size.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { deflateSync } from 'zlib';

const ICONS_DIR = resolve(__dirname, '..', 'public', 'icons');
mkdirSync(ICONS_DIR, { recursive: true });

function createPNG(width: number, height: number): Buffer {
  // Build raw image data (RGBA) with a simple blue-ish color
  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte: None
    for (let x = 0; x < width; x++) {
      rawData.push(66, 133, 244, 255); // R, G, B, A (Google blue)
    }
  }

  const deflated = deflateSync(Buffer.from(rawData));

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // bit depth
  ihdr.writeUInt8(6, 9);  // color type: RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // CRC32 helper
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

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const png = createPNG(size, size);
  const filePath = join(ICONS_DIR, `icon-${size}.png`);
  writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${png.length} bytes)`);
}

console.log('Done generating placeholder icons.');
