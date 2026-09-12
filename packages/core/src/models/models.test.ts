import { describe, expect, it } from 'vitest';
import {
  courseSchema,
  courseSessionSchema,
  importWarningSchema,
  isWeekday,
  semesterSchema,
  weekdayName,
} from './index';

const validSemester = {
  id: 'sem-1',
  schoolId: 'gdipu',
  academicYear: '2026-2027',
  term: 1,
  displayName: '2026-2027学年 第一学期',
  startDate: '2026-09-07',
  totalWeeks: 20,
};

const validSession = {
  id: 'sess-1',
  courseId: 'course-1',
  weekday: 3,
  startPeriod: 1,
  endPeriod: 2,
  weeks: [1, 2, 3, 4, 5, 6, 7, 8],
  location: '教学楼 A101',
  teacherNames: ['张老师'],
  rawText: '高等数学 1-8周 张老师 教学楼A101',
};

const validCourse = {
  id: 'course-1',
  semesterId: 'sem-1',
  name: '高等数学',
  teacherNames: ['张老师'],
  credit: 4,
  category: '必修',
  sessions: [validSession],
};

describe('semesterSchema', () => {
  it('接受合法学期', () => {
    expect(semesterSchema.safeParse(validSemester).success).toBe(true);
  });

  it('允许省略 startDate 与 totalWeeks', () => {
    const { startDate: _s, totalWeeks: _t, ...minimal } = validSemester;
    expect(semesterSchema.safeParse(minimal).success).toBe(true);
  });

  it.each([
    ['学年格式错误', { ...validSemester, academicYear: '2026-2027-1' }],
    ['term 超出 1-3', { ...validSemester, term: 4 }],
    ['term 为字符串', { ...validSemester, term: '1' }],
    ['缺 displayName', { ...validSemester, displayName: undefined }],
    ['日期格式错误', { ...validSemester, startDate: '2026/09/07' }],
    ['未知额外字段', { ...validSemester, extra: 1 }],
  ])('拒绝：%s', (_name, bad) => {
    const result = semesterSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

describe('courseSessionSchema', () => {
  it('接受合法 Session', () => {
    expect(courseSessionSchema.safeParse(validSession).success).toBe(true);
  });

  it.each([
    ['weekday 为 0', { ...validSession, weekday: 0 }],
    ['weekday 为 8', { ...validSession, weekday: 8 }],
    ['weekday 为小数', { ...validSession, weekday: 1.5 }],
    ['endPeriod 小于 startPeriod', { ...validSession, endPeriod: 0, startPeriod: 2 }],
    ['weeks 为空数组', { ...validSession, weeks: [] }],
    ['weeks 含第 0 周', { ...validSession, weeks: [0, 1] }],
    ['weeks 含超大周次', { ...validSession, weeks: [61] }],
    ['节次为负数', { ...validSession, startPeriod: -1 }],
    ['缺 courseId', { ...validSession, courseId: undefined }],
    ['未知额外字段', { ...validSession, extra: 1 }],
  ])('拒绝：%s', (_name, bad) => {
    expect(courseSessionSchema.safeParse(bad).success).toBe(false);
  });
});

describe('courseSchema', () => {
  it('接受合法课程', () => {
    expect(courseSchema.safeParse(validCourse).success).toBe(true);
  });

  it.each([
    ['课程名为空', { ...validCourse, name: '' }],
    ['教师数组为空字符串成员', { ...validCourse, teacherNames: [''] }],
    ['sessions 为空数组', { ...validCourse, sessions: [] }],
    ['sessions 内嵌非法 Session', { ...validCourse, sessions: [{ ...validSession, weekday: 9 }] }],
    ['学分为负数', { ...validCourse, credit: -1 }],
    ['缺 semesterId', { ...validCourse, semesterId: undefined }],
  ])('拒绝：%s', (_name, bad) => {
    expect(courseSchema.safeParse(bad).success).toBe(false);
  });
});

describe('importWarningSchema', () => {
  it('接受已知警告码', () => {
    const warning = { code: 'UNKNOWN_WEEK_FORMAT', message: '无法识别周次', raw: '单双周?' };
    expect(importWarningSchema.safeParse(warning).success).toBe(true);
  });

  it('拒绝未知警告码', () => {
    const warning = { code: 'SOME_FUTURE_CODE', message: 'x' };
    expect(importWarningSchema.safeParse(warning).success).toBe(false);
  });

  it('拒绝空 message', () => {
    const warning = { code: 'MISSING_TEACHER', message: '' };
    expect(importWarningSchema.safeParse(warning).success).toBe(false);
  });
});

describe('weekday utilities', () => {
  it('weekdayName 返回中文名', () => {
    expect(weekdayName(1)).toBe('周一');
    expect(weekdayName(7)).toBe('周日');
  });

  it('weekdayName 拒绝非法编号', () => {
    expect(() => weekdayName(0)).toThrow(RangeError);
    expect(() => weekdayName(8)).toThrow(RangeError);
  });

  it('isWeekday 正确判定', () => {
    expect(isWeekday(1)).toBe(true);
    expect(isWeekday(7)).toBe(true);
    expect(isWeekday(0)).toBe(false);
    expect(isWeekday(8)).toBe(false);
    expect(isWeekday('3')).toBe(false);
  });
});
