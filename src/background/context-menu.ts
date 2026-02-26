import browser from 'webextension-polyfill';

export function setupContextMenu(): void {
  chrome.contextMenus.create({
    id: 'scanQR',
    title: 'Scan page for 2FA QR codes',
    contexts: ['page'],
  });
}

export function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): void {
  if (info.menuItemId === 'scanQR' && tab?.id) {
    browser.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE_QR' });
  }
}
