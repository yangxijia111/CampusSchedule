export { CORE_VERSION, PACKAGE_NAME } from './meta';
export * from './models';

// 文本归一化
export {
  normalizeFullWidthPunctuation,
  normalizeWhitespace,
  normalizeText,
  normalizeTeacherNames,
  normalizeLocation,
  normalizeWeekText,
} from './text/normalize';

// 周次解析
export { parseWeeks } from './weeks/week-parser';
export type { ParsedWeeks } from './weeks/week-parser';

// 节次解析与作息定义
export { parsePeriods } from './periods/period-parser';
export type { ParsedPeriods } from './periods/period-parser';
export {
  periodDefinitionSchema,
  validatePeriodDefinitions,
  findPeriodDefinition,
} from './periods/period-definition';
export type { PeriodDefinition } from './periods/period-definition';

// 稳定 ID
export { stableId, courseIdFor, sessionIdFor } from './ids/stable-id';
export type {
  CourseIdentityInput,
  SessionIdentityInput,
} from './ids/stable-id';

// 课表查询与周历换算
export {
  sessionsForWeek,
  sessionsForDay,
  maxPeriodUsed,
  maxWeekUsed,
  totalWeeksOf,
  weekOfDate,
  dateOfWeek,
} from './timetable/session-query';
export type { CourseSlot } from './timetable/session-query';
export { formatWeeksText } from './timetable/format-weeks';
export { findConflicts } from './timetable/conflicts';
export type { ConflictGroup } from './timetable/conflicts';
export { diffTimetables, isDiffEmpty } from './timetable/diff';
export type { TimetableDiff } from './timetable/diff';
export { buildIcsCalendar, icsFileName } from './timetable/ics';
export type { IcsBuildResult } from './timetable/ics';
