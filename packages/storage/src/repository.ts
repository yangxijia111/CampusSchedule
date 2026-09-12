import type { Course, CourseSession, Semester } from '@campusschedule/core';
import type { CourseRow, ImportRecord, SchoolRecord } from './db';
import { CampusScheduleDB } from './db';

/**
 * 本地课表仓库：IndexedDB 持久化的唯一入口。
 * 所有写入按学期整体替换（幂等），刷新页面数据不丢失。
 */
export class TimetableRepository {
  constructor(public readonly db: CampusScheduleDB = new CampusScheduleDB()) {}

  /** 保存学校（不存在时写入）。 */
  async saveSchool(school: SchoolRecord): Promise<void> {
    await this.db.schools.put(school);
  }

  async getSchools(): Promise<SchoolRecord[]> {
    return this.db.schools.toArray();
  }

  async saveSemester(semester: Semester): Promise<void> {
    await this.db.semesters.put(semester);
  }

  async getSemesters(): Promise<Semester[]> {
    return this.db.semesters.toArray();
  }

  async getSemester(id: string): Promise<Semester | undefined> {
    return this.db.semesters.get(id);
  }

  /**
   * 整体替换某学期的课程数据（幂等）。
   * 删除旧数据与写入新数据在同一事务中完成；行内 semesterId 强制归一到目标学期。
   */
  async replaceSemesterCourses(semesterId: string, courses: Course[]): Promise<void> {
    await this.db.transaction('rw', this.db.courses, this.db.sessions, async () => {
      const oldCourseIds = await this.db.courses
        .where('semesterId')
        .equals(semesterId)
        .primaryKeys();
      for (const courseId of oldCourseIds) {
        await this.db.sessions.where('courseId').equals(courseId).delete();
      }
      await this.db.courses.bulkDelete(oldCourseIds);

      const courseRows: CourseRow[] = courses.map(({ sessions: _sessions, ...rest }) => ({
        ...rest,
        semesterId,
      }));
      const sessionRows: CourseSession[] = courses.flatMap((course) =>
        course.sessions.map((session) => ({ ...session, courseId: course.id })),
      );
      await this.db.courses.bulkPut(courseRows);
      await this.db.sessions.bulkPut(sessionRows);
    });
  }

  /** 读取某学期全部课程（含 sessions，按 id 还原顺序）。 */
  async getCourses(semesterId: string): Promise<Course[]> {
    const courseRows = await this.db.courses.where('semesterId').equals(semesterId).toArray();
    const courses: Course[] = [];
    for (const row of courseRows) {
      const sessions = await this.db.sessions.where('courseId').equals(row.id).toArray();
      courses.push({ ...row, sessions });
    }
    return courses;
  }

  /** 删除学期及其全部数据（级联）。 */
  async deleteSemester(semesterId: string): Promise<void> {
    await this.db.transaction(
      'rw',
      this.db.semesters,
      this.db.courses,
      this.db.sessions,
      this.db.imports,
      async () => {
        const courseIds = await this.db.courses
          .where('semesterId')
          .equals(semesterId)
          .primaryKeys();
        for (const courseId of courseIds) {
          await this.db.sessions.where('courseId').equals(courseId).delete();
        }
        await this.db.courses.bulkDelete(courseIds);
        await this.db.imports.where('semesterId').equals(semesterId).delete();
        await this.db.semesters.delete(semesterId);
      },
    );
  }

  async saveImportRecord(record: ImportRecord): Promise<void> {
    await this.db.imports.put(record);
  }

  async getImportRecords(semesterId: string): Promise<ImportRecord[]> {
    return this.db.imports.where('semesterId').equals(semesterId).toArray();
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    await this.db.settings.put({ key, value });
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    const row = await this.db.settings.get(key);
    return row?.value as T | undefined;
  }

  /** 清空全部本地数据。 */
  async clearAll(): Promise<void> {
    await this.db.transaction(
      'rw',
      this.db.schools,
      this.db.semesters,
      this.db.courses,
      this.db.sessions,
      async () => {
        await Promise.all([
          this.db.schools.clear(),
          this.db.semesters.clear(),
          this.db.courses.clear(),
          this.db.sessions.clear(),
        ]);
      },
    );
    await this.db.transaction('rw', this.db.imports, this.db.settings, async () => {
      await Promise.all([this.db.imports.clear(), this.db.settings.clear()]);
    });
  }
}
