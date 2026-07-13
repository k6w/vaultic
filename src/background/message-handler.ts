import browser from 'webextension-polyfill';
import {
  unlock,
  lock,
  isLocked,
  getVault,
  saveVault,
  initVault,
  getCurrentPassword,
  setCurrentPassword,
  resetAutoLockAlarm,
} from './lock-manager';
import { isVaultInitialized, clearVault } from '@shared/storage';
import { encrypt, decrypt } from '@shared/crypto';
import { readEncryptedVault, writeEncryptedVault } from '@shared/storage';
import { generateTOTP } from '@shared/totp';
import { MailTmClient } from '@shared/mail-api';
import type { BackgroundMessage, MailAccount, VaultData } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Ensures a mail account has a valid token. If not, refreshes it.
 * Returns the token and updates the vault if needed.
 */
async function ensureMailToken(mailAccount: MailAccount): Promise<string> {
  if (mailAccount.token) {
    return mailAccount.token;
  }

  // Refresh the token
  const token = await MailTmClient.getToken(mailAccount.address, mailAccount.password);

  // Update the token in vault
  const vault = getVault();
  if (vault) {
    const idx = vault.mailAccounts.findIndex((a) => a.id === mailAccount.id);
    if (idx !== -1) {
      vault.mailAccounts[idx] = { ...vault.mailAccounts[idx], token };
      await saveVault(vault);
    }
  }

  return token;
}

