import { describe, expect, it } from 'vitest';
import { buildImportEnvelope, envelopeFileName, envelopeToFileContent } from './envelope-builder';

const validInput = {
  schoolId: 'gdipu',
  adapterVersion: '0.1.0',
  pageUrl: 'https://jw.gdipu.edu.cn/kbcx?token=SECRETTOKEN123',
  semester: {
    id: 'gdipu-2026-2027-1',
    schoolId: 'gdipu',
    academicYear: '2026-2027',
    term: 1 as const,
    displayName: '2026-2027学年第一学期',
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
          weekday: 1 as const,
          startPeriod: 1,
          endPeriod: 2,
          weeks: [1, 2, 3],
          location: 'A101',
        },
      ],
    },
  ],
};

describe('buildImportEnvelope', () => {
  it('构造合法信封并自动脱敏 pageUrl', () => {
    const result = buildImportEnvelope(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.protocolVersion).toBe(1);
      expect(result.envelope.source.pageUrl).not.toContain('SECRETTOKEN123');
      expect(result.envelope.courses).toHaveLength(1);
      expect(result.envelope.source.importedAt).toBeTruthy();
    }
  });

  it('warnings 默认为空数组', () => {
    const result = buildImportEnvelope(validInput);
    expect(result.ok && result.envelope.warnings).toEqual([]);
  });

  it('课程数据非法时构造失败', () => {
    const result = buildImportEnvelope({
      ...validInput,
      courses: [{ ...validInput.courses[0]!, sessions: [] }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('校验失败');
    }
  });

  it('学期数据非法时构造失败', () => {
    const result = buildImportEnvelope({
      ...validInput,
      semester: { ...validInput.semester, academicYear: 'bad' },
    });
    expect(result.ok).toBe(false);
  });

  it('文件名包含学校与学期信息', () => {
    const result = buildImportEnvelope(validInput);
    if (result.ok) {
      expect(envelopeFileName(result.envelope)).toBe('gdipu-2026-2027-t1.campusschedule.json');
      expect(envelopeToFileContent(result.envelope)).toContain('"protocolVersion": 1');
    }
  });
});
