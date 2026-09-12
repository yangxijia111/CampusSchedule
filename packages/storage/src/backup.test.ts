// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Course, Semester } from '@campusschedule/core';
import { CampusScheduleDB, TimetableRepository } from './index';
import { exportBackup, importBackup, validateBackup } from './backup';

let db: CampusScheduleDB;
let repo: TimetableRepository;
let dbCounter = 0;

beforeEach(async () => {
  db = new CampusScheduleDB('backup-test-' + dbCounter++);
  repo = new TimetableRepository(db);
});

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
    ],
  };
}

async function seedRepo(): Promise<void> {
  await repo.saveSchool({ id: 'mock', displayName: '示例大学' });
  await repo.saveSemester(semester);
  await repo.replaceSemesterCourses(semester.id, [makeCourse(1), makeCourse(2)]);
}

describe('validateBackup', () => {
  it('合法备份通过校验并给出摘要', async () => {
    await seedRepo();
    const backup = await exportBackup(repo);
    const result = validateBackup(backup);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.semesterCount).toBe(1);
      expect(result.summary.courseCount).toBe(2);
      expect(result.summary.sessionCount).toBe(2);
    }
  });

  it('非备份 JSON / 缺少格式标识被拒绝', () => {
    expect(validateBackup({ hello: 1 }).ok).toBe(false);
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup('text').ok).toBe(false);
  });

  it('版本不兼容给出明确错误', () => {
    const result = validateBackup({
      format: 'campusschedule-backup',
      version: 2,
      data: { schools: [], semesters: [], coursesBySemester: {}, imports: [], settings: [] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('版本不兼容');
  });

  it('学期数据非法被拒绝', () => {
    const result = validateBackup({
      format: 'campusschedule-backup',
      version: 1,
      exportedAt: '2026-01-01T00:00:00Z',
      data: {
        schools: [],
        semesters: [{ id: 's', schoolId: 'x', academicYear: 'bad', term: 1, displayName: 'x' }],
        coursesBySemester: {},
        imports: [],
        settings: [],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('学期');
  });

  it('课程引用不存在的学期被拒绝（引用完整性）', () => {
    const result = validateBackup({
      format: 'campusschedule-backup',
      version: 1,
      data: {
        schools: [],
        semesters: [semester],
        coursesBySemester: {
          'other-semester': [makeCourse(1)],
        },
        imports: [],
        settings: [],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('不存在的学期');
  });

  it('课程缺少 sessions 被拒绝', () => {
    const broken = { ...makeCourse(1), sessions: [] };
    const result = validateBackup({
      format: 'campusschedule-backup',
      version: 1,
      data: {
        schools: [],
        semesters: [semester],
        coursesBySemester: { 'sem-1': [broken] },
        imports: [],
        settings: [],
      },
    });
    expect(result.ok).toBe(false);
  });

  it('空学期列表被拒绝（无意义恢复）', () => {
    const result = validateBackup({
      format: 'campusschedule-backup',
      version: 1,
      data: { schools: [], semesters: [], coursesBySemester: {}, imports: [], settings: [] },
    });
    expect(result.ok).toBe(false);
  });
});

describe('importBackup', () => {
  it('合法备份完整恢复（学校/学期/课程/设置）', async () => {
    await seedRepo();
    await repo.setSetting('settings.app', { reminderMinutes: 30 });
    const backup = await exportBackup(repo);

    // 写入新仓库再恢复
    const db2 = new CampusScheduleDB('backup-restore-' + dbCounter++);
    const repo2 = new TimetableRepository(db2);
    const summary = await importBackup(repo2, backup);
    expect(summary.courseCount).toBe(2);
    const semesters = await repo2.getSemesters();
    expect(semesters).toHaveLength(1);
    const courses = await repo2.getCourses('sem-1');
    expect(courses).toHaveLength(2);
    expect(courses[0]!.sessions).toHaveLength(1);
    expect(await repo2.getSetting('settings.app')).toEqual({ reminderMinutes: 30 });
  });

  it('校验失败时本地数据完全不变（fail closed）', async () => {
    await seedRepo();
    const before = await repo.getCourses('sem-1');

    await expect(
      importBackup(repo, {
        format: 'campusschedule-backup',
        version: 1,
        data: { schools: [], semesters: [], coursesBySemester: {}, imports: [], settings: [] },
      }),
    ).rejects.toThrow('学期');

    const after = await repo.getCourses('sem-1');
    expect(after).toEqual(before);
    expect(await repo.getSemesters()).toHaveLength(1);
  });

  it('损坏的版本号备份被拒绝且不落任何数据', async () => {
    await expect(
      importBackup(repo, { format: 'campusschedule-backup', version: 9, data: {} }),
    ).rejects.toThrow('版本不兼容');
    expect(await repo.getSemesters()).toHaveLength(0);
  });
});
