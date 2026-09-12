import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Course, CourseSession, Semester } from '@campusschedule/core';

/** 已注册学校（当前用于记录数据来源，不含任何账号信息）。 */
export interface SchoolRecord {
  id: string;
  displayName: string;
}

/** Course 元数据行（sessions 拆分到独立表）。 */
export type CourseRow = Omit<Course, 'sessions'>;

/** 一次导入的历史记录（不含凭据，pageUrl 已脱敏）。 */
export interface ImportRecord {
  id: string;
  semesterId: string;
  importedAt: string;
  schoolId: string;
  adapterVersion: string;
  pageUrl: string;
  courseCount: number;
  sessionCount: number;
  warningCount: number;
  /** 导入是否来自示例/Mock 数据。 */
  isMock: boolean;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export class CampusScheduleDB extends Dexie {
  schools!: Table<SchoolRecord, string>;
  semesters!: Table<Semester, string>;
  courses!: Table<CourseRow, string>;
  sessions!: Table<CourseSession, string>;
  imports!: Table<ImportRecord, string>;
  settings!: Table<SettingRow, string>;

  constructor(name = 'campusschedule') {
    super(name);
    this.version(1).stores({
      schools: 'id',
      semesters: 'id, schoolId, academicYear, term',
      courses: 'id, semesterId, name',
      sessions: 'id, courseId, weekday',
      imports: 'id, semesterId, importedAt',
      settings: 'key',
    });
  }
}
