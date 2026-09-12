import { describe, expect, it } from 'vitest';
import { ADAPTERS_VERSION } from './meta';

describe('adapters package smoke test', () => {
  it('导出包版本', () => {
    expect(ADAPTERS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
