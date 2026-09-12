import { describe, expect, it } from 'vitest';
import { STORAGE_VERSION } from './meta';

describe('storage package smoke test', () => {
  it('导出包版本', () => {
    expect(STORAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
