import type { Course, Semester } from '../models';
import type { PeriodDefinition } from '../periods/period-definition';
import { findPeriodDefinition } from '../periods/period-definition';
import { dateOfWeek } from './session-query';

/**
 * ICS 日历导出（02 架构 §10）。
 *
 * 规则：
 * - 离散周次逐周展开为独立 VEVENT（不使用 RRULE，避免单双周/离散周的展开错误）；
 * - 每节课的起止时间来自作息表（PeriodDefinition）；
 * - 某节次缺少作息定义时跳过该事件并记录原因，禁止编造时间；
 * - 法定节假日不做任何自动停课假设（学校数据未提供则照常导出）。
 */

export interface IcsBuildResult {
  ok: boolean;
  ics?: string;
  error?: string;
  /** 因缺少作息定义等原因被跳过的课程时段说明。 */
  skipped: string[];
  eventCount: number;
}

const CRLF = '\r\n';

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function toIcsDateTime(isoDate: string, time: string): string {
  return isoDate.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
}

export function buildIcsCalendar(input: {
  semester: Semester;
  courses: Course[];
  periodTimes: PeriodDefinition[];
  /** 上课前提醒分钟数；0 表示不加提醒。 */
  alarmMinutes?: number;
}): IcsBuildResult {
  const { semester, courses, periodTimes, alarmMinutes = 0 } = input;

  if (!semester.startDate) {
    return {
      ok: false,
      error: '学期未配置开学日期（第一教学周周一），无法换算日历',
      skipped: [],
      eventCount: 0,
    };
  }

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampusSchedule//CampusSchedule 0.1//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + escapeIcsText(semester.displayName + ' 课程表'),
  ];

  const skipped: string[] = [];
  let eventCount = 0;

  for (const course of courses) {
    for (const session of course.sessions) {
      const startDef = findPeriodDefinition(periodTimes, session.startPeriod);
      const endDef = findPeriodDefinition(periodTimes, session.endPeriod);
      if (!startDef || !endDef) {
        skipped.push(
          course.name +
            '（星期' +
            session.weekday +
            ' 第' +
            session.startPeriod +
            '-' +
            session.endPeriod +
            '节）：缺少作息时间定义，已跳过',
        );
        continue;
      }

      for (const week of session.weeks) {
        const date = dateOfWeek(semester, week, session.weekday);
        const uid = session.id + '-' + date + '@campusschedule.local';
        const summaryParts = [course.name];
        if (session.location) {
          summaryParts.push(session.location);
        }
        const teachers = session.teacherNames ?? course.teacherNames;
        if (teachers.length > 0) {
          summaryParts.push(teachers.join('、'));
        }
        const summary = escapeIcsText(summaryParts.join(' · '));

        lines.push(
          'BEGIN:VEVENT',
          'UID:' + uid,
          'DTSTAMP:' + toIcsDateTime(semester.startDate, '08:00'),
          'DTSTART:' + toIcsDateTime(date, startDef.startTime),
          'DTEND:' + toIcsDateTime(date, endDef.endTime),
          'SUMMARY:' + summary,
          'DESCRIPTION:' + escapeIcsText('第' + week + '教学周 · CampusSchedule 导出'),
        );
        if (alarmMinutes > 0) {
          lines.push(
            'BEGIN:VALARM',
            'TRIGGER:-PT' + alarmMinutes + 'M',
            'ACTION:DISPLAY',
            'DESCRIPTION:' + summary,
            'END:VALARM',
          );
        }
        lines.push('END:VEVENT');
        eventCount += 1;
      }
    }
  }

  lines.push('END:VCALENDAR');

  return { ok: true, ics: lines.join(CRLF) + CRLF, skipped, eventCount };
}

/** ICS 文件名。 */
export function icsFileName(semester: Semester): string {
  return 'campusschedule-' + semester.id + '.ics';
}
