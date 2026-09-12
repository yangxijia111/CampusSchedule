import type { Course, ImportWarning, Semester } from '@campusschedule/core';
import type { SchoolAdapter } from '../types';

/**
 * Fixture 测试框架（07 测试计划 §2）。
 *
 * 每份真实脱敏快照配套：
 * - fixture.html（脱敏页面快照）
 * - fixture.expected.json（期望的解析结果）
 *
 * 运行：parse(html) === expected。
 * 学校页面变化后的回归流程：新快照 → 复现失败 → 修 Parser → 历史 Fixture 不退化。
 */

export interface FixtureExpected {
  semester: Semester;
  courses: Course[];
  warnings?: ImportWarning[];
}

export interface FixtureRunResult {
  passed: boolean;
  /** 失败原因（含 Adapter 错误码）。 */
  reason?: string;
  /** 实际解析结果（失败对比时展示）。 */
  actual?: { semester: Semester; courses: Course[]; warnings: ImportWarning[] };
}

/** 用给定的已解析文档运行适配器，并与期望 JSON 对比（文档由调用方解析，兼容浏览器与 Node）。 */
export function runTimetableFixture(
  adapter: SchoolAdapter,
  document: Document,
  expected: FixtureExpected,
): FixtureRunResult {
  const semesterResult = adapter.parseSemesterContext(document);
  if (!semesterResult.ok) {
    return {
      passed: false,
      reason: '学期解析失败: ' + semesterResult.error.code + ' — ' + semesterResult.error.message,
    };
  }
  const semester = semesterResult.data;

  const timetableResult = adapter.parseTimetable(document, { semester });
  if (!timetableResult.ok) {
    return {
      passed: false,
      reason:
        '课表解析失败: ' + timetableResult.error.code + ' — ' + timetableResult.error.message,
    };
  }

  const actual = {
    semester,
    courses: timetableResult.data.courses,
    warnings: timetableResult.warnings,
  };

  // 逐块对比（顺序无关：课程按 id、session 按 id 排序后比较）
  const actualSorted = sortTimetable(actual);
  const expectedSorted = sortTimetable({
    ...expected,
    warnings: expected.warnings ?? [],
  });

  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    return { passed: false, reason: '解析结果与期望不一致', actual };
  }
  return { passed: true };
}

function sortTimetable(data: {
  semester: Semester;
  courses: Course[];
  warnings: ImportWarning[];
}) {
  return {
    semester: data.semester,
    courses: data.courses
      .map((course) => ({
        ...course,
        sessions: [...course.sessions].sort(byId),
      }))
      .sort(byId),
    warnings: [...data.warnings].sort((a, b) => a.code.localeCompare(b.code)),
  };
}

function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
