import type { Course, Semester, PeriodDefinition } from '@campusschedule/core';
import { courseIdFor, sessionIdFor } from '@campusschedule/core';

/**
 * Mock 学期课表（开发 Fixture）。
 * 覆盖：单双周、离散周、多段周次、一门课多个 Session、不同地点。
 * 注意：periodTimes 仅为界面开发用的示例作息，不是 GDIPU 真实作息时间。
 */

export const MOCK_SCHOOL_ID = 'mock-university';

export const mockSemester: Semester = {
  id: 'mock-2026-2027-1',
  schoolId: MOCK_SCHOOL_ID,
  academicYear: '2026-2027',
  term: 1,
  displayName: '2026-2027 学年 第一学期（示例数据）',
  startDate: '2026-09-07',
  totalWeeks: 20,
};

/** 示例作息时间表（仅用于 UI 开发，非任何学校真实数据）。 */
export const mockPeriodTimes: PeriodDefinition[] = [
  { period: 1, startTime: '08:00', endTime: '08:45' },
  { period: 2, startTime: '08:55', endTime: '09:40' },
  { period: 3, startTime: '10:00', endTime: '10:45' },
  { period: 4, startTime: '10:55', endTime: '11:40' },
  { period: 5, startTime: '14:00', endTime: '14:45' },
  { period: 6, startTime: '14:55', endTime: '15:40' },
  { period: 7, startTime: '16:00', endTime: '16:45' },
  { period: 8, startTime: '16:55', endTime: '17:40' },
  { period: 9, startTime: '19:00', endTime: '19:45' },
  { period: 10, startTime: '19:55', endTime: '20:40' },
];

interface MockCourseInput {
  name: string;
  courseCode?: string;
  teacherNames: string[];
  credit?: number;
  category?: string;
  sessions: Array<{
    weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    startPeriod: number;
    endPeriod: number;
    weeks: number[];
    location?: string;
  }>;
}

function buildMockCourse(input: MockCourseInput): Course {
  const id = courseIdFor({
    schoolId: MOCK_SCHOOL_ID,
    semesterId: mockSemester.id,
    normalizedCourseName: input.name,
    courseCode: input.courseCode,
  });
  return {
    id,
    semesterId: mockSemester.id,
    name: input.name,
    courseCode: input.courseCode,
    teacherNames: input.teacherNames,
    credit: input.credit,
    category: input.category,
    sessions: input.sessions.map((s) => ({
      id: sessionIdFor({
        courseId: id,
        weekday: s.weekday,
        startPeriod: s.startPeriod,
        endPeriod: s.endPeriod,
        weeks: s.weeks,
        location: s.location,
      }),
      courseId: id,
      weekday: s.weekday,
      startPeriod: s.startPeriod,
      endPeriod: s.endPeriod,
      weeks: s.weeks,
      location: s.location,
      teacherNames: input.teacherNames,
    })),
  };
}

export const mockCourses: Course[] = [
  buildMockCourse({
    name: '高等数学',
    courseCode: 'MATH101',
    teacherNames: ['张老师'],
    credit: 4,
    category: '必修',
    sessions: [
      { weekday: 1, startPeriod: 1, endPeriod: 2, weeks: Array.from({ length: 16 }, (_, i) => i + 1), location: '教学楼 A101' },
    ],
  }),
  buildMockCourse({
    name: '大学英语',
    courseCode: 'ENG101',
    teacherNames: ['李老师'],
    credit: 3,
    category: '必修',
    sessions: [
      // 单双周：单周周三 3-4 节，双周周五 1-2 节
      { weekday: 3, startPeriod: 3, endPeriod: 4, weeks: [1, 3, 5, 7, 9, 11, 13, 15], location: '外语楼 B203' },
      { weekday: 5, startPeriod: 1, endPeriod: 2, weeks: [2, 4, 6, 8, 10, 12, 14, 16], location: '外语楼 B203' },
    ],
  }),
  buildMockCourse({
    name: '数据结构',
    courseCode: 'CS201',
    teacherNames: ['王老师', '刘老师'],
    credit: 4,
    category: '专业必修',
    sessions: [
      // 前 8 周周二上午，后 8 周同一门课换到周四下午（多 Session 场景）
      { weekday: 2, startPeriod: 3, endPeriod: 4, weeks: Array.from({ length: 8 }, (_, i) => i + 1), location: '实验楼 C305' },
      { weekday: 4, startPeriod: 5, endPeriod: 6, weeks: Array.from({ length: 8 }, (_, i) => i + 9), location: '实验楼 C305' },
    ],
  }),
  buildMockCourse({
    name: '体育',
    courseCode: 'PE101',
    teacherNames: ['陈老师'],
    credit: 1,
    category: '必修',
    sessions: [
      // 双周周五 6-7 节
      { weekday: 5, startPeriod: 6, endPeriod: 7, weeks: [2, 4, 6, 8, 10, 12, 14, 16], location: '田径场' },
    ],
  }),
  buildMockCourse({
    name: '思想政治理论课',
    teacherNames: ['赵老师'],
    credit: 2,
    category: '必修',
    sessions: [
      // 离散周：1-8, 10-16（不含第 9 周）
      { weekday: 2, startPeriod: 1, endPeriod: 2, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16], location: '教学楼 D502' },
    ],
  }),
  buildMockCourse({
    name: 'Web 前端实训',
    teacherNames: ['孙老师'],
    credit: 2,
    category: '实训',
    sessions: [
      // 连续 4 节的实训课，1-4 周
      { weekday: 3, startPeriod: 5, endPeriod: 8, weeks: [1, 2, 3, 4], location: '实训楼 E201' },
    ],
  }),
  buildMockCourse({
    name: '人工智能导论',
    teacherNames: ['周老师'],
    credit: 2,
    category: '选修',
    sessions: [
      // 后半学期才开始
      { weekday: 4, startPeriod: 1, endPeriod: 2, weeks: [9, 10, 11, 12, 13, 14, 15, 16], location: '教学楼 A108' },
    ],
  }),
  buildMockCourse({
    name: '心理健康',
    teacherNames: ['吴老师'],
    sessions: [
      // 完全离散的周次：3,5,7,9 周
      { weekday: 5, startPeriod: 9, endPeriod: 10, weeks: [3, 5, 7, 9], location: '教学楼 B110' },
    ],
  }),
];
