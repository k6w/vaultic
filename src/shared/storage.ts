import browser from 'webextension-polyfill';
import { STORAGE_KEY_VAULT } from './constants';
import type { EncryptedVault } from './types';

export async function readEncryptedVault(): Promise<EncryptedVault | null> {
  const result = await browser.storage.local.get(STORAGE_KEY_VAULT);
  const vault = result[STORAGE_KEY_VAULT];
  if (!vault) return null;
  return vault as EncryptedVault;
}

export async function writeEncryptedVault(
  vault: EncryptedVault,
): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY_VAULT]: vault });
}

export async function clearVault(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY_VAULT);
}

export async function isVaultInitialized(): Promise<boolean> {
  return (await readEncryptedVault()) !== null;
}
