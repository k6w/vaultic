import browser from 'webextension-polyfill';

export interface AutofillResult {
  ok: boolean;
  error?: string;
}

/**
 * Ask the content script on the active tab to fill `code` into the page's OTP
 * field. Injects the content script first if it isn't already present.
 */
export async function requestAutofill(code: string): Promise<AutofillResult> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return { ok: false, error: 'No active tab' };

    const send = () =>
      browser.tabs.sendMessage(tab.id!, { type: 'FILL_CODE', code }) as Promise<AutofillResult>;

    try {
      return await send();
    } catch {
      // Content script not injected yet — inject and retry.
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/index.js'],
      });
      return await send();
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
