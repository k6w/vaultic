import * as OTPAuth from 'otpauth';
import type { TwoFactorAccount } from './types';

/**
 * Google Authenticator export/import (`otpauth-migration://offline?data=…`).
 * The payload is a base64 protobuf (MigrationPayload). We implement a minimal
 * protobuf reader/writer for just the fields we need.
 */

// ---- base64 <-> bytes ----------------------------------------------------
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// ---- protobuf reader -----------------------------------------------------
class Reader {
  pos = 0;
  constructor(readonly buf: Uint8Array) {}
  get end() {
    return this.pos >= this.buf.length;
  }
  varint(): number {
    let result = 0;
    let mul = 1;
    let b: number;
    do {
      b = this.buf[this.pos++];
      result += (b & 0x7f) * mul;
      mul *= 128;
    } while (b & 0x80);
    return result;
  }
  bytes(): Uint8Array {
    const len = this.varint();
    const out = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return out;
  }
  skip(wire: number): void {
    if (wire === 0) this.varint();
    else if (wire === 2) this.pos += this.varint();
    else if (wire === 5) this.pos += 4;
    else if (wire === 1) this.pos += 8;
  }
}

const ALGO_TO_NAME: Record<number, TwoFactorAccount['algorithm']> = {
  1: 'SHA1',
  2: 'SHA256',
  3: 'SHA512',
};
const NAME_TO_ALGO: Record<TwoFactorAccount['algorithm'], number> = {
  SHA1: 1,
  SHA256: 2,
  SHA512: 3,
};

function parseOtpParams(buf: Uint8Array): Partial<TwoFactorAccount> | null {
  const r = new Reader(buf);
  let secretBytes: Uint8Array | null = null;
  let name = '';
  let issuer = '';
  let algorithm: TwoFactorAccount['algorithm'] = 'SHA1';
  let digits: TwoFactorAccount['digits'] = 6;
  let type = 2; // default TOTP

  while (!r.end) {
    const tag = r.varint();
    const field = tag >>> 3;
    const wire = tag & 7;
    switch (field) {
      case 1:
        secretBytes = r.bytes().slice();
        break;
      case 2:
        name = new TextDecoder().decode(r.bytes());
        break;
      case 3:
        issuer = new TextDecoder().decode(r.bytes());
        break;
      case 4:
        algorithm = ALGO_TO_NAME[r.varint()] ?? 'SHA1';
        break;
      case 5:
        digits = r.varint() === 2 ? 8 : 6;
        break;
      case 6:
        type = r.varint();
        break;
      default:
        r.skip(wire);
    }
  }

  if (!secretBytes || type !== 2) return null; // only TOTP supported

  const secret = new OTPAuth.Secret({ buffer: secretBytes.buffer as ArrayBuffer }).base32;
  // name is often "issuer:label" or just "label"
  let label = name;
  if (!issuer && name.includes(':')) {
    const [iss, ...rest] = name.split(':');
    issuer = iss.trim();
    label = rest.join(':').trim();
  }
  return { issuer: issuer || name, label, secret, algorithm, digits, period: 30 };
}

/** Parse a migration URI into TOTP account fragments (HOTP entries skipped). */
export function parseMigrationUri(uri: string): Partial<TwoFactorAccount>[] {
  const match = uri.match(/[?&]data=([^&]+)/);
  if (!match) throw new Error('No migration data found in URI');
  const data = decodeURIComponent(match[1]);
  const bytes = base64ToBytes(data);
  const r = new Reader(bytes);
  const results: Partial<TwoFactorAccount>[] = [];
  while (!r.end) {
    const tag = r.varint();
    const field = tag >>> 3;
    const wire = tag & 7;
    if (field === 1 && wire === 2) {
      const parsed = parseOtpParams(r.bytes());
      if (parsed) results.push(parsed);
    } else {
      r.skip(wire);
    }
  }
  if (results.length === 0) throw new Error('No TOTP accounts found in migration data');
  return results;
}

// ---- writer --------------------------------------------------------------
function writeVarint(arr: number[], value: number): void {
  while (value > 0x7f) {
    arr.push((value & 0x7f) | 0x80);
    value = Math.floor(value / 128);
  }
  arr.push(value & 0x7f);
}
function writeLenField(arr: number[], field: number, bytes: Uint8Array | number[]): void {
  writeVarint(arr, (field << 3) | 2);
  writeVarint(arr, bytes.length);
  for (const b of bytes) arr.push(b);
}
function writeVarintField(arr: number[], field: number, value: number): void {
  writeVarint(arr, (field << 3) | 0);
  writeVarint(arr, value);
}

function encodeOtpParams(a: TwoFactorAccount): number[] {
  const buf: number[] = [];
  const secretBytes = OTPAuth.Secret.fromBase32(a.secret).bytes;
  writeLenField(buf, 1, secretBytes);
  writeLenField(buf, 2, [...new TextEncoder().encode(a.label || a.issuer)]);
  writeLenField(buf, 3, [...new TextEncoder().encode(a.issuer)]);
  writeVarintField(buf, 4, NAME_TO_ALGO[a.algorithm] ?? 1);
  writeVarintField(buf, 5, a.digits === 8 ? 2 : 1);
  writeVarintField(buf, 6, 2); // TOTP
  return buf;
}

/**
 * Build a single migration URI containing the given accounts. For very large
 * sets Google Authenticator splits into multiple QRs; here we emit one batch,
 * which imports fine for typical libraries.
 */
export function buildMigrationUri(accounts: TwoFactorAccount[], batchId: number): string {
  const buf: number[] = [];
  for (const a of accounts) writeLenField(buf, 1, encodeOtpParams(a));
  writeVarintField(buf, 2, 1); // version
  writeVarintField(buf, 3, 1); // batch_size
  writeVarintField(buf, 4, 0); // batch_index
  writeVarintField(buf, 5, batchId); // batch_id
  const b64 = bytesToBase64(new Uint8Array(buf));
  return `otpauth-migration://offline?data=${encodeURIComponent(b64)}`;
}
