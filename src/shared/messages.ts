import browser from 'webextension-polyfill';
import type { BackgroundMessage, ContentMessage } from './types';

export function sendMessage<T = unknown>(message: BackgroundMessage): Promise<T> {
  return browser.runtime.sendMessage(message) as Promise<T>;
}

export function sendTabMessage<T = unknown>(
  tabId: number,
  message: ContentMessage,
): Promise<T> {
  return browser.tabs.sendMessage(tabId, message) as Promise<T>;
}
