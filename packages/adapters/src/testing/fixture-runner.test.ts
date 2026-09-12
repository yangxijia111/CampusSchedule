import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { parseSuccess } from '@campusschedule/core';
import { runTimetableFixture } from './fixture-runner';
import type { FixtureExpected } from './fixture-runner';
import { mockSchoolAdapter } from './mock-adapter';
import { gdipuAdapter } from '../gdipu';
import { registerBuiltinAdapters } from '../builtin';
import { resolveAdapter } from '../registry';

const FIXTURE_HTML = readFileSync(
  fileURLToPath(new URL('./fixtures/mock/timetable-basic.html', import.meta.url)),
  'utf8',
);
const EXPECTED_JSON_PATH = fileURLToPath(
  new URL('./fixtures/mock/timetable-basic.expected.json', import.meta.url),
);

const fixtureDocument = () => new JSDOM(FIXTURE_HTML).window.document;

/** 用 mock 适配器解析 fixture，返回解析产物。 */
function parseWithMockAdapter(): FixtureExpected {
  const semesterResult = mockSchoolAdapter.parseSemesterContext(fixtureDocument());
  if (!semesterResult.ok) {
    throw new Error('mock 适配器学期解析失败');
  }
  const timetableResult = mockSchoolAdapter.parseTimetable(fixtureDocument(), {
    semester: semesterResult.data,
  });
  if (!timetableResult.ok) {
    throw new Error('mock 适配器课表解析失败');
  }
  return {
    semester: semesterResult.data,
    courses: timetableResult.data.courses,
    warnings: timetableResult.warnings,
  };
}

/**
 * Golden 文件策略：
 * - 首次运行生成 .expected.json（人工可审）；
 * - 之后每次运行严格对比，防止解析器退化。
 */
function goldenTest(): void {
  if (!existsSync(EXPECTED_JSON_PATH)) {
    writeFileSync(EXPECTED_JSON_PATH, JSON.stringify(parseWithMockAdapter(), null, 2) + '\n', 'utf8');
    return; // 首次生成即视为通过（内容请人工审阅）
  }
  const expected = JSON.parse(readFileSync(EXPECTED_JSON_PATH, 'utf8')) as FixtureExpected;
  const result = runTimetableFixture(mockSchoolAdapter, fixtureDocument(), expected);
  expect(result.passed, result.reason ?? 'fixture 应通过').toBe(true);
}

describe('fixture 框架（mock 适配器自测）', () => {
  it('timetable-basic 快照解析与期望一致（golden）', () => {
    goldenTest();
  });

  it('期望错误时 fixture 判定失败（不静默通过）', () => {
    const wrongExpected: FixtureExpected = {
      semester: {
        id: 'mock-fixture-school-2026-2027-1',
        schoolId: 'mock-fixture-school',
        academicYear: '2026-2027',
        term: 1,
        displayName: '2026-2027学年第一学期',
        startDate: '2026-09-07',
        totalWeeks: 20,
      },
      courses: [],
    };
    const result = runTimetableFixture(mockSchoolAdapter, fixtureDocument(), wrongExpected);
    expect(result.passed).toBe(false);
  });

  it('mock 适配器正确解析单双周与离散周', () => {
    const produced = parseWithMockAdapter();
    const courses = produced.courses;
    expect(courses).toHaveLength(3);
    // 单双周：大学英语 周次为奇数
    const english = courses.find((c) => c.name === '大学英语');
    expect(english?.sessions[0]?.weeks).toEqual([1, 3, 5, 7, 9, 11, 13, 15]);
    // 离散周：数据结构 不含第 9 周（1-8,10-12 不得展开为 1-12）
    const ds = courses.find((c) => c.name === '数据结构');
    expect(ds?.sessions[0]?.weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12]);
    // 多教师
    const math = courses.find((c) => c.name === '高等数学');
    expect(math?.teacherNames).toEqual(['张三', '李四']);
  });
});

describe('GDIPU 解析边界（BLOCKED_BY_REAL_PAGE_FIXTURE）', () => {
  it('GDIPU 适配器在无真实快照时必须显式失败', () => {
    const result = runTimetableFixture(gdipuAdapter, fixtureDocument(), {
      semester: {
        id: 'x',
        schoolId: 'gdipu',
        academicYear: '2026-2027',
        term: 1,
        displayName: 'x',
      },
      courses: [],
      warnings: [],
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('BLOCKED_BY_REAL_PAGE_FIXTURE');
  });

  it('registry 中 GDIPU 域可解析到适配器', () => {
    registerBuiltinAdapters();
    expect(resolveAdapter(new URL('https://jw.gdipu.edu.cn/kbcx'))?.id).toBe('gdipu');
  });

  it('parseSuccess 工具保持 ParseResult 形状', () => {
    const result = parseSuccess({ a: 1 });
    expect(result).toEqual({ ok: true, data: { a: 1 }, warnings: [] });
  });
});
