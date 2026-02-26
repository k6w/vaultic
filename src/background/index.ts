import browser from 'webextension-polyfill';
import { handleMessage } from './message-handler';
import { setupContextMenu, handleContextMenuClick } from './context-menu';
import { setupTotpAlarm, handleTotpAlarm } from './totp-alarm';
import { handleAutoLock } from './lock-manager';
import type { BackgroundMessage } from '@shared/types';

// Extension installed
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
  setupTotpAlarm();
  console.log('2FA Manager extension installed');
});

// Message handling
browser.runtime.onMessage.addListener(
  (message: unknown, sender: browser.Runtime.MessageSender) => {
    return handleMessage(message as BackgroundMessage, sender);
  },
);

// Alarm handling
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoLock') {
    handleAutoLock();
  } else if (alarm.name === 'totpRefresh') {
    handleTotpAlarm();
  }
});

// Context menu handling
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

console.log('2FA Manager background service worker loaded');
