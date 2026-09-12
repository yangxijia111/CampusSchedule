import { describe, expect, it } from 'vitest';
import { diffTimetables, isDiffEmpty } from './diff';
import type { Course } from '../models';

function course(id: string, name: string, sessions: Array<{
  weekday: 1 | 2 | 3;
  startPeriod: number;
  endPeriod: number;
  weeks: number[];
  location?: string;
  teacherNames?: string[];
}>): Course {
  return {
    id,
    semesterId: 's',
    name,
    teacherNames: sessions[0]?.teacherNames ?? [],
    sessions: sessions.map((s, i) => ({
      id: id + '-' + i,
      courseId: id,
      weekday: s.weekday,
      startPeriod: s.startPeriod,
      endPeriod: s.endPeriod,
      weeks: s.weeks,
      location: s.location,
      teacherNames: s.teacherNames,
    })),
  };
}

describe('diffTimetables', () => {
  it('完全一致 → 无变化', () => {
    const before = [course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 2], location: 'A101' }])];
    const after = [course('a2', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 2], location: 'A101' }])];
    const diff = diffTimetables(before, after);
    expect(isDiffEmpty(diff)).toBe(true);
  });

  it('新增课程时段 → added', () => {
    const before = [course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1] }])];
    const after = [
      course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1] }]),
      course('b', '新课程', [{ weekday: 3, startPeriod: 5, endPeriod: 6, weeks: [2] }]),
    ];
    const diff = diffTimetables(before, after);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(0);
  });

  it('删除课程时段 → removed', () => {
    const before = [
      course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1] }]),
      course('b', '旧课程', [{ weekday: 3, startPeriod: 5, endPeriod: 6, weeks: [2] }]),
    ];
    const after = [course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1] }])];
    const diff = diffTimetables(before, after);
    expect(diff.removed).toHaveLength(1);
    expect(diff.added).toHaveLength(0);
  });

  it('教室变化 → changed 字段 location', () => {
    const before = [course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1], location: 'A101' }])];
    const after = [course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1], location: 'B202' }])];
    const diff = diffTimetables(before, after);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.fields).toEqual(['location']);
  });

  it('教师变化 → changed 字段 teacher', () => {
    const before = [course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1], teacherNames: ['张三'] }])];
    const after = [course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1], teacherNames: ['李四'] }])];
    const diff = diffTimetables(before, after);
    expect(diff.changed[0]!.fields).toEqual(['teacher']);
  });

  it('周次变化 → changed 字段 weeks（1-16 全周改为 1-8 不误判为增删）', () => {
    const before = [course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 2, 3] }])];
    const after = [course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 2] }])];
    const diff = diffTimetables(before, after);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.fields).toEqual(['weeks']);
  });

  it('节次变化 → removed + added（无法安全对应）', () => {
    const before = [course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1] }])];
    const after = [course('a', '高数', [{ weekday: 1, startPeriod: 3, endPeriod: 4, weeks: [1] }])];
    const diff = diffTimetables(before, after);
    expect(diff.removed).toHaveLength(1);
    expect(diff.added).toHaveLength(1);
    expect(diff.changed).toHaveLength(0);
  });

  it('空 → 空 为无变化', () => {
    expect(isDiffEmpty(diffTimetables([], []))).toBe(true);
  });
});
