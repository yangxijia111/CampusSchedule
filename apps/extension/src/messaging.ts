import type { ExtensionMessage } from './messages';

/**
 * Popup ↔ Content Script 的标签页消息封装。
 * 返回 undefined 表示目标页面没有注入 content script（非学校域）。
 */
export async function sendTabMessage<T>(tabId: number, message: ExtensionMessage): Promise<T | undefined> {
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as T | undefined;
  } catch {
    return undefined;
  }
}

/** 当前激活标签页。 */
export async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
