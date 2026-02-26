import { isLocked, getVault } from './lock-manager';
import { generateTOTP } from '@shared/totp';

export function setupTotpAlarm(): void {
  chrome.alarms.create('totpRefresh', { periodInMinutes: 0.5 });
}

export function handleTotpAlarm(): void {
  if (isLocked()) return;

  const vault = getVault();
  if (!vault || vault.accounts.length === 0) return;

  const firstAccount = vault.accounts[0];
  const code = generateTOTP(firstAccount);

  chrome.action.setBadgeText({ text: code });
  chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
}
