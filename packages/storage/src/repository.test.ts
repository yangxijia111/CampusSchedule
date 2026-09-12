// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach } from 'vitest';
import type { Course, Semester } from '@campusschedule/core';
import { CampusScheduleDB, TimetableRepository } from './index';
import type { ImportRecord } from './index';

let db: CampusScheduleDB;
let repo: TimetableRepository;
let dbCounter = 0;

const semester: Semester = {
  id: 'sem-1',
  schoolId: 'mock',
  academicYear: '2026-2027',
  term: 1,
  displayName: '测试学期',
  startDate: '2026-09-07',
  totalWeeks: 20,
};

function makeCourse(index: number): Course {
  const id = 'course-' + index;
  return {
    id,
    semesterId: semester.id,
    name: '课程' + index,
    teacherNames: ['张老师'],
    sessions: [
      {
        id: id + '-s1',
        courseId: id,
        weekday: 1,
        startPeriod: 1,
        endPeriod: 2,
        weeks: [1, 2, 3],
        location: 'A101',
      },
      {
        id: id + '-s2',
        courseId: id,
        weekday: 3,
        startPeriod: 5,
        endPeriod: 6,
        weeks: [2, 4, 6],
      },
    ],
  };
}

beforeEach(async () => {
  dbCounter += 1;
  db = new CampusScheduleDB('campusschedule-test-' + dbCounter);
  repo = new TimetableRepository(db);
});

describe('TimetableRepository — 学期', () => {
  it('保存后可读回且字段一致', async () => {
    await repo.saveSemester(semester);
    const loaded = await repo.getSemester(semester.id);
    expect(loaded).toEqual(semester);
  });

  it('重复保存幂等（不产生重复行）', async () => {
    await repo.saveSemester(semester);
    await repo.saveSemester(semester);
    expect(await repo.getSemesters()).toHaveLength(1);
  });
});

describe('TimetableRepository — 课程与 Session 拆分', () => {
  it('保存课程后 join 还原一致（含 sessions）', async () => {
    const courses = [makeCourse(1), makeCourse(2)];
    await repo.saveSemester(semester);
    await repo.replaceSemesterCourses(semester.id, courses);
    const loaded = await repo.getCourses(semester.id);
    expect(loaded).toHaveLength(2);
    // Course 内嵌 sessions 的还原
    const first = loaded.find((c) => c.id === 'course-1')!;
    expect(first.sessions).toHaveLength(2);
    expect(first.sessions[0]).toEqual(courses[0]!.sessions[0]);
    expect(first.name).toBe('课程1');
  });

  it('整体替换后旧数据不残留', async () => {
    await repo.saveSemester(semester);
    await repo.replaceSemesterCourses(semester.id, [makeCourse(1), makeCourse(2)]);
    await repo.replaceSemesterCourses(semester.id, [makeCourse(3)]);
    const loaded = await repo.getCourses(semester.id);
    expect(loaded.map((c) => c.id)).toEqual(['course-3']);
    // sessions 表中旧课程的 session 已被清除
    expect(await db.sessions.count()).toBe(2);
  });

  it('不同学期数据互不影响', async () => {
    const other: Semester = { ...semester, id: 'sem-2', term: 2 };
    await repo.saveSemester(semester);
    await repo.saveSemester(other);
    await repo.replaceSemesterCourses(semester.id, [makeCourse(1)]);
    await repo.replaceSemesterCourses(other.id, [makeCourse(9)]);
    expect(await repo.getCourses(semester.id)).toHaveLength(1);
    expect(await repo.getCourses(other.id)).toHaveLength(1);
  });
});

describe('TimetableRepository — 删除级联', () => {
  it('删除学期同时删除课程/Session/导入记录', async () => {
    await repo.saveSemester(semester);
    await repo.replaceSemesterCourses(semester.id, [makeCourse(1)]);
    await repo.saveImportRecord({
      id: 'imp-1',
      semesterId: semester.id,
      importedAt: new Date().toISOString(),
      schoolId: 'mock',
      adapterVersion: '0.1.0',
      pageUrl: 'https://example.edu/timetable',
      courseCount: 1,
      sessionCount: 2,
      warningCount: 0,
      isMock: true,
    });
    await repo.deleteSemester(semester.id);
    expect(await repo.getSemesters()).toHaveLength(0);
    expect(await repo.getCourses(semester.id)).toHaveLength(0);
    expect(await db.sessions.count()).toBe(0);
    expect(await repo.getImportRecords(semester.id)).toHaveLength(0);
  });
});

describe('TimetableRepository — 导入历史与设置', () => {
  it('导入记录按学期查询', async () => {
    const record: ImportRecord = {
      id: 'imp-1',
      semesterId: semester.id,
      importedAt: '2026-09-09T10:00:00.000Z',
      schoolId: 'gdipu',
      adapterVersion: '0.1.0',
      pageUrl: 'https://jw.gdipu.edu.cn/xskbcx',
      courseCount: 8,
      sessionCount: 12,
      warningCount: 1,
      isMock: false,
    };
    await repo.saveImportRecord(record);
    const loaded = await repo.getImportRecords(semester.id);
    expect(loaded).toEqual([record]);
  });

  it('设置读写', async () => {
    await repo.setSetting('theme', 'dark');
    expect(await repo.getSetting<string>('theme')).toBe('dark');
    expect(await repo.getSetting('missing')).toBeUndefined();
  });
});

describe('backup 导入导出', () => {
  it('导出 → 清空 → 恢复 → 数据一致', async () => {
    await repo.saveSemester(semester);
    await repo.replaceSemesterCourses(semester.id, [makeCourse(1), makeCourse(2)]);
    await repo.setSetting('showWeekend', true);

    const backup = await exportBackupLocal(repo);
    expect(backup.format).toBe('campusschedule-backup');
    expect(backup.data.semesters).toHaveLength(1);
    expect(backup.data.coursesBySemester[semester.id]).toHaveLength(2);

    await repo.clearAll();
    expect(await repo.getSemesters()).toHaveLength(0);

    const { importBackup } = await import('./backup');
    await importBackup(repo, backup);
    expect(await repo.getSemesters()).toHaveLength(1);
    const courses = await repo.getCourses(semester.id);
    expect(courses).toHaveLength(2);
    expect(courses[0]!.sessions).toHaveLength(2);
    expect(await repo.getSetting('showWeekend')).toBe(true);
  });

  it('非法备份结构被拒绝', async () => {
    const { importBackup } = await import('./backup');
    await expect(importBackup(repo, { hello: 1 } as never)).rejects.toThrow();
  });
});

async function exportBackupLocal(repo: TimetableRepository) {
  const { exportBackup } = await import('./backup');
  return exportBackup(repo);
}
