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
  theme: 'dark',
};

export const DEFAULT_VAULT: VaultData = {
  accounts: [],
  mailAccounts: [],
  settings: DEFAULT_SETTINGS,
};
