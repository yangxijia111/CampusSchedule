import { normalizeWeekText } from '../text/normalize';
import { parseFailure, parseSuccess } from '../models/import-warning';
import type { ParseResult } from '../models/import-warning';
import { periodNumberSchema } from '../models/weekday';

/** 节次区间。 */
export interface ParsedPeriods {
  startPeriod: number;
  endPeriod: number;
}

const PERIOD_RANGE = /^(\d+)-(\d+)$/;
const PERIOD_LIST = /^\d+(?:,\d+)*$/;

/**
 * 解析节次文本为节次区间。
 *
 * 支持：`1-2`、`第1-2节`、`1,2节`、`3节`、连续多节 `1-4节`、全角符号与空白。
 * 逗号列表必须连续（如 `1,2` 等价于 `1-2`）；`1,3` 属于无法表达的离散节次，直接失败。
 */
export function parsePeriods(raw: string): ParseResult<ParsedPeriods> {
  const normalized = normalizeWeekText(raw)
    .replace(/第/g, '')
    .replace(/节/g, '')
    .replace(/课时|小节/g, '');

  if (normalized.length === 0) {
    return parseFailure({
      code: 'UNKNOWN_PERIOD_FORMAT',
      message: '节次文本为空',
      raw,
    });
  }

  let start: number;
  let end: number;

  const rangeMatch = PERIOD_RANGE.test(normalized) ? normalized.match(PERIOD_RANGE) : null;
  const listMatch = !rangeMatch && PERIOD_LIST.test(normalized) ? normalized : null;

  if (rangeMatch) {
    start = Number(rangeMatch[1]);
    end = Number(rangeMatch[2]);
    if (end < start) {
      return parseFailure({
        code: 'UNKNOWN_PERIOD_FORMAT',
        message: `节次区间倒置: "${normalized}"`,
        raw,
      });
    }
  } else if (listMatch) {
    const numbers = [...new Set(listMatch.split(',').map(Number))].sort((a, b) => a - b);
    const first = numbers[0]!;
    const last = numbers[numbers.length - 1]!;
    if (last - first + 1 !== numbers.length) {
      return parseFailure({
        code: 'UNKNOWN_PERIOD_FORMAT',
        message: `节次列表不连续: "${normalized}"`,
        raw,
      });
    }
    start = first;
    end = last;
  } else {
    return parseFailure({
      code: 'UNKNOWN_PERIOD_FORMAT',
      message: `无法识别的节次文本: "${normalized}"`,
      raw,
    });
  }

  for (const value of [start, end]) {
    if (!periodNumberSchema.safeParse(value).success) {
      return parseFailure({
        code: 'UNKNOWN_PERIOD_FORMAT',
        message: `节次超出合理范围: ${value}`,
        raw,
      });
    }
  }

  return parseSuccess({ startPeriod: start, endPeriod: end });
}
