/** 扩展内部消息协议（content script ↔ popup / service worker）。 */

import type { PageDetectionResult } from '@campusschedule/adapters';

/** popup → content：查询当前页面检测状态。 */
export interface PopupQueryStatusMessage {
  type: 'popup-query-status';
}

/** content → popup：返回检测结果。 */
export interface ContentStatusMessage {
  type: 'content-status';
  /** 命中的适配器 ID；无匹配为 null。 */
  adapterId: string | null;
  schoolName: string | null;
  detection: PageDetectionResult | null;
}

export type ExtensionMessage = PopupQueryStatusMessage | ContentStatusMessage;