export async function handleMessage(
  message: BackgroundMessage,
  _sender: unknown,
): Promise<unknown> {
  switch (message.type) {
    case 'GET_LOCK_STATUS': {
      return { locked: isLocked() };
    }

    case 'IS_VAULT_INITIALIZED': {
      const initialized = await isVaultInitialized();
      return { initialized };
    }

    case 'UNLOCK': {
      const result = await unlock(message.password);
      return result;
    }

    case 'LOCK': {
      lock();
      return { success: true };
    }

    case 'INIT_VAULT': {
      await initVault(message.password);
      return { success: true };
    }

    case 'GET_VAULT': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      return { vault: getVault() };
    }

    case 'SAVE_VAULT': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      await saveVault(message.data);
      return { success: true };
    }

    case 'ADD_ACCOUNT': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const updatedVault: VaultData = {
        ...vault,
        accounts: [...vault.accounts, message.account],
      };
      await saveVault(updatedVault);
      return { success: true };
    }

    case 'UPDATE_ACCOUNT': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const updatedAccounts = vault.accounts.map((a) =>
        a.id === message.account.id ? message.account : a,
      );
      await saveVault({ ...vault, accounts: updatedAccounts });
      return { success: true };
    }

    case 'DELETE_ACCOUNT': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const filteredAccounts = vault.accounts.filter((a) => a.id !== message.accountId);
      await saveVault({ ...vault, accounts: filteredAccounts });
      return { success: true };
    }

    case 'REORDER_ACCOUNTS': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const orderMap = new Map(message.orderedIds.map((id, i) => [id, i]));
      const reordered = vault.accounts.map((a) => ({
        ...a,
        sortOrder: orderMap.has(a.id) ? orderMap.get(a.id)! : a.sortOrder,
      }));
      await saveVault({ ...vault, accounts: reordered });
      return { success: true };
    }

    case 'BULK_UPDATE_ACCOUNTS': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const byId = new Map(message.accounts.map((a) => [a.id, a]));
      const updated = vault.accounts.map((a) => byId.get(a.id) ?? a);
      await saveVault({ ...vault, accounts: updated });
      return { success: true };
    }

    case 'BULK_DELETE_ACCOUNTS': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const remove = new Set(message.accountIds);
      await saveVault({
        ...vault,
        accounts: vault.accounts.filter((a) => !remove.has(a.id)),
      });
      return { success: true };
    }

    case 'ADD_FOLDER': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      await saveVault({ ...vault, folders: [...vault.folders, message.folder] });
      return { success: true };
    }

    case 'UPDATE_FOLDER': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const folders = vault.folders.map((f) =>
        f.id === message.folder.id ? message.folder : f,
      );
      await saveVault({ ...vault, folders });
      return { success: true };
    }

    case 'DELETE_FOLDER': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      // Remove the folder and unassign any accounts that referenced it.
      const folders = vault.folders.filter((f) => f.id !== message.folderId);
      const accounts = vault.accounts.map((a) =>
        a.folderId === message.folderId ? { ...a, folderId: undefined } : a,
      );
      await saveVault({ ...vault, folders, accounts });
      return { success: true };
    }

    case 'GENERATE_TOTP': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const account = vault.accounts.find((a) => a.id === message.accountId);
      if (!account) {
        return { error: 'Account not found' };
      }
      const code = generateTOTP(account);
      return { code };
    }

    case 'MAIL_GET_DOMAINS': {
      try {
        const domains = await MailTmClient.getDomains();
        return { domains };
      } catch (error) {
        return { error: (error as Error).message };
      }
    }

    case 'MAIL_CREATE_ACCOUNT': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      try {
        const apiAccount = await MailTmClient.createAccount(message.address, message.password);
        const token = await MailTmClient.getToken(message.address, message.password);

        const mailAccount: MailAccount = {
          id: apiAccount.id,
          address: apiAccount.address,
          password: message.password,
          token,
          createdAt: Date.now(),
        };

        const vault = getVault()!;
        await saveVault({
          ...vault,
          mailAccounts: [...vault.mailAccounts, mailAccount],
        });

        return { account: mailAccount };
      } catch (error) {
        return { error: (error as Error).message };
      }
    }

    case 'MAIL_DELETE_ACCOUNT': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      try {
        const vault = getVault()!;
        const mailAccount = vault.mailAccounts.find((a) => a.id === message.accountId);
        if (!mailAccount) {
          return { error: 'Mail account not found' };
        }

        const token = await ensureMailToken(mailAccount);
        await MailTmClient.deleteAccount(token, mailAccount.id);

        const updatedMailAccounts = vault.mailAccounts.filter((a) => a.id !== message.accountId);
        await saveVault({ ...vault, mailAccounts: updatedMailAccounts });

        return { success: true };
      } catch (error) {
        return { error: (error as Error).message };
      }
    }

    case 'MAIL_GET_MESSAGES': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      try {
        const vault = getVault()!;
        const mailAccount = vault.mailAccounts.find((a) => a.id === message.accountId);
        if (!mailAccount) {
          return { error: 'Mail account not found' };
        }

        const token = await ensureMailToken(mailAccount);
        const result = await MailTmClient.getMessages(token, message.page);

        return { messages: result.messages, total: result.total };
      } catch (error) {
        return { error: (error as Error).message };
      }
    }

    case 'MAIL_GET_MESSAGE': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      try {
        const vault = getVault()!;
        const mailAccount = vault.mailAccounts.find((a) => a.id === message.accountId);
        if (!mailAccount) {
          return { error: 'Mail account not found' };
        }

        const token = await ensureMailToken(mailAccount);
        const mailMessage = await MailTmClient.getMessage(token, message.messageId);

        return { message: mailMessage };
      } catch (error) {
        return { error: (error as Error).message };
      }
    }

    case 'MAIL_DELETE_MESSAGE': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      try {
        const vault = getVault()!;
        const mailAccount = vault.mailAccounts.find((a) => a.id === message.accountId);
        if (!mailAccount) {
          return { error: 'Mail account not found' };
        }

        const token = await ensureMailToken(mailAccount);
        await MailTmClient.deleteMessage(token, message.messageId);

        return { success: true };
      } catch (error) {
        return { error: (error as Error).message };
      }
    }

    case 'GET_SETTINGS': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      return { settings: getVault()?.settings };
    }

    case 'UPDATE_SETTINGS': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const updatedSettings = { ...vault.settings, ...message.settings };
      await saveVault({ ...vault, settings: updatedSettings });
      // If autoLockMinutes changed, reset the alarm
      if (message.settings.autoLockMinutes !== undefined) {
        resetAutoLockAlarm();
      }
      return { success: true };
    }

    case 'CHANGE_PASSWORD': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      try {
        // Verify current password by reading and decrypting vault
        const encryptedVault = await readEncryptedVault();
        if (!encryptedVault) {
          return { error: 'No vault found' };
        }

        // Decrypt with current password to verify
        await decrypt(encryptedVault, message.currentPassword);

        // Re-encrypt with new password
        const vault = getVault()!;
        const newEncrypted = await encrypt(JSON.stringify(vault), message.newPassword);
        await writeEncryptedVault(newEncrypted);

        // Update cached password
        setCurrentPassword(message.newPassword);

        return { success: true };
      } catch {
        return { error: 'Current password is incorrect' };
      }
    }

    case 'VERIFY_PASSWORD': {
      try {
        const encryptedVault = await readEncryptedVault();
        if (!encryptedVault) return { valid: false };
        await decrypt(encryptedVault, message.password);
        return { valid: true };
      } catch {
        return { valid: false };
      }
    }

    case 'CLEAR_ALL_DATA': {
      await clearVault();
      lock();
      return { success: true };
    }

    case 'EXPORT_VAULT': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      return { vault: getVault() };
    }

    case 'IMPORT_ACCOUNTS': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const mergedAccounts = [...vault.accounts, ...message.accounts];
      await saveVault({ ...vault, accounts: mergedAccounts });
      return { success: true };
    }

    case 'SCAN_PAGE_QR': {
      try {
        await browser.tabs.sendMessage(message.tabId, { type: 'SCAN_PAGE_QR' });
        return { success: true };
      } catch (error) {
        return { error: (error as Error).message };
      }
    }

    case 'QR_DETECTED': {
      if (isLocked()) {
        return { error: 'Vault is locked' };
      }
      const vault = getVault()!;
      const now = Date.now();
      const newAccount = {
        id: uuidv4(),
        issuer: message.account.issuer || '',
        label: message.account.label || '',
        secret: message.account.secret || '',
        algorithm: message.account.algorithm || 'SHA1',
        digits: message.account.digits || 6,
        period: message.account.period || 30,
        icon: message.account.icon,
        createdAt: now,
        updatedAt: now,
      } as const;

      await saveVault({
        ...vault,
        accounts: [...vault.accounts, newAccount],
      });

      return { success: true, account: newAccount };
    }

    default: {
      return { error: `Unknown message type: ${(message as { type: string }).type}` };
    }
  }
}
