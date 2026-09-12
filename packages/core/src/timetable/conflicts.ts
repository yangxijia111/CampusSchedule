import type { Course, Weekday } from '../models';
import type { CourseSlot } from './session-query';
import { sessionsForWeek } from './session-query';

/**
 * 冲突检测（03 数据模型 §7）：
 * 同一时间多个 Session 时不删除、不合并，全部保留并标记冲突。
 */

export interface ConflictGroup {
  weekday: Weekday;
  /** 冲突覆盖的节次区间。 */
  startPeriod: number;
  endPeriod: number;
  /** 发生冲突的教学周（各 Session 周次的交集）。 */
  weeks: number[];
  slots: CourseSlot[];
}

/** 检测某教学周内的全部时间冲突（week 缺省则检测整个学期）。 */
export function findConflicts(courses: Course[], week?: number): ConflictGroup[] {
  const slots = week === undefined ? allSlots(courses) : sessionsForWeek(courses, week);

  // 按 (weekday) 分组后两两比较
  const byWeekday = new Map<Weekday, CourseSlot[]>();
  for (const slot of slots) {
    const list = byWeekday.get(slot.session.weekday);
    if (list) {
      list.push(slot);
    } else {
      byWeekday.set(slot.session.weekday, [slot]);
    }
  }

  const groups: ConflictGroup[] = [];
  for (const [weekday, daySlots] of byWeekday) {
    for (let i = 0; i < daySlots.length; i += 1) {
      for (let j = i + 1; j < daySlots.length; j += 1) {
        const a = daySlots[i]!;
        const b = daySlots[j]!;
        const overlapStart = Math.max(a.session.startPeriod, b.session.startPeriod);
        const overlapEnd = Math.min(a.session.endPeriod, b.session.endPeriod);
        if (overlapEnd < overlapStart) continue;
        if (a.course.id === b.course.id) continue; // 同一门课自身的相邻安排不算冲突

        const weeks =
          week !== undefined
            ? [week]
            : a.session.weeks.filter((w) => b.session.weeks.includes(w));
        if (weeks.length === 0) continue;

        groups.push({
          weekday,
          startPeriod: overlapStart,
          endPeriod: overlapEnd,
          weeks: week !== undefined ? [week] : weeks,
          slots: [a, b],
        });
      }
    }
  }

  // 合并同一组课程集合的重复冲突（三方冲突等场景）
  return mergeGroups(groups);
}

function allSlots(courses: Course[]): CourseSlot[] {
  const result: CourseSlot[] = [];
  for (const course of courses) {
    for (const session of course.sessions) {
      result.push({ course, session });
    }
  }
  return result;
}

function mergeGroups(groups: ConflictGroup[]): ConflictGroup[] {
  const seen = new Set<string>();
  const merged: ConflictGroup[] = [];
  for (const group of groups) {
    const key =
      group.slots[0]!.session.id + '|' + group.slots[1]!.session.id;
    const reverseKey =
      group.slots[1]!.session.id + '|' + group.slots[0]!.session.id;
    if (seen.has(key) || seen.has(reverseKey)) continue;
    seen.add(key);
    merged.push(group);
  }
  return merged;
}
