import { describe, expect, it } from 'vitest';
import { buildIcsCalendar, icsFileName } from './ics';
import type { Course, PeriodDefinition, Semester } from '../models';

const semester: Semester = {
  id: 'sem-1',
  schoolId: 'gdipu',
  academicYear: '2026-2027',
  term: 1,
  displayName: '2026-2027学年第一学期',
  startDate: '2026-09-07', // 周一
  totalWeeks: 20,
};

const periodTimes: PeriodDefinition[] = [
  { period: 1, startTime: '08:00', endTime: '08:45' },
  { period: 2, startTime: '08:55', endTime: '09:40' },
  { period: 3, startTime: '10:00', endTime: '10:45' },
];

const course: Course = {
  id: 'c1',
  semesterId: 'sem-1',
  name: '高等数学,基础课',
  teacherNames: ['张老师'],
  sessions: [
    {
      id: 'c1-s1',
      courseId: 'c1',
      weekday: 1,
      startPeriod: 1,
      endPeriod: 2,
      weeks: [1, 3], // 离散周：必须展开为两个事件
      location: 'A101',
    },
  ],
};

describe('buildIcsCalendar', () => {
  it('离散周次逐周展开为独立事件', () => {
    const result = buildIcsCalendar({ semester, courses: [course], periodTimes });
    expect(result.ok).toBe(true);
    expect(result.eventCount).toBe(2);
    expect(result.ics).toContain('DTSTART:20260907T080000');
    expect(result.ics).toContain('DTSTART:20260921T080000'); // 第 3 周 = 09-21
    expect(result.ics).toContain('DTEND:20260907T094000');
  });

  it('文本转义：课程名中的逗号与分号', () => {
    const result = buildIcsCalendar({ semester, courses: [course], periodTimes });
    expect(result.ics).toContain('SUMMARY:高等数学\\,基础课 · A101 · 张老师');
  });

  it('缺少作息定义的节次被跳过并说明原因', () => {
    const advanced: Course = {
      ...course,
      sessions: [
        { ...course.sessions[0]!, startPeriod: 9, endPeriod: 10 },
      ],
    };
    const result = buildIcsCalendar({ semester, courses: [advanced], periodTimes });
    expect(result.ok).toBe(true);
    expect(result.eventCount).toBe(0);
    expect(result.skipped[0]).toContain('缺少作息时间定义');
  });

  it('学期缺开学日期 → 失败并说明', () => {
    const result = buildIcsCalendar({
      semester: { ...semester, startDate: undefined },
      courses: [course],
      periodTimes,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('开学日期');
  });

  it('提醒生成 VALARM', () => {
    const result = buildIcsCalendar({
      semester,
      courses: [course],
      periodTimes,
      alarmMinutes: 15,
    });
    expect(result.ics).toContain('TRIGGER:-PT15M');
    expect(result.ics).toContain('BEGIN:VALARM');
  });

  it('CRLF 行分隔与 VCALENDAR 包裹', () => {
    const result = buildIcsCalendar({ semester, courses: [course], periodTimes });
    expect(result.ics!.startsWith('BEGIN:VCALENDAR' + '\r\n')).toBe(true);
    expect(result.ics!.endsWith('END:VCALENDAR' + '\r\n')).toBe(true);
  });

  it('文件名包含学期 id', () => {
    expect(icsFileName(semester)).toBe('campusschedule-sem-1.ics');
  });
});
