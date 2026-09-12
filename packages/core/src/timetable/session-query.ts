import type { Course, CourseSession, Semester, Weekday } from '../models';

/** 课程 + 其某个 Session 的配对（渲染与查询的基本单元）。 */
export interface CourseSlot {
  course: Course;
  session: CourseSession;
}

/**
 * 查询某教学周内全部有效 Session。
 * 冲突课程（同一时间多个 Session）全部保留，由 UI 标记，不丢弃。
 */
export function sessionsForWeek(courses: Course[], week: number): CourseSlot[] {
  const result: CourseSlot[] = [];
  for (const course of courses) {
    for (const session of course.sessions) {
      if (session.weeks.includes(week)) {
        result.push({ course, session });
      }
    }
  }
  return result;
}

/** 查询某教学周、某星期的全部 Session。 */
export function sessionsForDay(
  courses: Course[],
  week: number,
  weekday: Weekday,
): CourseSlot[] {
  return sessionsForWeek(courses, week).filter(
    (slot) => slot.session.weekday === weekday,
  );
}

/** 课表用到的最大节次（决定网格行数）。 */
export function maxPeriodUsed(courses: Course[]): number {
  let max = 0;
  for (const course of courses) {
    for (const session of course.sessions) {
      max = Math.max(max, session.endPeriod);
    }
  }
  return max;
}

/** 课表出现的最大教学周（决定周切换上限）。 */
export function maxWeekUsed(courses: Course[]): number {
  let max = 0;
  for (const course of courses) {
    for (const session of course.sessions) {
      max = Math.max(max, ...session.weeks);
    }
  }
  return max;
}

/** 学期总周数：优先使用学期配置，否则退回课表实际用到的最大周。 */
export function totalWeeksOf(semester: Semester, courses: Course[]): number {
  return semester.totalWeeks ?? maxWeekUsed(courses);
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 由 YYYY-MM-DD 计算与 1970-01-01 的天数差（纯日期运算，无时区换算）。 */
function dateToDayCount(isoDate: string): number {
  const matched = ISO_DATE_PATTERN.test(isoDate) ? isoDate.match(ISO_DATE_PATTERN) : null;
  if (!matched) {
    throw new Error('非法日期格式，应为 YYYY-MM-DD');
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  // 以 UTC 构造再取天数，保证纯日期运算不受本地时区影响
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/**
 * 计算某日期处于第几教学周。
 * startDate 必须是第一教学周的周一；开学前返回 0。
 */
export function weekOfDate(semester: Semester, isoDate: string): number {
  if (!semester.startDate) {
    throw new Error('学期未配置 startDate，无法计算教学周');
  }
  const diffDays = dateToDayCount(isoDate) - dateToDayCount(semester.startDate);
  if (diffDays < 0) {
    return 0;
  }
  return Math.floor(diffDays / 7) + 1;
}

/** 教学周 week、星期 weekday 对应的真实日期（YYYY-MM-DD）。 */
export function dateOfWeek(
  semester: Semester,
  week: number,
  weekday: Weekday,
): string {
  if (!semester.startDate) {
    throw new Error('学期未配置 startDate，无法换算日期');
  }
  const days = dateToDayCount(semester.startDate) + (week - 1) * 7 + (weekday - 1);
  const date = new Date(days * 86_400_000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}
