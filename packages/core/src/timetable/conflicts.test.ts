import { describe, expect, it } from 'vitest';
import { findConflicts } from './conflicts';
import type { Course } from '../models';

function course(id: string, name: string, sessions: Array<{
  weekday: 1 | 2 | 3;
  startPeriod: number;
  endPeriod: number;
  weeks: number[];
}>): Course {
  return {
    id,
    semesterId: 's',
    name,
    teacherNames: [],
    sessions: sessions.map((s, i) => ({
      id: id + '-' + i,
      courseId: id,
      weekday: s.weekday,
      startPeriod: s.startPeriod,
      endPeriod: s.endPeriod,
      weeks: s.weeks,
    })),
  };
}

describe('findConflicts', () => {
  it('无冲突返回空', () => {
    const courses = [
      course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 2] }]),
      course('b', '英语', [{ weekday: 1, startPeriod: 3, endPeriod: 4, weeks: [1, 2] }]),
    ];
    expect(findConflicts(courses)).toHaveLength(0);
    expect(findConflicts(courses, 1)).toHaveLength(0);
  });

  it('同一时间两门课 → 冲突（不丢弃任何一个）', () => {
    const courses = [
      course('a', '高数', [{ weekday: 2, startPeriod: 1, endPeriod: 2, weeks: [1, 2] }]),
      course('b', '英语', [{ weekday: 2, startPeriod: 2, endPeriod: 3, weeks: [1, 2] }]),
    ];
    const conflicts = findConflicts(courses);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.slots).toHaveLength(2);
    expect(conflicts[0]!.startPeriod).toBe(2);
    expect(conflicts[0]!.endPeriod).toBe(2);
  });

  it('周次不重叠不算冲突', () => {
    const courses = [
      course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 2] }]),
      course('b', '英语', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [3, 4] }]),
    ];
    expect(findConflicts(courses)).toHaveLength(0);
  });

  it('按周查询：单周冲突双周不冲突', () => {
    const courses = [
      course('a', '高数', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 3] }]),
      course('b', '英语', [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 2] }]),
    ];
    expect(findConflicts(courses, 1)).toHaveLength(1); // 第 1 周重叠
    expect(findConflicts(courses, 2)).toHaveLength(0); // 第 2 周高数不上
    expect(findConflicts(courses, 3)).toHaveLength(0);
  });

  it('同一门课的不同时段不算自身冲突', () => {
    const courses = [
      course('a', '高数', [
        { weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1] },
        { weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1] }, // 同课同时段重复也不算冲突
      ]),
    ];
    expect(findConflicts(courses)).toHaveLength(0);
  });

  it('完全重叠的多节冲突', () => {
    const courses = [
      course('a', '实训', [{ weekday: 3, startPeriod: 1, endPeriod: 4, weeks: [1] }]),
      course('b', '选修', [{ weekday: 3, startPeriod: 2, endPeriod: 3, weeks: [1] }]),
    ];
    const conflicts = findConflicts(courses, 1);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.startPeriod).toBe(2);
    expect(conflicts[0]!.endPeriod).toBe(3);
  });
});
