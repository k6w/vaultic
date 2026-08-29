import { describe, expect, it } from 'vitest';
import { createEncryptedBackup, readEncryptedBackup } from './backup';
import { DEFAULT_SETTINGS, migrateVault } from './constants';

describe('vault migrations and backups', () => {
  it('migrates legacy vaults without losing arrays and adds safe defaults', () => {
    const migrated = migrateVault({ accounts: [], mailAccounts: [], folders: [], settings: {} as never });
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.settings).toMatchObject(DEFAULT_SETTINGS);
  });

  it('round-trips a versioned encrypted full backup', async () => {
    const payload = { accounts: [], folders: [], mailAccounts: [], settings: DEFAULT_SETTINGS };
    const encrypted = await createEncryptedBackup(payload, 'correct horse battery staple', 123);
    expect(JSON.parse(encrypted)).toMatchObject({ app: 'vaultic', kind: 'encrypted-backup', version: 2, createdAt: 123 });
    await expect(readEncryptedBackup(encrypted, 'correct horse battery staple')).resolves.toEqual(payload);
    await expect(readEncryptedBackup(encrypted, 'wrong password')).rejects.toBeTruthy();
  });
});
