import browser from 'webextension-polyfill';
import { scanPageForQRAsync, scanSingleImageUrl } from './qr-scanner';
import { showToast, showNoQRToast } from './toast';
import type { TwoFactorAccount } from '../shared/types';

/**
 * Extract the page's favicon URL from <link> elements,
 * falling back to /favicon.ico at the current origin.
 */
function getPageFavicon(): string {
  const iconLink = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"]',
  );
  if (iconLink?.href) {
    return iconLink.href;
  }
  return `${location.origin}/favicon.ico`;
}

/**
 * Enrich a detected account with page context:
 * - Use the page hostname as issuer if the QR URI didn't provide one
 * - Always attach the page's favicon as the account icon
 */
function enrichAccount(account: Partial<TwoFactorAccount>): Partial<TwoFactorAccount> {
  return {
    ...account,
    issuer: account.issuer || location.hostname,
    icon: getPageFavicon(),
  };
}

// Listen for messages from background (manual scan / image scan trigger)
browser.runtime.onMessage.addListener((message: any) => {
  if (message.type === 'SCAN_PAGE_QR') {
    handleManualScan();
  } else if (message.type === 'SCAN_IMAGE_QR' && message.srcUrl) {
    handleSingleImageScan(message.srcUrl);
  }
});

// Auto-detect QR codes after page load
async function autoDetect() {
  try {
    // Check if auto-detect is enabled via background
    const response = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (!(response as any)?.settings?.autoDetectQR) return;

    // Wait for page to settle and images to load
    await new Promise(r => setTimeout(r, 3000));

    const accounts = await scanPageForQRAsync(false);
    const domain = location.hostname;
    for (const raw of accounts) {
      const account = enrichAccount(raw);
      const shouldSave = await showToast(account, domain);
      if (shouldSave) {
        await saveAccount(account);
      }
    }
  } catch {
    // Extension context may be invalidated - silently fail
  }
}

async function handleManualScan() {
  // Manual scan always re-scans everything (manual=true bypasses cache)
  const accounts = await scanPageForQRAsync(true);

  if (accounts.length === 0) {
    showNoQRToast();
    return;
  }

  const domain = location.hostname;
  for (const raw of accounts) {
    const account = enrichAccount(raw);
    const shouldSave = await showToast(account, domain);
    if (shouldSave) {
      await saveAccount(account);
    }
  }
}

async function handleSingleImageScan(srcUrl: string) {
  const raw = await scanSingleImageUrl(srcUrl);

  if (!raw) {
    showNoQRToast();
    return;
  }

  const account = enrichAccount(raw);
  const domain = location.hostname;
  const shouldSave = await showToast(account, domain);
  if (shouldSave) {
    await saveAccount(account);
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
            node instanceof SVGElement ||
            (node instanceof HTMLElement && node.querySelector('img, canvas, svg'))) {
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

          const accounts = await scanPageForQRAsync(false);
          const domain = location.hostname;
          for (const raw of accounts) {
            const account = enrichAccount(raw);
            const shouldSave = await showToast(account, domain);
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
