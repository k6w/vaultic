import { PBKDF2_ITERATIONS } from './constants';
import type { EncryptedVault } from './types';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(
  data: string,
  password: string,
): Promise<EncryptedVault> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data),
  );

  return {
    version: 2,
    kdf: { name: 'PBKDF2-SHA256', iterations: PBKDF2_ITERATIONS },
    ciphertext: arrayBufferToBase64(ciphertext),
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

export async function decrypt(
  vault: EncryptedVault,
  password: string,
): Promise<string> {
  const salt = new Uint8Array(base64ToArrayBuffer(vault.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(vault.iv));
  const ciphertext = base64ToArrayBuffer(vault.ciphertext);

  const key = await deriveKey(password, salt, vault.kdf?.iterations ?? PBKDF2_ITERATIONS);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}
