import {
  courseIdFor,
  normalizeText,
  normalizeTeacherNames,
  parsePeriods,
  parseWeeks,
  parseFailure,
  parseSuccess,
  sessionIdFor,
} from '@campusschedule/core';
import type { Course, ParseResult, Semester } from '@campusschedule/core';
import type { NormalizedTimetable } from '@campusschedule/core';
import type { PageDetectionResult, ParseContext, SchoolAdapter } from '../types';

/**
 * Mock 学校适配器 — 仅供开发与测试 Fixture 框架/导入流程使用。
 *
 * 页面约定（自造格式，不代表任何真实学校）：
 * - <meta name="x-semester" content="2026-2027|1|2026-2027学年第一学期|2026-09-07|20">
 * - <table id="timetable">，第一行表头为 星期一..星期日；
 * - 数据单元格格式：名称;地点;周次文本;节次文本;教师(/分隔多教师)
 */

export const MOCK_SCHOOL_ID = 'mock-fixture-school';

type MockWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const WEEKDAY_NAMES: Record<string, MockWeekday> = {
  星期一: 1,
  星期二: 2,
  星期三: 3,
  星期四: 4,
  星期五: 5,
  星期六: 6,
  星期日: 7,
};

export const mockSchoolAdapter: SchoolAdapter = {
  id: MOCK_SCHOOL_ID,
  displayName: '示例适配学校（测试专用）',
  version: '0.1.0',

  matchLocation: (location) => new URL(location.href).hostname === 'mock.example.test',

  detectPage: (document): PageDetectionResult => {
    const hasTable = document.querySelector('table#timetable') !== null;
    return {
      domainMatched: true,
      semanticMatched: hasTable,
      structureMatched: hasTable,
      isLoginPage: document.querySelector('input[type="password"]') !== null,
      reasons: hasTable ? ['存在 table#timetable'] : ['缺少 table#timetable'],
    };
  },

  parseSemesterContext: (document): ParseResult<Semester> => {
    const meta = document.querySelector('meta[name="x-semester"]')?.getAttribute('content');
    if (!meta) {
      return parseFailure({
        code: 'ADAPTER_OUTDATED',
        message: '缺少 meta[name="x-semester"]',
      });
    }
    const parts = meta.split('|');
    if (parts.length < 3) {
      return parseFailure({ code: 'ADAPTER_OUTDATED', message: 'x-semester 字段不足' });
    }
    return parseSuccess({
      id: MOCK_SCHOOL_ID + '-' + parts[0] + '-' + parts[1],
      schoolId: MOCK_SCHOOL_ID,
      academicYear: parts[0]!,
      term: Number(parts[1]) as 1 | 2 | 3,
      displayName: parts[2]!,
      startDate: parts[3],
      totalWeeks: parts[4] ? Number(parts[4]) : undefined,
    });
  },

  parseTimetable: (document, context: ParseContext): ParseResult<NormalizedTimetable> => {
    const table = document.querySelector('table#timetable');
    if (!table) {
      return parseFailure({ code: 'ADAPTER_OUTDATED', message: '缺少 table#timetable' });
    }

    const headerRow = table.querySelectorAll('tr')[0];
    if (!headerRow) {
      return parseFailure({ code: 'ADAPTER_OUTDATED', message: '课表缺少表头行' });
    }

    const weekdayByColumn = new Map<number, MockWeekday>();
    [...headerRow.querySelectorAll('th')].forEach((cell, index) => {
      const weekday = WEEKDAY_NAMES[normalizeText(cell.textContent ?? '')];
      if (weekday) {
        weekdayByColumn.set(index, weekday);
      }
    });

    const courses = new Map<string, Course>();
    const rows = [...table.querySelectorAll('tr')].slice(1);
    for (const row of rows) {
      [...row.querySelectorAll('td')].forEach((cell, index) => {
        const weekday = weekdayByColumn.get(index);
        const raw = (cell.textContent ?? '').trim();
        if (!weekday || !raw) return;

        const parts = raw.split(';').map((part) => part.trim());
        const [name, location, weekText, periodText, teacherText] = parts;
        if (!name || !weekText || !periodText) return;

        const weeksResult = parseWeeks(weekText);
        const periodsResult = parsePeriods(periodText);
        if (!weeksResult.ok || !periodsResult.ok) {
          return; // 真实适配器应产生 warning；mock 保持简单
        }

        const courseId = courseIdFor({
          schoolId: MOCK_SCHOOL_ID,
          semesterId: context.semester.id,
          normalizedCourseName: normalizeText(name),
        });
        const sessionId = sessionIdFor({
          courseId,
          weekday,
          startPeriod: periodsResult.data.startPeriod,
          endPeriod: periodsResult.data.endPeriod,
          weeks: weeksResult.data,
          location: location ? normalizeText(location) : undefined,
        });

        const session = {
          id: sessionId,
          courseId,
          weekday,
          startPeriod: periodsResult.data.startPeriod,
          endPeriod: periodsResult.data.endPeriod,
          weeks: weeksResult.data,
          location: location ? normalizeText(location) : undefined,
          teacherNames: teacherText ? normalizeTeacherNames(teacherText) : undefined,
          rawText: raw,
        };
        const existing = courses.get(courseId);
        if (existing) {
          existing.sessions.push(session);
        } else {
          courses.set(courseId, {
            id: courseId,
            semesterId: context.semester.id,
            name: normalizeText(name),
            teacherNames: teacherText ? normalizeTeacherNames(teacherText) : [],
            sessions: [session],
          });
        }
      });
    }

    return parseSuccess({
      semester: context.semester,
      courses: [...courses.values()],
    });
  },
};
