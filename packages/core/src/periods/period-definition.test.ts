import { describe, expect, it } from 'vitest';
import {
  findPeriodDefinition,
  periodDefinitionSchema,
  validatePeriodDefinitions,
} from './period-definition';

const validDef = { period: 1, startTime: '08:00', endTime: '08:45' };

describe('periodDefinitionSchema', () => {
  it('接受合法定义', () => {
    expect(periodDefinitionSchema.safeParse(validDef).success).toBe(true);
  });
  it.each([
    ['时间为 H:m 短格式', { ...validDef, startTime: '8:00' }],
    ['时间含秒', { ...validDef, startTime: '08:00:00' }],
    ['节次为 0', { ...validDef, period: 0 }],
    ['未知额外字段', { ...validDef, extra: 1 }],
  ])('拒绝：%s', (_name, bad) => {
    expect(periodDefinitionSchema.safeParse(bad).success).toBe(false);
  });
});

describe('validatePeriodDefinitions', () => {
  it('接受一组合法定义', () => {
    const defs = [
      { period: 1, startTime: '08:00', endTime: '08:45' },
      { period: 2, startTime: '08:55', endTime: '09:40' },
    ];
    expect(validatePeriodDefinitions(defs)).toEqual({ ok: true });
  });
  it('拒绝结束时间不晚于开始时间', () => {
    const defs = [{ period: 1, startTime: '09:00', endTime: '09:00' }];
    const result = validatePeriodDefinitions(defs);
    expect(result.ok).toBe(false);
  });
  it('拒绝重复节次', () => {
    const defs = [
      { period: 1, startTime: '08:00', endTime: '08:45' },
      { period: 1, startTime: '08:55', endTime: '09:40' },
    ];
    const result = validatePeriodDefinitions(defs);
    expect(result.ok).toBe(false);
  });
  it('空数组合法（未配置作息时由上层提示用户配置）', () => {
    expect(validatePeriodDefinitions([])).toEqual({ ok: true });
  });
});

describe('findPeriodDefinition', () => {
  const defs = [
    { period: 1, startTime: '08:00', endTime: '08:45' },
    { period: 2, startTime: '08:55', endTime: '09:40' },
  ];
  it('命中返回定义', () => {
    expect(findPeriodDefinition(defs, 2)?.endTime).toBe('09:40');
  });
  it('未命中返回 null', () => {
    expect(findPeriodDefinition(defs, 3)).toBeNull();
  });
});
