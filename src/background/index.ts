import browser from 'webextension-polyfill';
import { handleMessage } from './message-handler';
import { setupContextMenu, handleContextMenuClick } from './context-menu';
import { handleAutoLock } from './lock-manager';
import type { BackgroundMessage } from '@shared/types';
import { syncPageIntegration, watchPageIntegrationPermissions } from './page-integration';

/**
 * Initialization function shared between onInstalled and onStartup.
 * Re-registers context menus and alarms which may be lost on SW restart.
 */
function initialize() {
  setupContextMenu();
  chrome.alarms.clear('totpRefresh');
  chrome.action.setBadgeText({ text: '' });
  void syncPageIntegration();
}

// Extension installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  initialize();
  console.log(`Vaultic extension ${details.reason} (v${chrome.runtime.getManifest().version})`);
});

// Browser startup - re-register context menus and alarms
// This handles the case where Chrome restarts and the service worker needs to re-initialize
chrome.runtime.onStartup.addListener(() => {
  initialize();
  console.log('Vaultic: browser startup, re-initialized context menu and alarms');
});

// Message handling
browser.runtime.onMessage.addListener(
  (message: unknown, sender: browser.Runtime.MessageSender) => {
    return handleMessage(message, sender);
  },
);

// Alarm handling
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoLock') {
    handleAutoLock();
  }
});

// Context menu handling
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
watchPageIntegrationPermissions();

console.log('Vaultic background service worker loaded');
