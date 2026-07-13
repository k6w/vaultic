import { encrypt, decrypt } from './crypto';
import type { TwoFactorAccount, Folder, MailAccount, EncryptedVault } from './types';

export interface BackupPayload {
  accounts: TwoFactorAccount[];
  folders: Folder[];
  mailAccounts?: MailAccount[];
}

interface EncryptedBackupFile {
  app: 'vaultic';
  kind: 'encrypted-backup';
  version: 1;
  createdAt: number;
  vault: EncryptedVault;
}

/** Produce an encrypted, password-protected backup as a JSON string. */
export async function createEncryptedBackup(
  payload: BackupPayload,
  password: string,
  now: number
): Promise<string> {
  const vault = await encrypt(JSON.stringify(payload), password);
  const file: EncryptedBackupFile = {
    app: 'vaultic',
    kind: 'encrypted-backup',
    version: 1,
    createdAt: now,
    vault,
  };
  return JSON.stringify(file, null, 2);
}

export function isEncryptedBackup(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    return parsed?.kind === 'encrypted-backup' && !!parsed?.vault?.ciphertext;
  } catch {
    return false;
  }
}

/** Decrypt an encrypted backup file. Throws on wrong password or bad format. */
export async function readEncryptedBackup(
  text: string,
  password: string
): Promise<BackupPayload> {
  const file = JSON.parse(text) as EncryptedBackupFile;
  if (file?.kind !== 'encrypted-backup' || !file.vault) {
    throw new Error('Not a Vaultic encrypted backup');
  }
  const json = await decrypt(file.vault, password);
  const payload = JSON.parse(json) as BackupPayload;
  return {
    accounts: payload.accounts ?? [],
    folders: payload.folders ?? [],
    mailAccounts: payload.mailAccounts,
  };
}
