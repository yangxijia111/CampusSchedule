import { parseFailure } from '@campusschedule/core';
import type { ParseResult, Semester } from '@campusschedule/core';
import type { NormalizedTimetable } from '@campusschedule/core';
import type { ParseContext, SchoolAdapter } from '../types';
import { detectGdipuPage, isGdipuLocation } from './detect';
import {
  GDIPU_ADAPTER_ID,
  GDIPU_ADAPTER_VERSION,
  GDIPU_DISPLAY_NAME,
} from './version';

/**
 * GDIPU 适配器。
 *
 * 当前状态：
 * - 域检测 / 页面语义与结构检测 / 脱敏快照：已实现（Phase 6）；
 * - 学期与课表解析：BLOCKED_BY_REAL_PAGE_FIXTURE——必须先由用户在真实
 *   登录后的课表页面生成脱敏快照，作为 Fixture 之后才允许编写具体
 *   selector（Phase 7）。禁止凭猜测写死接口或选择器。
 */
export const gdipuAdapter: SchoolAdapter = {
  id: GDIPU_ADAPTER_ID,
  displayName: GDIPU_DISPLAY_NAME,
  version: GDIPU_ADAPTER_VERSION,

  matchLocation: (location) => isGdipuLocation(location),
  detectPage: (document, location) => detectGdipuPage(document, location),

  parseSemesterContext: (_document: Document): ParseResult<Semester> =>
    parseFailure({
      code: 'BLOCKED_BY_REAL_PAGE_FIXTURE',
      message:
        'GDIPU 学期解析尚未实现：需要用户提供真实登录后课表页面的脱敏快照作为 Fixture 后才能编写（不得猜测页面结构）',
    }),

  parseTimetable: (
    _document: Document,
    _context: ParseContext,
  ): ParseResult<NormalizedTimetable> =>
    parseFailure({
      code: 'BLOCKED_BY_REAL_PAGE_FIXTURE',
      message:
        'GDIPU 课表解析尚未实现：需要用户提供真实登录后课表页面的脱敏快照作为 Fixture 后才能编写（不得猜测页面结构）',
    }),
};
