export interface TwoFactorAccount {
  id: string;
  issuer: string;
  label: string;
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 8;
  period: number;
  icon?: string;
  /** Organization. */
  folderId?: string;
  tags?: string[];
  pinned?: boolean;
  /** Manual ordering weight (ascending). */
  sortOrder?: number;
  /** Freeform secure note (e.g. recovery codes). */
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  order: number;
}

export interface MailAccount {
  id: string;
  address: string;
  password: string;
  token?: string;
  label?: string;
  createdAt: number;
}

export interface MailDomain {
  id: string;
  domain: string;
  isActive: boolean;
}

export interface MailMessage {
  id: string;
  accountId: string;
  msgid: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  subject: string;
  intro: string;
  seen: boolean;
  isDeleted: boolean;
  hasAttachments: boolean;
  size: number;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface MailMessageDetail extends Omit<MailMessage, 'intro'> {
  cc: string[];
  bcc: string[];
  flagged: boolean;
  text: string;
  html: string[];
  attachments: MailAttachment[];
}

export interface MailAttachment {
  id: string;
  filename: string;
  contentType: string;
  disposition: string;
  transferEncoding: string;
  related: boolean;
  size: number;
  downloadUrl: string;
}

export interface VaultData {
  accounts: TwoFactorAccount[];
  mailAccounts: MailAccount[];
  folders: Folder[];
  settings: UserSettings;
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type ListDensity = 'comfortable' | 'compact';

export interface UserSettings {
  autoDetectQR: boolean;
  notifyNewMail: boolean;
  autoLockMinutes: number;
  theme: ThemePreference;
  /** Seconds after a copy before the clipboard is cleared. 0 disables. */
  clipboardClearSeconds: number;
  /** Whether biometric/passkey quick-unlock is enabled. */
  biometricUnlock: boolean;
  listDensity: ListDensity;
}

export interface EncryptedVault {
  ciphertext: string; // base64
  salt: string;       // base64
  iv: string;         // base64
}

// Message types for background <-> popup/sidepanel communication
export type BackgroundMessage =
  | { type: 'UNLOCK'; password: string }
  | { type: 'LOCK' }
  | { type: 'GET_VAULT' }
  | { type: 'GET_LOCK_STATUS' }
  | { type: 'IS_VAULT_INITIALIZED' }
  | { type: 'INIT_VAULT'; password: string }
  | { type: 'SAVE_VAULT'; data: VaultData }
  | { type: 'ADD_ACCOUNT'; account: TwoFactorAccount }
  | { type: 'UPDATE_ACCOUNT'; account: TwoFactorAccount }
  | { type: 'DELETE_ACCOUNT'; accountId: string }
  | { type: 'REORDER_ACCOUNTS'; orderedIds: string[] }
  | { type: 'BULK_UPDATE_ACCOUNTS'; accounts: TwoFactorAccount[] }
  | { type: 'BULK_DELETE_ACCOUNTS'; accountIds: string[] }
  | { type: 'ADD_FOLDER'; folder: Folder }
  | { type: 'UPDATE_FOLDER'; folder: Folder }
  | { type: 'DELETE_FOLDER'; folderId: string }
  | { type: 'GENERATE_TOTP'; accountId: string }
  | { type: 'MAIL_GET_DOMAINS' }
  | { type: 'MAIL_CREATE_ACCOUNT'; address: string; password: string }
  | { type: 'MAIL_DELETE_ACCOUNT'; accountId: string }
  | { type: 'MAIL_GET_MESSAGES'; accountId: string; page?: number }
  | { type: 'MAIL_GET_MESSAGE'; accountId: string; messageId: string }
  | { type: 'MAIL_DELETE_MESSAGE'; accountId: string; messageId: string }
  | { type: 'SCAN_PAGE_QR'; tabId: number }
  | { type: 'QR_DETECTED'; account: Partial<TwoFactorAccount> }
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<UserSettings> }
  | { type: 'CHANGE_PASSWORD'; currentPassword: string; newPassword: string }
  | { type: 'VERIFY_PASSWORD'; password: string }
  | { type: 'CLEAR_ALL_DATA' }
  | { type: 'EXPORT_VAULT' }
  | { type: 'IMPORT_ACCOUNTS'; accounts: TwoFactorAccount[] };

// Content script messages
export type ContentMessage =
  | { type: 'SCAN_PAGE_QR' }
  | { type: 'SCAN_IMAGE_QR'; srcUrl: string }
  | { type: 'QR_SCAN_RESULT'; accounts: Partial<TwoFactorAccount>[] }
  | { type: 'FILL_CODE'; code: string };
