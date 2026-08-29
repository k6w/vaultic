import { getVault, isLocked, saveVault } from './lock-manager';
import { MailTmClient } from '@shared/mail-api';

export function setupMailPolling(): void {
  chrome.alarms.create('mailPoll', { periodInMinutes: 1 });
}

export async function pollMail(): Promise<void> {
  if (isLocked()) return;
  const vault = getVault();
  if (!vault?.settings.notifyNewMail || !vault.mailAccounts.length) return;

  let changed = false;
  let newMail = 0;
  const mailAccounts = [...vault.mailAccounts];

  for (let index = 0; index < mailAccounts.length; index += 1) {
    const account = mailAccounts[index];
    if (!account.token) continue;
    try {
      const { messages } = await MailTmClient.getMessages(account.token, 1);
      const latestId = messages[0]?.id;
      if (!latestId || latestId === account.lastSeenMessageId) continue;

      if (!account.lastSeenMessageId) {
        mailAccounts[index] = { ...account, lastSeenMessageId: latestId };
      } else {
        const previousIndex = messages.findIndex((message) => message.id === account.lastSeenMessageId);
        const count = previousIndex < 0 ? messages.length : previousIndex;
        newMail += count;
        mailAccounts[index] = {
          ...account,
          lastSeenMessageId: latestId,
          unreadCount: (account.unreadCount ?? 0) + count,
        };
      }
      changed = true;
    } catch {
      // A failed account must not block polling the remaining inboxes.
    }
  }

  if (changed) await saveVault({ ...vault, mailAccounts });
  const unread = mailAccounts.reduce((total, account) => total + (account.unreadCount ?? 0), 0);
  await chrome.action.setBadgeText({ text: unread ? String(Math.min(unread, 99)) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#246bfd' });
  if (newMail > 0) {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: newMail === 1 ? 'New private email' : `${newMail} new private emails`,
      message: 'Open Vaultic to view your inbox.',
    });
  }
}
