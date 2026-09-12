import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings } from './settings';

describe('mergeSettings', () => {
  it('保存值缺失（undefined）时返回全部默认值', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('保存值结构非法（null / 数组 / 字符串）时返回全部默认值', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings([1, 2])).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('oops')).toEqual(DEFAULT_SETTINGS);
  });

  it('合法保存值完整覆盖默认值', () => {
    expect(
      mergeSettings({ reminderMinutes: 30, showWeekend: true, use24Hour: false, weekStart: 7 }),
    ).toEqual({ reminderMinutes: 30, showWeekend: true, use24Hour: false, weekStart: 7 });
  });

  it('部分字段合法时仅覆盖合法字段，其余回落默认值', () => {
    expect(mergeSettings({ showWeekend: true })).toEqual({
      ...DEFAULT_SETTINGS,
      showWeekend: true,
    });
    expect(mergeSettings({ reminderMinutes: '20', use24Hour: 'yes', weekStart: 3 })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('reminderMinutes 越界时收敛到 0-120', () => {
    expect(mergeSettings({ reminderMinutes: 999 })!.reminderMinutes).toBe(120);
    expect(mergeSettings({ reminderMinutes: -5 })!.reminderMinutes).toBe(0);
    expect(mergeSettings({ reminderMinutes: 12.6 })!.reminderMinutes).toBe(13);
  });

  it('weekStart 仅接受 1 或 7', () => {
    expect(mergeSettings({ weekStart: 7 })!.weekStart).toBe(7);
    expect(mergeSettings({ weekStart: 0 })!.weekStart).toBe(1);
    expect(mergeSettings({ weekStart: '7' })!.weekStart).toBe(1);
  });
});
