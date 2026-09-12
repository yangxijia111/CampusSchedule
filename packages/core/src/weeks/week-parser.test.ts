import { describe, expect, it } from 'vitest';
import { parseWeeks } from './week-parser';

function expectWeeks(input: string, expected: number[]) {
  const result = parseWeeks(input);
  expect(result).toEqual({ ok: true, data: expected, warnings: [] });
}

function expectFailure(input: string) {
  const result = parseWeeks(input);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe('UNKNOWN_WEEK_FORMAT');
    expect(result.error.raw).toBe(input);
  }
}

describe('parseWeeks — 基础范围', () => {
  it('1-16周 → 1..16', () => expectWeeks('1-16周', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]));
  it('1-8周 → 1..8', () => expectWeeks('1-8周', [1, 2, 3, 4, 5, 6, 7, 8]));
  it('9-16周 → 9..16', () => expectWeeks('9-16周', [9, 10, 11, 12, 13, 14, 15, 16]));
  it('第1-4周 → 1..4', () => expectWeeks('第1-4周', [1, 2, 3, 4]));
  it('第 3 周 → [3]', () => expectWeeks('第 3 周', [3]));
  it('2周 → [2]', () => expectWeeks('2周', [2]));
  it('16周 → [16]', () => expectWeeks('16周', [16]));
});

describe('parseWeeks — 单双周', () => {
  it('1-16周(单) → 奇数周', () =>
    expectWeeks('1-16周(单)', [1, 3, 5, 7, 9, 11, 13, 15]));
  it('1-16周(双) → 偶数周', () =>
    expectWeeks('1-16周(双)', [2, 4, 6, 8, 10, 12, 14, 16]));
  it('1-16周(单周) → 奇数周', () => expectWeeks('1-16周(单周)', [1, 3, 5, 7, 9, 11, 13, 15]));
  it('1-16周(双周) → 偶数周', () => expectWeeks('1-16周(双周)', [2, 4, 6, 8, 10, 12, 14, 16]));
  it('全角括号 1-16周（单） → 奇数周', () => expectWeeks('1-16周（单）', [1, 3, 5, 7, 9, 11, 13, 15]));
  it('裸后缀 1-8单 → 奇数周', () => expectWeeks('1-8单', [1, 3, 5, 7]));
  it('裸后缀 1-8双 → 偶数周', () => expectWeeks('1-8双', [2, 4, 6, 8]));
  it('每段独立单双：1-8周(单),9-16周(双)', () =>
    expectWeeks('1-8周(单),9-16周(双)', [1, 3, 5, 7, 10, 12, 14, 16]));
});

describe('parseWeeks — 离散与多段', () => {
  it('1,3,5,7周 → [1,3,5,7]', () => expectWeeks('1,3,5,7周', [1, 3, 5, 7]));
  it('关键回归：1-8,10-12周 不得包含第 9 周', () =>
    expectWeeks('1-8,10-12周', [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12]));
  it('1-4周,6周,8-10周 → 离散并集', () =>
    expectWeeks('1-4周,6周,8-10周', [1, 2, 3, 4, 6, 8, 9, 10]));
  it('中文逗号 1、2、3周 → [1,2,3]', () => expectWeeks('1、2、3周', [1, 2, 3]));
  it('全角逗号 1，2周 → [1,2]', () => expectWeeks('1，2周', [1, 2]));
  it('空格容忍 " 1 - 16周 ( 单 ) "', () => expectWeeks(' 1 - 16周 ( 单 ) ', [1, 3, 5, 7, 9, 11, 13, 15]));
  it('重复周去重：1-4,2-5周 → 1..5', () => expectWeeks('1-4,2-5周', [1, 2, 3, 4, 5]));
  it('乱序输入排序：5,1,3周 → [1,3,5]', () => expectWeeks('5,1,3周', [1, 3, 5]));
});

describe('parseWeeks — 非法输入必须失败', () => {
  it('空字符串', () => expectFailure(''));
  it('纯空白', () => expectFailure('   '));
  it('非数字文本', () => expectFailure('abc'));
  it('中文数字 第三周', () => expectFailure('第三周'));
  it('第 0 周', () => expectFailure('第0周'));
  it('第 61 周（超出上限）', () => expectFailure('61周'));
  it('区间倒置 5-2周', () => expectFailure('5-2周'));
  it('双连字符 1--2周', () => expectFailure('1--2周'));
  it('悬空逗号 "1,,2周"', () => expectFailure('1,,2周'));
  it('未闭合括号 1-16(单', () => expectFailure('1-16(单'));
  it('小数 1.5周', () => expectFailure('1.5周'));
  it('空段 ",,,"', () => expectFailure(',,,'));
});
