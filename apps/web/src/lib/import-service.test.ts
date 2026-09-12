import { describe, expect, it } from 'vitest';
import type { Course } from '@campusschedule/core';
import type { ImportEnvelope } from '@campusschedule/importer-protocol';
import { buildImportEnvelope } from '@campusschedule/importer-protocol';
import {
  buildImportPreview,
  checkImportFileSize,
  describeWarning,
  IMPORT_FILE_MAX_BYTES,
  parseImportFileContent,
} from './import-service';

describe('describeWarning', () => {
  it('已知 code 映射为中文说明并拼接 message', () => {
    expect(describeWarning({ code: 'MISSING_TEACHER', message: '课程 X 无教师' })).toBe(
      '缺少教师信息：课程 X 无教师',
    );
    expect(describeWarning({ code: 'UNKNOWN_WEEK_FORMAT', message: '周次文本无法解析' })).toBe(
      '上课周次无法识别：周次文本无法解析',
    );
  });

  it('带原文时附加 raw 引用', () => {
    expect(
      describeWarning({ code: 'AMBIGUOUS_CELL', message: '单元格含多门课', raw: '高数;英语' }),
    ).toBe('课表单元格内容有歧义：单元格含多门课（原文：高数;英语）');
  });

  it('未知 code 回落到通用说明', () => {
    expect(describeWarning({ code: 'SOMETHING_NEW', message: 'x' })).toBe('未知解析警告：x');
  });
});

describe('checkImportFileSize', () => {
  it('正常大小通过（返回 null）', () => {
    expect(checkImportFileSize(1024)).toBeNull();
    expect(checkImportFileSize(IMPORT_FILE_MAX_BYTES)).toBeNull();
  });

  it('超限返回包含大小与上限的人话错误', () => {
    const error = checkImportFileSize(IMPORT_FILE_MAX_BYTES + 1);
    expect(error).toContain('文件过大');
    expect(error).toContain('5 MB');
  });
});

function sampleEnvelopeFileContent(warningCount = 0, courseCount = 3): string {
  const courses = Array.from({ length: courseCount }, (_, i) => ({
    id: 'course-' + i,
    semesterId: 'sem-1',
    name: '课程' + i,
    teacherNames: ['张老师'],
    sessions: [
      {
        id: 'course-' + i + '-s1',
        courseId: 'course-' + i,
        weekday: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        startPeriod: 1,
        endPeriod: 2,
        weeks: [1, 2, 3, 4],
        location: 'A' + (100 + i),
      },
      {
        id: 'course-' + i + '-s2',
        courseId: 'course-' + i,
        weekday: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        startPeriod: 3,
        endPeriod: 4,
        weeks: [1, 3, 5],
      },
    ],
  }));
  const warnings = Array.from({ length: warningCount }, (_, i) => ({
    code: 'MISSING_LOCATION' as const,
    message: '课程' + i + ' 缺少教室',
  }));
  const result = buildImportEnvelope({
    schoolId: 'gdipu',
    adapterVersion: '0.1.0',
    pageUrl: 'https://jw.gdipu.edu.cn/kbcx',
    semester: {
      id: 'sem-1',
      schoolId: 'gdipu',
      academicYear: '2026-2027',
      term: 1,
      displayName: '2026-2027学年第一学期',
      startDate: '2026-09-07',
      totalWeeks: 20,
    },
    courses,
    warnings,
  });
  if (!result.ok) {
    throw new Error('测试信封构造失败');
  }
  return JSON.stringify(result.envelope);
}

describe('parseImportFileContent', () => {
  it('合法文件解析成功', () => {
    const result = parseImportFileContent(sampleEnvelopeFileContent());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.courses).toHaveLength(3);
    }
  });

  it('非 JSON 文本报错', () => {
    const result = parseImportFileContent('这不是 JSON');
    expect(result.ok).toBe(false);
  });

  it('协议版本不符报错并给出路径', () => {
    const result = parseImportFileContent('{"protocolVersion": 99}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('校验失败');
    }
  });

  it('courses 中 sessions 为空报错', () => {
    const bad = JSON.parse(sampleEnvelopeFileContent());
    bad.courses[0].sessions = [];
    const result = parseImportFileContent(JSON.stringify(bad));
    expect(result.ok).toBe(false);
  });
});

describe('buildImportPreview', () => {
  const envelope = (): ImportEnvelope =>
    JSON.parse(sampleEnvelopeFileContent(2, 4)) as ImportEnvelope;

  /** 构造含 n 个 Session 的本地课表。 */
  function previousCoursesWithSessions(n: number): Course[] {
    const courses: Course[] = [];
    let remaining = n;
    let index = 0;
    while (remaining > 0) {
      const sessions = Math.min(2, remaining);
      courses.push({
        id: 'prev-' + index,
        semesterId: 'sem-1',
        name: '旧课程' + index,
        teacherNames: [],
        sessions: Array.from({ length: sessions }, (_, s) => ({
          id: 'prev-' + index + '-' + s,
          courseId: 'prev-' + index,
          weekday: 1 as const,
          startPeriod: s * 2 + 1,
          endPeriod: s * 2 + 2,
          weeks: [1, 2, 3, 4],
        })),
      });
      remaining -= sessions;
      index += 1;
    }
    return courses;
  }

  it('统计课程/时段/警告', () => {
    const preview = buildImportPreview(envelope());
    expect(preview.courseCount).toBe(4);
    expect(preview.sessionCount).toBe(8);
    expect(preview.warningCount).toBe(2);
    expect(preview.semesterDisplayName).toContain('第一学期');
  });

  it('首次导入（无历史）不判异常且无 diff', () => {
    const preview = buildImportPreview(envelope());
    expect(preview.anomaly.suspicious).toBe(false);
    expect(preview.diff).toBeNull();
  });

  it('Session 骤降（25 → 8）判为可疑并阻止静默覆盖', () => {
    const preview = buildImportPreview(envelope(), previousCoursesWithSessions(25));
    expect(preview.anomaly.suspicious).toBe(true);
    expect(preview.anomaly.message).toContain('异常');
  });

  it('旧数据少于 10 不判异常（8 → 8）', () => {
    const preview = buildImportPreview(envelope(), previousCoursesWithSessions(8));
    expect(preview.anomaly.suspicious).toBe(false);
  });

  it('小幅减少（16 → 8）不判异常', () => {
    const preview = buildImportPreview(envelope(), previousCoursesWithSessions(16));
    expect(preview.anomaly.suspicious).toBe(false);
  });

  it('重复导入同一份数据 → diff 全零', () => {
    const env = envelope();
    const preview = buildImportPreview(env, env.courses);
    expect(preview.diff).toEqual({ added: 0, removed: 0, changed: 0, changedFields: [] });
  });

  it('与旧课表对比产生 diff 统计', () => {
    const preview = buildImportPreview(envelope(), previousCoursesWithSessions(2));
    expect(preview.diff).not.toBeNull();
    expect(preview.diff!.added).toBe(8); // 新课表 8 个时段，旧课只有一个时段身份可对应
    expect(preview.diff!.removed).toBeGreaterThanOrEqual(1);
  });
});
