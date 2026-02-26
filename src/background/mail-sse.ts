import { MAIL_SSE_BASE } from '@shared/constants';

const activeConnections = new Map<string, AbortController>();

export async function startSSE(accountId: string, token: string): Promise<void> {
  stopSSE(accountId); // stop existing connection for this account

  const controller = new AbortController();
  activeConnections.set(accountId, controller);

  const url = `${MAIL_SSE_BASE}?topic=/accounts/${accountId}`;

  let retryDelay = 1000;

  async function connect() {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      retryDelay = 1000; // reset on successful connection

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        // Parse SSE data lines
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data) {
              handleSSEEvent(accountId, data);
            }
          }
        }
      }

      // Stream ended, reconnect
      if (activeConnections.has(accountId)) {
        setTimeout(connect, retryDelay);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      // Reconnect with exponential backoff
      retryDelay = Math.min(retryDelay * 2, 30000);
      if (activeConnections.has(accountId)) {
        setTimeout(connect, retryDelay);
      }
    }
  }

  connect();
}

function handleSSEEvent(_accountId: string, _data: string): void {
  // New mail received - show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: 'New Email',
    message: 'New email received',
  });
  // Update badge
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
}

export function stopSSE(accountId: string): void {
  const controller = activeConnections.get(accountId);
  if (controller) {
    controller.abort();
    activeConnections.delete(accountId);
  }
}

export function stopAllSSE(): void {
  for (const [id] of activeConnections) {
    stopSSE(id);
  }
}
