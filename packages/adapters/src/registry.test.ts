import { describe, expect, it, beforeEach } from 'vitest';
import type { PageDetectionResult, SchoolAdapter } from './types';
import { listAdapters, registerAdapter, resetAdaptersForTest, resolveAdapter } from './registry';

/** 仅供注册表测试的假适配器（不含任何真实学校逻辑）。 */
function fakeAdapter(id: string, host: string): SchoolAdapter {
  return {
    id,
    displayName: 'Fake ' + id,
    version: '0.0.0',
    matchLocation: (location) => {
      const hostname = new URL(location.href).hostname;
      return hostname === host || hostname.endsWith('.' + host);
    },
    detectPage: (): PageDetectionResult => ({
      domainMatched: true,
      semanticMatched: false,
      structureMatched: false,
      isLoginPage: false,
      reasons: ['fake'],
    }),
    parseSemesterContext: () => ({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'fake' } }),
    parseTimetable: () => ({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'fake' } }),
  };
}

beforeEach(() => {
  resetAdaptersForTest();
});

describe('adapter registry', () => {
  it('注册后可列出', () => {
    registerAdapter(fakeAdapter('a', 'example-a.edu'));
    expect(listAdapters()).toHaveLength(1);
    expect(listAdapters()[0]!.id).toBe('a');
  });

  it('按域名解析适配器', () => {
    registerAdapter(fakeAdapter('a', 'example-a.edu'));
    registerAdapter(fakeAdapter('b', 'example-b.edu'));
    expect(resolveAdapter(new URL('https://jw.example-a.edu/timetable'))?.id).toBe('a');
    expect(resolveAdapter(new URL('https://www.example-b.edu/'))?.id).toBe('b');
  });

  it('未匹配返回 null（不猜学校）', () => {
    registerAdapter(fakeAdapter('a', 'example-a.edu'));
    expect(resolveAdapter(new URL('https://www.baidu.com/'))).toBeNull();
    expect(resolveAdapter(new URL('https://not-example-a.edu/'))).toBeNull();
  });

  it('子域匹配不越界：example-a.edu 不匹配 bad-example-a.edu', () => {
    registerAdapter(fakeAdapter('a', 'example-a.edu'));
    expect(resolveAdapter(new URL('https://bad-example-a.edu/'))).toBeNull();
  });

  it('重复注册抛错', () => {
    registerAdapter(fakeAdapter('a', 'example-a.edu'));
    expect(() => registerAdapter(fakeAdapter('a', 'example-a.edu'))).toThrow();
  });
});
