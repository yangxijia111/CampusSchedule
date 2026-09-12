import { describe, expect, it } from 'vitest';
import { parseImportEnvelope, IMPORT_PROTOCOL_VERSION } from './envelope';

function buildValidEnvelope() {
  return {
    protocolVersion: IMPORT_PROTOCOL_VERSION,
    source: {
      schoolId: 'gdipu',
      adapterVersion: '0.1.0',
      pageUrl: 'https://jw.gdipu.edu.cn/timetable',
      importedAt: '2026-09-09T12:00:00.000Z',
    },
    semester: {
      id: 'gdipu-2026-2027-1',
      schoolId: 'gdipu',
      academicYear: '2026-2027',
      term: 1,
      displayName: '2026-2027学年 第一学期',
      startDate: '2026-09-07',
      totalWeeks: 20,
    },
    courses: [
      {
        id: 'course-1',
        semesterId: 'gdipu-2026-2027-1',
        name: '高等数学',
        teacherNames: ['张老师'],
        sessions: [
          {
            id: 'sess-1',
            courseId: 'course-1',
            weekday: 1,
            startPeriod: 1,
            endPeriod: 2,
            weeks: [1, 2, 3, 4, 5, 6, 7, 8],
            location: 'A101',
          },
        ],
      },
    ],
    warnings: [
      {
        code: 'MISSING_TEACHER',
        message: '部分课程缺少教师信息',
      },
    ],
  };
}

describe('parseImportEnvelope', () => {
  it('接受合法信封', () => {
    const result = parseImportEnvelope(buildValidEnvelope());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.courses).toHaveLength(1);
      expect(result.data.courses[0]!.sessions[0]!.weeks).toHaveLength(8);
    }
  });

  it.each([
    [
      '协议版本不匹配',
      (e: ReturnType<typeof buildValidEnvelope>) => ({ ...e, protocolVersion: 2 }),
    ],
    [
      '来源缺 adapterVersion',
      (e: ReturnType<typeof buildValidEnvelope>) => ({
        ...e,
        source: { ...e.source, adapterVersion: undefined },
      }),
    ],
    [
      'importedAt 不是 ISO 时间',
      (e: ReturnType<typeof buildValidEnvelope>) => ({
        ...e,
        source: { ...e.source, importedAt: '2026-09-09 12:00' },
      }),
    ],
    [
      '学期校验失败',
      (e: ReturnType<typeof buildValidEnvelope>) => ({
        ...e,
        semester: { ...e.semester, term: 9 },
      }),
    ],
    [
      '课程 sessions 为空',
      (e: ReturnType<typeof buildValidEnvelope>) => ({
        ...e,
        courses: [{ ...e.courses[0]!, sessions: [] }],
      }),
    ],
    [
      '警告码未知',
      (e: ReturnType<typeof buildValidEnvelope>) => ({
        ...e,
        warnings: [{ code: 'NOT_A_CODE', message: 'x' }],
      }),
    ],
    [
      '未知顶层字段',
      (e: ReturnType<typeof buildValidEnvelope>) => ({ ...e, extra: true }),
    ],
    ['完全不是对象', () => 'not-an-envelope'],
    ['数组输入', () => [1, 2, 3]],
    ['null 输入', () => null],
  ])('拒绝：%s', (_name, mutate) => {
    const result = parseImportEnvelope(mutate(buildValidEnvelope()));
    expect(result.success).toBe(false);
  });
});
