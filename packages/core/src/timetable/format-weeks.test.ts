import { describe, expect, it } from 'vitest';
import { formatWeeksText } from './format-weeks';

describe('formatWeeksText', () => {
  it('连续周压缩', () => {
    expect(formatWeeksText([1, 2, 3, 4])).toBe('1-4周');
  });
  it('离散周保持离散', () => {
    expect(formatWeeksText([1, 3, 5, 7])).toBe('1,3,5,7周');
  });
  it('混合段', () => {
    expect(formatWeeksText([1, 2, 3, 5, 7, 8])).toBe('1-3,5,7-8周');
  });
  it('单周', () => {
    expect(formatWeeksText([6])).toBe('6周');
  });
  it('空数组返回空字符串', () => {
    expect(formatWeeksText([])).toBe('');
  });
  it('输入乱序与重复也能归一', () => {
    expect(formatWeeksText([8, 1, 2, 3, 8])).toBe('1-3,8周');
  });
  it('1-16 全周（未被错误压缩丢失）', () => {
    expect(formatWeeksText(Array.from({ length: 16 }, (_, i) => i + 1))).toBe('1-16周');
  });
});
