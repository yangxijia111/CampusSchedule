import { describe, expect, it } from 'vitest';
import { formatTime, timeToMinutes } from './ui-utils';

describe('formatTime', () => {
  it('24 小时制原样返回', () => {
    expect(formatTime('08:00', true)).toBe('08:00');
    expect(formatTime('19:55', true)).toBe('19:55');
  });

  it('12 小时制输出中文上午/下午格式', () => {
    expect(formatTime('08:00', false)).toBe('上午 8:00');
    expect(formatTime('14:00', false)).toBe('下午 2:00');
    expect(formatTime('00:30', false)).toBe('上午 12:30');
    expect(formatTime('12:45', false)).toBe('下午 12:45');
    expect(formatTime('19:55', false)).toBe('下午 7:55');
  });
});

describe('timeToMinutes', () => {
  it('解析 HH:mm', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('20:40')).toBe(1240);
  });
});
