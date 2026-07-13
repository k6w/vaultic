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

// Listen for messages from background (manual scan / image scan / autofill)
browser.runtime.onMessage.addListener((message: any) => {
  if (message.type === 'SCAN_PAGE_QR') {
    handleManualScan();
  } else if (message.type === 'SCAN_IMAGE_QR' && message.srcUrl) {
    handleSingleImageScan(message.srcUrl);
  } else if (message.type === 'FILL_CODE' && typeof message.code === 'string') {
    return Promise.resolve(fillOtpCode(message.code));
  }
});

const OTP_HINT = /(otp|totp|2fa|mfa|one.?time|auth.?code|verif|token|passcode|security.?code|\bcode\b|\bpin\b)/i;

/** Find the most likely one-time-code input on the page. */
function findOtpInputs(): HTMLInputElement[] {
  const all = Array.from(document.querySelectorAll<HTMLInputElement>('input'));
  const visible = all.filter(
    (el) => el.offsetParent !== null && !el.disabled && !el.readOnly && el.type !== 'hidden'
  );

  // 1. Explicit autocomplete hint.
  const byAutocomplete = visible.filter((el) => el.autocomplete === 'one-time-code');
  if (byAutocomplete.length) return byAutocomplete;

  // 2. Split single-character boxes (6-8 numeric inputs with maxlength 1).
  const singleChar = visible.filter(
    (el) => el.maxLength === 1 && (el.inputMode === 'numeric' || el.type === 'tel' || el.type === 'text')
  );
  if (singleChar.length >= 4 && singleChar.length <= 8) return singleChar;

  // 3. Name/id/aria/placeholder match on a text-like field.
  const byHint = visible.filter((el) => {
    if (!['text', 'tel', 'number', ''].includes(el.type)) return false;
    const hay = `${el.name} ${el.id} ${el.getAttribute('aria-label') ?? ''} ${el.placeholder ?? ''}`;
    return OTP_HINT.test(hay);
  });
  if (byHint.length) return [byHint[0]];

  // 4. Currently focused input.
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && visible.includes(active)) return [active];

  return [];
}

function setNativeValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter ? setter.call(el, value) : (el.value = value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillOtpCode(code: string): { ok: boolean; error?: string } {
  const inputs = findOtpInputs();
  if (inputs.length === 0) return { ok: false, error: 'No code field found on this page' };

  if (inputs.length > 1 && inputs.length === code.length) {
    // Distribute one digit per box.
    inputs.forEach((el, i) => {
      el.focus();
      setNativeValue(el, code[i]);
    });
    inputs[inputs.length - 1].focus();
  } else {
    const el = inputs[0];
    el.focus();
    setNativeValue(el, code);
  }
  return { ok: true };
}

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
