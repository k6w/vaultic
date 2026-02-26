import browser from 'webextension-polyfill';
import { scanPageForQR } from './qr-scanner';
import { showToast, showNoQRToast } from './toast';
import type { TwoFactorAccount } from '../shared/types';

// Listen for messages from background (manual scan trigger)
browser.runtime.onMessage.addListener((message: any) => {
  if (message.type === 'SCAN_PAGE_QR') {
    handleManualScan();
  }
});

// Auto-detect QR codes after page load
async function autoDetect() {
  try {
    // Check if auto-detect is enabled via background
    const response = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (!(response as any)?.settings?.autoDetectQR) return;

    // Wait for page to settle
    await new Promise(r => setTimeout(r, 2000));

    const accounts = scanPageForQR();
    for (const account of accounts) {
      const shouldSave = await showToast(account);
      if (shouldSave) {
        await saveAccount(account);
      }
    }
  } catch {
    // Extension context may be invalidated - silently fail
  }
}

async function handleManualScan() {
  const accounts = scanPageForQR();

  if (accounts.length === 0) {
    showNoQRToast();
    return;
  }

  for (const account of accounts) {
    const shouldSave = await showToast(account);
    if (shouldSave) {
      await saveAccount(account);
    }
  }
}

async function saveAccount(account: Partial<TwoFactorAccount>) {
  try {
    await browser.runtime.sendMessage({
      type: 'QR_DETECTED',
      account,
    });
  } catch {
    // Silently fail if background is not available
  }
}

// Set up MutationObserver for dynamically added images
let debounceTimer: ReturnType<typeof setTimeout>;

function observeNewImages() {
  const observer = new MutationObserver((mutations) => {
    let hasNewImages = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLImageElement ||
            (node instanceof HTMLElement && node.querySelector('img, canvas'))) {
          hasNewImages = true;
          break;
        }
      }
      if (hasNewImages) break;
    }

    if (hasNewImages) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          const response = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
          if (!(response as any)?.settings?.autoDetectQR) return;

          const accounts = scanPageForQR();
          for (const account of accounts) {
            const shouldSave = await showToast(account);
            if (shouldSave) {
              await saveAccount(account);
            }
          }
        } catch {
          // Silently fail
        }
      }, 1000);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize
autoDetect();
observeNewImages();
