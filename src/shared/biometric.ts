import browser from 'webextension-polyfill';

/**
 * Biometric / passkey quick-unlock via WebAuthn with the PRF extension.
 *
 * Enrollment wraps the master password with a key derived from a platform
 * authenticator's PRF secret; unlocking re-derives that key via biometrics and
 * unwraps the password. Password unlock always remains available as a fallback.
 *
 * Support is uneven (needs a platform authenticator + PRF). Everything is
 * feature-detected; when unsupported the UI hides the option.
 */

const STORE_KEY = 'vaultic_biometric';

interface BiometricRecord {
  credentialId: string; // base64
  prfSalt: string; // base64
  wrapped: string; // base64 (AES-GCM ciphertext of the master password)
  iv: string; // base64
}

// ---- base64 helpers ----
function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function isBiometricSupported(): Promise<boolean> {
  try {
    if (!('PublicKeyCredential' in window)) return false;
    const uvpaa = await (
      window.PublicKeyCredential as unknown as {
        isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
      }
    ).isUserVerifyingPlatformAuthenticatorAvailable?.();
    return !!uvpaa;
  } catch {
    return false;
  }
}

export async function getBiometricRecord(): Promise<BiometricRecord | null> {
  try {
    const r = await browser.storage.local.get(STORE_KEY);
    return (r[STORE_KEY] as BiometricRecord) ?? null;
  } catch {
    return null;
  }
}

export async function isBiometricEnrolled(): Promise<boolean> {
  return (await getBiometricRecord()) !== null;
}

async function aesKeyFromPrf(secret: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', secret, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

function randomUserId(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/** Create a platform credential and wrap the master password under its PRF. */
export async function enrollBiometric(masterPassword: string): Promise<void> {
  const prfSalt = crypto.getRandomValues(new Uint8Array(32));
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge as BufferSource,
      rp: { name: 'Vaultic' },
      user: {
        id: randomUserId() as BufferSource,
        name: 'vaultic-vault',
        displayName: 'Vaultic Vault',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
      },
      extensions: { prf: {} } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error('Enrollment cancelled');
  const ext = cred.getClientExtensionResults() as { prf?: { enabled?: boolean } };
  if (!ext.prf?.enabled) {
    throw new Error('This device does not support PRF-based biometric unlock');
  }

  const secret = await evaluatePrf(new Uint8Array(cred.rawId), prfSalt);
  const key = await aesKeyFromPrf(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(masterPassword)
  );

  const record: BiometricRecord = {
    credentialId: b64(cred.rawId),
    prfSalt: b64(prfSalt),
    wrapped: b64(wrapped),
    iv: b64(iv),
  };
  await browser.storage.local.set({ [STORE_KEY]: record });
}

/** Prompt biometrics and return the unwrapped master password. */
export async function unlockWithBiometric(): Promise<string> {
  const record = await getBiometricRecord();
  if (!record) throw new Error('Biometric unlock is not set up');

  const secret = await evaluatePrf(unb64(record.credentialId), unb64(record.prfSalt));
  const key = await aesKeyFromPrf(secret);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(record.iv) as BufferSource },
    key,
    unb64(record.wrapped) as BufferSource
  );
  return new TextDecoder().decode(plain);
}

export async function disableBiometric(): Promise<void> {
  await browser.storage.local.remove(STORE_KEY);
}

/** Run a WebAuthn assertion requesting the PRF output for `salt`. */
async function evaluatePrf(credentialId: Uint8Array, salt: Uint8Array): Promise<ArrayBuffer> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: 'public-key', id: credentialId.buffer as ArrayBuffer }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error('Biometric prompt cancelled');
  const results = (
    assertion.getClientExtensionResults() as {
      prf?: { results?: { first?: ArrayBuffer } };
    }
  ).prf?.results?.first;
  if (!results) throw new Error('Biometric authenticator did not return a PRF secret');
  return results;
}
