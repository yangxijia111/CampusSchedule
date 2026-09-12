import { describe, expect, it } from 'vitest';
import {
  dateOfWeek,
  maxPeriodUsed,
  maxWeekUsed,
  sessionsForDay,
  sessionsForWeek,
  totalWeeksOf,
  weekOfDate,
} from './session-query';
import type { Course, Semester } from '../models';

const semester: Semester = {
  id: 'sem-test',
  schoolId: 'mock',
  academicYear: '2026-2027',
  term: 1,
  displayName: 'Mock 学期',
  startDate: '2026-09-07', // 周一
  totalWeeks: 20,
};

function makeCourse(
  id: string,
  name: string,
  sessions: Array<{
    weekday: 1 | 2 | 3 | 4 | 5;
    startPeriod: number;
    endPeriod: number;
    weeks: number[];
  }>,
): Course {
  return {
    id,
    semesterId: semester.id,
    name,
    teacherNames: ['张老师'],
    sessions: sessions.map((s, i) => ({
      id: `${id}-s${i}`,
      courseId: id,
      weekday: s.weekday,
      startPeriod: s.startPeriod,
      endPeriod: s.endPeriod,
      weeks: s.weeks,
    })),
  };
}

const math = makeCourse('c1', '高等数学', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 2, 3, 4] }]);
const english = makeCourse('c2', '大学英语', [{ weekday: 3, startPeriod: 3, endPeriod: 4, weeks: [1, 3, 5] }]);
const lab = makeCourse('c3', 'Web 实训', [{ weekday: 5, startPeriod: 5, endPeriod: 8, weeks: [2, 4] }]);

const courses = [math, english, lab];

describe('sessionsForWeek / sessionsForDay', () => {
  it('第 1 周：高等数学 + 大学英语', () => {
    const names = sessionsForWeek(courses, 1).map((s) => s.course.name).sort();
    expect(names).toEqual(['大学英语', '高等数学']);
  });
  it('第 2 周：高等数学 + 实训（英语单周不出现）', () => {
    const names = sessionsForWeek(courses, 2).map((s) => s.course.name).sort();
    expect(names).toEqual(['Web 实训', '高等数学']);
  });
  it('第 5 周后高数已结课', () => {
    expect(sessionsForWeek(courses, 5).map((s) => s.course.name)).toEqual(['大学英语']);
  });
  it('按星期过滤', () => {
    expect(sessionsForDay(courses, 1, 1).map((s) => s.course.name)).toEqual(['高等数学']);
    expect(sessionsForDay(courses, 1, 2)).toHaveLength(0);
  });
  it('冲突课程同时保留（同一时间两门课）', () => {
    const conflict = makeCourse('c4', '冲突课', [
      { weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1] },
    ]);
    const day = sessionsForDay([math, conflict], 1, 1);
    expect(day).toHaveLength(2);
  });
});

describe('maxPeriodUsed / maxWeekUsed / totalWeeksOf', () => {
  it('最大节次', () => {
    expect(maxPeriodUsed(courses)).toBe(8);
  });
  it('最大周次取自离散周', () => {
    expect(maxWeekUsed(courses)).toBe(5);
  });
  it('totalWeeks 优先学期配置', () => {
    expect(totalWeeksOf(semester, courses)).toBe(20);
  });
  it('未配置 totalWeeks 时退回实际最大周', () => {
    expect(totalWeeksOf({ ...semester, totalWeeks: undefined }, courses)).toBe(5);
  });
});

describe('weekOfDate / dateOfWeek', () => {
  it('开学首日为第 1 周', () => {
    expect(weekOfDate(semester, '2026-09-07')).toBe(1);
  });
  it('首周周日仍是第 1 周', () => {
    expect(weekOfDate(semester, '2026-09-13')).toBe(1);
  });
  it('次周周一为第 2 周', () => {
    expect(weekOfDate(semester, '2026-09-14')).toBe(2);
  });
  it('开学前返回 0', () => {
    expect(weekOfDate(semester, '2026-09-06')).toBe(0);
  });
  it('第 1 周周一换算回开学日', () => {
    expect(dateOfWeek(semester, 1, 1)).toBe('2026-09-07');
  });
  it('第 3 周周五', () => {
    expect(dateOfWeek(semester, 3, 5)).toBe('2026-09-25');
  });
  it('缺 startDate 时抛错', () => {
    const broken: Semester = { ...semester, startDate: undefined };
    expect(() => weekOfDate(broken, '2026-09-07')).toThrow();
    expect(() => dateOfWeek(broken, 1, 1)).toThrow();
  });
});
