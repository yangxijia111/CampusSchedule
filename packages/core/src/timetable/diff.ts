import type { Course, CourseSession } from '../models';

/**
 * 重新导入差异比较（02 架构 §9）。
 *
 * 身份键：课程名 + 星期 + 起止节次（同一门课同一时段视为同一安排）。
 * - 教室 / 教师 / 周次变化 → changed（fields 标注具体字段）；
 * - 星期或节次变化 → 体现为 removed + added（无法安全对应新旧安排）。
 */
export interface TimetableDiff {
  added: CourseSession[];
  removed: CourseSession[];
  changed: {
    before: CourseSession;
    after: CourseSession;
    fields: string[];
  }[];
}

interface SlotWithContext {
  courseName: string;
  session: CourseSession;
}

function collect(courses: Course[]): SlotWithContext[] {
  const result: SlotWithContext[] = [];
  for (const course of courses) {
    for (const session of course.sessions) {
      result.push({ courseName: course.name, session });
    }
  }
  return result;
}

function identityKey(item: SlotWithContext): string {
  return [
    item.courseName,
    item.session.weekday,
    item.session.startPeriod,
    item.session.endPeriod,
  ].join('|');
}

export function diffTimetables(before: Course[], after: Course[]): TimetableDiff {
  const beforeSlots = collect(before);
  const afterSlots = collect(after);
  const beforeMap = new Map<string, SlotWithContext>();
  const afterMap = new Map<string, SlotWithContext>();
  for (const item of beforeSlots) {
    beforeMap.set(identityKey(item), item);
  }
  for (const item of afterSlots) {
    afterMap.set(identityKey(item), item);
  }

  const diff: TimetableDiff = { added: [], removed: [], changed: [] };

  for (const [key, afterItem] of afterMap) {
    const beforeItem = beforeMap.get(key);
    if (!beforeItem) {
      diff.added.push(afterItem.session);
      continue;
    }
    const fields: string[] = [];
    if ((beforeItem.session.location ?? '') !== (afterItem.session.location ?? '')) {
      fields.push('location');
    }
    if (
      (beforeItem.session.teacherNames ?? []).join(',') !==
      (afterItem.session.teacherNames ?? []).join(',')
    ) {
      fields.push('teacher');
    }
    if (weeksKey(beforeItem.session.weeks) !== weeksKey(afterItem.session.weeks)) {
      fields.push('weeks');
    }
    if (fields.length > 0) {
      diff.changed.push({
        before: beforeItem.session,
        after: afterItem.session,
        fields,
      });
    }
  }

  for (const [key, beforeItem] of beforeMap) {
    if (!afterMap.has(key)) {
      diff.removed.push(beforeItem.session);
    }
  }

  return diff;
}

function weeksKey(weeks: number[]): string {
  return [...weeks].sort((a, b) => a - b).join(',');
}

/** Diff 是否为空（无变化）。 */
export function isDiffEmpty(diff: TimetableDiff): boolean {
  return diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0;
}
