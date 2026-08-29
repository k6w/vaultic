import type { UserSettings, VaultData } from './types';

export const STORAGE_KEY_VAULT = '2fa_vault';
export const STORAGE_KEY_SESSION = '2fa_session';
export const MAIL_API_BASE = 'https://api.mail.tm';
export const MAIL_SSE_BASE = 'https://mercure.mail.tm/.well-known/mercure';
export const PBKDF2_ITERATIONS = 600_000;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_COOLDOWN_MS = 30_000;

export const DEFAULT_SETTINGS: UserSettings = {
  autoDetectQR: true,
  notifyNewMail: true,
  autoLockMinutes: 5,
  theme: 'system',
  clipboardClearSeconds: 20,
  biometricUnlock: false,
  listDensity: 'comfortable',
  pageIntegrationEnabled: false,
  blockRemoteMailContent: true,
};

export const DEFAULT_VAULT: VaultData = {
  schemaVersion: 2,
  accounts: [],
  mailAccounts: [],
  folders: [],
  settings: DEFAULT_SETTINGS,
};

/**
 * Normalize a vault loaded from storage so older vaults gain new fields with
 * sensible defaults (folders array, widened settings). Non-destructive.
 */
export function migrateVault(vault: Partial<VaultData>): VaultData {
  return {
    schemaVersion: 2,
    accounts: vault.accounts ?? [],
    mailAccounts: vault.mailAccounts ?? [],
    folders: vault.folders ?? [],
    settings: { ...DEFAULT_SETTINGS, ...(vault.settings ?? {}) },
  };
}
