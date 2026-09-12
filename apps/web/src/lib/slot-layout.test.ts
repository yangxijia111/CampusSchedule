import { describe, expect, it } from 'vitest';
import type { Course, CourseSlot } from '@campusschedule/core';
import { layoutSlots } from './slot-layout';

/** 构造测试用 slot（只需要 session 的节次字段与星期）。 */
function slot(
  id: string,
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  startPeriod: number,
  endPeriod: number,
): CourseSlot {
  const course = { id: 'c-' + id, name: id, teacherNames: [] } as Course;
  return {
    course,
    session: {
      id: 's-' + id,
      courseId: course.id,
      weekday,
      startPeriod,
      endPeriod,
      weeks: [1],
    },
  };
}

function layoutOf(input: CourseSlot[]) {
  const layouts = layoutSlots(input);
  // 展平为 [id, columnIndex, columnCount] 列表
  return layouts.flatMap((layout) =>
    layout.entries.map((entry) => ({
      id: entry.slot.course.name,
      weekday: layout.weekday,
      columns: layout.columns,
      columnIndex: entry.columnIndex,
      columnCount: entry.columnCount,
    })),
  );
}

describe('layoutSlots interval layout', () => {
  it('完全重叠 1-2 vs 1-2：同组两列并排', () => {
    const result = layoutOf([slot('A', 1, 1, 2), slot('B', 1, 1, 2)]);
    expect(result.find((r) => r.id === 'A')).toMatchObject({ columnIndex: 0, columnCount: 2, columns: 2 });
    expect(result.find((r) => r.id === 'B')).toMatchObject({ columnIndex: 1, columnCount: 2 });
  });

  it('部分重叠 1-2 vs 2-3（共享第 2 节）：同组两列错列', () => {
    const result = layoutOf([slot('A', 1, 1, 2), slot('B', 1, 2, 3)]);
    expect(result.find((r) => r.id === 'A')).toMatchObject({ columnIndex: 0, columnCount: 2 });
    expect(result.find((r) => r.id === 'B')).toMatchObject({ columnIndex: 1, columnCount: 2 });
  });

  it('交叉重叠 1-3 vs 2-4：同组两列', () => {
    const result = layoutOf([slot('A', 1, 1, 3), slot('B', 1, 2, 4)]);
    expect(result.find((r) => r.id === 'A')).toMatchObject({ columnIndex: 0, columnCount: 2 });
    expect(result.find((r) => r.id === 'B')).toMatchObject({ columnIndex: 1, columnCount: 2 });
  });

  it('三门课同时冲突：三列', () => {
    const result = layoutOf([slot('A', 1, 1, 2), slot('B', 1, 1, 2), slot('C', 1, 2, 3)]);
    expect(result.find((r) => r.id === 'C')).toMatchObject({ columnIndex: 2, columnCount: 3 });
    expect(result.every((r) => r.columns === 3)).toBe(true);
  });

  it('1-2 与 3-4 不重叠：各自独立成组、单列全宽', () => {
    const result = layoutOf([slot('A', 1, 1, 2), slot('B', 1, 3, 4)]);
    expect(result.find((r) => r.id === 'A')).toMatchObject({ columnIndex: 0, columnCount: 1 });
    expect(result.find((r) => r.id === 'B')).toMatchObject({ columnIndex: 0, columnCount: 1 });
    expect(result.every((r) => r.columns === 1)).toBe(true);
  });

  it('1-3、2-4 与 5-6：前两门同组两列，第三门独立单列', () => {
    const result = layoutOf([slot('A', 1, 1, 3), slot('B', 1, 2, 4), slot('C', 1, 5, 6)]);
    expect(result.find((r) => r.id === 'A')!.columnCount).toBe(2);
    expect(result.find((r) => r.id === 'C')!.columnCount).toBe(1);
  });

  it('不同星期互不影响', () => {
    const result = layoutOf([slot('A', 1, 1, 2), slot('B', 2, 1, 2)]);
    const monday = result.find((r) => r.id === 'A' && r.weekday === 1);
    expect(monday).toMatchObject({ columnIndex: 0, columnCount: 1 });
  });

  it('冲突仅出现在部分周：布局基于传入的（已按周过滤的）slots', () => {
    // 第 5 周：A(1-2) 与 B(2-3) 冲突
    const week5 = layoutOf([slot('A', 1, 1, 2), slot('B', 1, 2, 3)]);
    expect(week5.find((r) => r.id === 'A')!.columnCount).toBe(2);
    // 第 6 周：只有 A
    const week6 = layoutOf([slot('A', 1, 1, 2)]);
    expect(week6.find((r) => r.id === 'A')!.columnCount).toBe(1);
  });

  it('同一门课的不同 Session 正常参与布局', () => {
    const result = layoutOf([slot('A', 1, 1, 2), slot('A', 1, 2, 3)]);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.columnCount === 2)).toBe(true);
  });

  it('列复用：结束后同列可放后续课程', () => {
    // A(1-2)、B(1-3) 冲突两列；C(3-4) 与 B 共享第 3 节（同组），
    // C 不能与 B 同列（B 占第 0 列到第 3 节），但可放进 A 空出的第 1 列
    const result = layoutOf([slot('A', 1, 1, 2), slot('B', 1, 1, 3), slot('C', 1, 3, 4)]);
    expect(result.find((r) => r.id === 'C')!.columnIndex).toBe(1);
    expect(result.every((r) => r.columnCount === 2)).toBe(true);
  });
});
