import { describe, expect, it } from 'vitest';
import { IMPORTER_PROTOCOL_VERSION } from './meta';

describe('importer-protocol package smoke test', () => {
  it('导出包版本', () => {
    expect(IMPORTER_PROTOCOL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
