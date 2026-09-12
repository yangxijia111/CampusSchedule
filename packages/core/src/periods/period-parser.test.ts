import { describe, expect, it } from 'vitest';
import { parsePeriods } from './period-parser';

function expectPeriods(input: string, startPeriod: number, endPeriod: number) {
  const result = parsePeriods(input);
  expect(result).toEqual({ ok: true, data: { startPeriod, endPeriod }, warnings: [] });
}

function expectFailure(input: string) {
  const result = parsePeriods(input);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe('UNKNOWN_PERIOD_FORMAT');
  }
}

describe('parsePeriods', () => {
  it('1-2 → 第1-2节', () => expectPeriods('1-2', 1, 2));
  it('第1-2节 → 第1-2节', () => expectPeriods('第1-2节', 1, 2));
  it('1,2节 → 第1-2节', () => expectPeriods('1,2节', 1, 2));
  it('3节 → 第3节单节', () => expectPeriods('3节', 3, 3));
  it('1-4节 → 连续多节', () => expectPeriods('1-4节', 1, 4));
  it('1,2,3节 → 第1-3节', () => expectPeriods('1,2,3节', 1, 3));
  it('全角符号 第１－２节？— 仅半角数字场景', () => expectPeriods(' 1 - 2 节 ', 1, 2));
  it('第 2 节（含空白）', () => expectPeriods('第 2 节', 2, 2));
  it('10-12节 → 两位数节次', () => expectPeriods('10-12节', 10, 12));

  it('逗号列表去重后连续：2,1,2节 → 1-2', () => expectPeriods('2,1,2节', 1, 2));

  it.each([
    ['空字符串', ''],
    ['非数字', 'abc'],
    ['离散节次 1,3节', '1,3节'],
    ['区间倒置 2-1节', '2-1节'],
    ['第 0 节', '0节'],
    ['第 31 节（超出上限）', '31节'],
    ['小数 1.5节', '1.5节'],
    ['悬空逗号 "1,,2节"', '1,,2节'],
    ['混杂文字 "上午1-2节"', '上午1-2节'],
  ])('失败：%s', (_name, input) => {
    expectFailure(input);
  });
});
