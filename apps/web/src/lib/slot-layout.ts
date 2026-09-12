import type { CourseSlot, Weekday } from '@campusschedule/core';

/**
 * 课程块的 interval layout（纯函数）。
 *
 * 解决问题：按 `start-end` 精确匹配分组只能处理完全相同的节次区间；
 * 部分重叠（1-2 vs 2-3、1-3 vs 2-4）的课程块会落进不同 grid cell 而空间叠压。
 *
 * 算法：每个星期独立处理 ——
 * 1. 按 startPeriod 升序（相同 start 按 endPeriod 降序）排序；
 * 2. sweep line 划分并发组（传递重叠：共享任一节次即同组）；
 * 3. 组内贪心分配列：放入"最后一个事件结束时间早于当前开始时间"的最左列，
 *    否则新开一列；组内所有事件统一使用组总列数。
 */

export interface LaidOutSlot {
  slot: CourseSlot;
  /** 并发组内列索引（0 起）。 */
  columnIndex: number;
  /** 所在并发组的总列数（决定渲染宽度）。 */
  columnCount: number;
}

export interface WeekdayLayout {
  weekday: Weekday;
  /** 该星期需要的子列总数（≥1）。 */
  columns: number;
  entries: LaidOutSlot[];
}

/** 对单个星期的课程块做并发分组与列分配。 */
function layoutWeekday(weekday: Weekday, slots: CourseSlot[]): WeekdayLayout {
  const sorted = [...slots].sort((a, b) => {
    const diff = a.session.startPeriod - b.session.startPeriod;
    if (diff !== 0) return diff;
    return b.session.endPeriod - a.session.endPeriod;
  });

  const entries: LaidOutSlot[] = [];
  let cluster: CourseSlot[] = [];
  let clusterEnd = -1;

  /** 关闭当前并发组：组内分配列并输出。 */
  const flushCluster = () => {
    if (cluster.length === 0) return;
    // 每列记录该列最后一个事件的结束节次
    const columnEnds: number[] = [];
    for (const slot of cluster) {
      let columnIndex = columnEnds.findIndex(
        (end) => slot.session.startPeriod > end,
      );
      if (columnIndex === -1) {
        columnEnds.push(slot.session.endPeriod);
        columnIndex = columnEnds.length - 1;
      } else {
        columnEnds[columnIndex] = slot.session.endPeriod;
      }
      entries.push({ slot, columnIndex, columnCount: 0 });
    }
    const columnCount = columnEnds.length;
    for (let i = entries.length - cluster.length; i < entries.length; i += 1) {
      entries[i]!.columnCount = columnCount;
    }
    cluster = [];
  };

  for (const slot of sorted) {
    // 与当前组任一事件重叠则并入（传递重叠）；否则关闭旧组开新组
    if (cluster.length > 0 && slot.session.startPeriod <= clusterEnd) {
      cluster.push(slot);
      clusterEnd = Math.max(clusterEnd, slot.session.endPeriod);
    } else {
      flushCluster();
      cluster = [slot];
      clusterEnd = slot.session.endPeriod;
    }
  }
  flushCluster();

  return {
    weekday,
    columns: entries.reduce((max, entry) => Math.max(max, entry.columnCount), 1),
    entries,
  };
}

/** 对一周的课程块做 interval layout，按星期返回。 */
export function layoutSlots(slots: CourseSlot[]): WeekdayLayout[] {
  const byWeekday = new Map<Weekday, CourseSlot[]>();
  for (const slot of slots) {
    const list = byWeekday.get(slot.session.weekday);
    if (list) {
      list.push(slot);
    } else {
      byWeekday.set(slot.session.weekday, [slot]);
    }
  }
  return [...byWeekday.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekday, weekdaySlots]) => layoutWeekday(weekday, weekdaySlots));
}
