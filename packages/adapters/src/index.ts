export { ADAPTERS_VERSION } from './meta';
export type {
  PageDetectionResult,
  ParseContext,
  SchoolAdapter,
} from './types';
export {
  registerAdapter,
  listAdapters,
  resolveAdapter,
  resetAdaptersForTest,
} from './registry';
export { registerBuiltinAdapters } from './builtin';

// GDIPU 适配器（检测与脱敏快照已实现；解析等待真实 Fixture）
export { gdipuAdapter } from './gdipu';
export {
  GDIPU_ADAPTER_ID,
  GDIPU_ADAPTER_VERSION,
  GDIPU_DISPLAY_NAME,
} from './gdipu/version';
export {
  isGdipuLocation,
  isLoginPage,
  semanticDetect,
  structureDetect,
  detectGdipuPage,
  findSemesterTextCandidates,
} from './gdipu/detect';
export type { StructureSignals } from './gdipu/detect';
export { buildTimetableSnapshot } from './gdipu/snapshot';
export type { DebugSnapshot } from './gdipu/snapshot';
export {
  sanitizeDomForSnapshot,
  sanitizeTextFragment,
} from './gdipu/snapshot-sanitize';

// Fixture 测试框架（真实快照到位后用于 GDIPU 回归测试）
export { runTimetableFixture } from './testing/fixture-runner';
export type { FixtureExpected, FixtureRunResult } from './testing/fixture-runner';
export { mockSchoolAdapter, MOCK_SCHOOL_ID } from './testing/mock-adapter';
