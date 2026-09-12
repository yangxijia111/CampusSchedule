import { describe, expect, it } from 'vitest';
import { CORE_VERSION, PACKAGE_NAME } from './meta';

describe('core package smoke test', () => {
  it('导出包元信息', () => {
    expect(PACKAGE_NAME).toBe('@campusschedule/core');
    expect(CORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
