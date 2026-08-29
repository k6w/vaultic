import { encrypt, decrypt } from '@shared/crypto';
import {
  readEncryptedVault,
  writeEncryptedVault,
} from '@shared/storage';
import {
  DEFAULT_VAULT,
  MAX_LOGIN_ATTEMPTS,
  LOGIN_COOLDOWN_MS,
  migrateVault,
} from '@shared/constants';
import type { VaultData } from '@shared/types';
import browser from 'webextension-polyfill';

// Module-level state
let currentPassword: string | null = null;
let vaultData: VaultData | null = null;
let failedAttempts = 0;
let cooldownUntil = 0;
let saveQueue: Promise<void> = Promise.resolve();
const ATTEMPT_KEY = 'vaultic_unlock_attempts';

async function restoreAttemptState(): Promise<void> {
  try {
    const stored = await browser.storage.session.get(ATTEMPT_KEY);
    const state = stored[ATTEMPT_KEY] as { failedAttempts?: number; cooldownUntil?: number } | undefined;
    failedAttempts = state?.failedAttempts ?? failedAttempts;
    cooldownUntil = state?.cooldownUntil ?? cooldownUntil;
  } catch {
    // Session storage is unavailable on some older Firefox versions.
  }
}

async function persistAttemptState(): Promise<void> {
  try {
    await browser.storage.session.set({ [ATTEMPT_KEY]: { failedAttempts, cooldownUntil } });
  } catch {
    // Module memory still protects the active service-worker lifetime.
  }
}

export async function unlock(
  password: string,
): Promise<{ success: boolean; error?: string; vault?: VaultData }> {
  await restoreAttemptState();
  // Check cooldown
  const now = Date.now();
  if (cooldownUntil > now) {
    const remainingSeconds = Math.ceil((cooldownUntil - now) / 1000);
    return {
      success: false,
      error: `Too many attempts. Try again in ${remainingSeconds} seconds.`,
    };
  }

  const encryptedVault = await readEncryptedVault();
  if (!encryptedVault) {
    return { success: false, error: 'No vault found. Please initialize first.' };
  }

  try {
    const decrypted = await decrypt(encryptedVault, password);
    const data = migrateVault(JSON.parse(decrypted) as VaultData);

    // Success: cache password and data
    currentPassword = password;
    vaultData = data;
    failedAttempts = 0;
    cooldownUntil = 0;
    await persistAttemptState();

    resetAutoLockAlarm();

    return { success: true, vault: data };
  } catch {
    // Decryption failed
    failedAttempts++;
    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      cooldownUntil = Date.now() + LOGIN_COOLDOWN_MS;
    }
    await persistAttemptState();
    return { success: false, error: 'Wrong password' };
  }
}

export function lock(): void {
  currentPassword = null;
  vaultData = null;
  chrome.alarms.clear('autoLock');
  chrome.action.setBadgeText({ text: '' });
}

export function isLocked(): boolean {
  return currentPassword === null;
}

export function getVault(): VaultData | null {
  return vaultData;
}

export async function saveVault(data: VaultData): Promise<void> {
  if (!currentPassword) {
    throw new Error('Vault is locked');
  }
  const password = currentPassword;
  saveQueue = saveQueue.then(async () => {
    vaultData = data;
    const encrypted = await encrypt(JSON.stringify(data), password);
    await writeEncryptedVault(encrypted);
  });
  await saveQueue;
}

export async function initVault(password: string): Promise<void> {
  const vault = { ...DEFAULT_VAULT };
  const encrypted = await encrypt(JSON.stringify(vault), password);
  await writeEncryptedVault(encrypted);

  // Immediately unlock after init
  currentPassword = password;
  vaultData = vault;
  failedAttempts = 0;
  cooldownUntil = 0;
  await persistAttemptState();
  resetAutoLockAlarm();
}

export function resetAutoLockAlarm(): void {
  const minutes = vaultData?.settings?.autoLockMinutes ?? 0;
  if (minutes > 0) {
    chrome.alarms.create('autoLock', { delayInMinutes: minutes });
  } else {
    chrome.alarms.clear('autoLock');
  }
}

export function handleAutoLock(): void {
  lock();
}

export function getCurrentPassword(): string | null {
  return currentPassword;
}

export function setCurrentPassword(password: string): void {
  currentPassword = password;
}
