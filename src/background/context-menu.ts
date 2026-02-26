import browser from 'webextension-polyfill';

export function setupContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'scanQR',
      title: 'Scan page for 2FA QR codes',
      contexts: ['page'],
    });
    chrome.contextMenus.create({
      id: 'scanImageQR',
      title: 'Scan image as 2FA QR code',
      contexts: ['image'],
    });
  });
}

/**
 * Ensure the content script is injected in the tab, then send a message.
 * Handles the case where the tab was opened before the extension was installed
 * or the content script failed to load.
 */
async function ensureContentScriptAndSend(tabId: number, message: Record<string, unknown>): Promise<void> {
  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch {
    // Content script not loaded — inject it first, then retry
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/index.js'],
      });
      // Small delay for the script to initialize
      await new Promise(r => setTimeout(r, 100));
      await browser.tabs.sendMessage(tabId, message);
    } catch {
      // Tab may be a chrome:// or other restricted page — silently fail
    }
  }
}

export function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): void {
  if (!tab?.id) return;

  if (info.menuItemId === 'scanQR') {
    ensureContentScriptAndSend(tab.id, { type: 'SCAN_PAGE_QR' });
  } else if (info.menuItemId === 'scanImageQR' && info.srcUrl) {
    ensureContentScriptAndSend(tab.id, { type: 'SCAN_IMAGE_QR', srcUrl: info.srcUrl });
  }
}
