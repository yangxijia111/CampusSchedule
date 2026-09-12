import { normalizeWeekText } from '../text/normalize';
import { parseFailure, parseSuccess } from '../models/import-warning';
import type { ParseResult } from '../models/import-warning';
import { teachingWeekSchema } from '../models/weekday';

/** 教学周次解析结果：有序、去重的周次数组。 */
export type ParsedWeeks = number[];

/** 数字或数字区间。 */
const NUMERIC_RANGE = /^(\d+)(?:-(\d+))?$/;

/**
 * 解析周次文本为周次数组。
 *
 * 支持：`1-16周`、`1-8周`、`1-16周(单)`、`1-16周(双)`、`1,3,5,7周`、
 * `1-8,10-12周`、`第1-4周`、全角标点、多余空白、每段独立的单/双标注。
 *
 * 数据正确性原则：
 * - `1-8,10-12周` 不得被错误展开为 `1-12`（第 9 周必须缺失）；
 * - `1-16周(单)` 不得被展开为全部周；
 * - 任何无法识别的段落都整体失败（UNKNOWN_WEEK_FORMAT），禁止部分解析。
 */
export function parseWeeks(raw: string): ParseResult<ParsedWeeks> {
  const normalized = normalizeWeekText(raw)
    .replace(/第/g, '')
    .replace(/周/g, '');

  if (normalized.length === 0) {
    return parseFailure({
      code: 'UNKNOWN_WEEK_FORMAT',
      message: '周次文本为空',
      raw,
    });
  }

  const weeks = new Set<number>();
  const segments = normalized.split(',');

  for (const segment of segments) {
    const parity = extractParity(segment);
    const numeric = parity ? segment.slice(0, -parity.mark.length) : segment;

    const numericMatch = NUMERIC_RANGE.test(numeric) ? numeric.match(NUMERIC_RANGE) : null;
    if (!numericMatch) {
      return parseFailure({
        code: 'UNKNOWN_WEEK_FORMAT',
        message: `无法识别的周次片段: "${segment}"`,
        raw,
      });
    }

    const start = Number(numericMatch[1]);
    const end = numericMatch[2] === undefined ? start : Number(numericMatch[2]);
    if (end < start) {
      return parseFailure({
        code: 'UNKNOWN_WEEK_FORMAT',
        message: `周次区间倒置: "${segment}"`,
        raw,
      });
    }

    for (let week = start; week <= end; week += 1) {
      if (!teachingWeekSchema.safeParse(week).success) {
        return parseFailure({
          code: 'UNKNOWN_WEEK_FORMAT',
          message: `周次超出合理范围: ${week}（片段 "${segment}"）`,
          raw,
        });
      }
      if (parity === null || (parity.kind === 'odd' ? week % 2 === 1 : week % 2 === 0)) {
        weeks.add(week);
      }
    }
  }

  const result = [...weeks].sort((a, b) => a - b);
  if (result.length === 0) {
    return parseFailure({
      code: 'UNKNOWN_WEEK_FORMAT',
      message: '周次解析结果为空',
      raw,
    });
  }
  return parseSuccess(result);
}

/** 提取段尾的单/双周标注（括号形式或裸后缀），返回标注与原文。 */
function extractParity(segment: string): { kind: 'odd' | 'even'; mark: string } | null {
  if (segment.endsWith('(单)')) return { kind: 'odd', mark: '(单)' };
  if (segment.endsWith('(双)')) return { kind: 'even', mark: '(双)' };
  if (segment.endsWith('单')) return { kind: 'odd', mark: '单' };
  if (segment.endsWith('双')) return { kind: 'even', mark: '双' };
  return null;
}
