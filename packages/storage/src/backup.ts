import type { Course, Semester } from '@campusschedule/core';
import { courseSchema, semesterSchema } from '@campusschedule/core';
import type { CourseRow, ImportRecord, SchoolRecord, SettingRow } from './db';
import type { TimetableRepository } from './repository';

/** 全量备份文件结构（JSON 导入/导出）。 */
export interface BackupFile {
  format: 'campusschedule-backup';
  version: 1;
  exportedAt: string;
  data: {
    schools: Array<{ id: string; displayName: string }>;
    semesters: Semester[];
    coursesBySemester: Record<string, Course[]>;
    imports: ImportRecord[];
    settings: SettingRow[];
  };
}

/** 备份内容摘要（恢复前给用户确认）。 */
export interface BackupSummary {
  schoolCount: number;
  semesterCount: number;
  courseCount: number;
  sessionCount: number;
  exportedAt: string;
}

export type BackupValidation =
  | { ok: true; backup: BackupFile; summary: BackupSummary }
  | { ok: false; error: string };

/** 从本地数据库导出全部数据为备份 JSON。 */
export async function exportBackup(repo: TimetableRepository): Promise<BackupFile> {
  const [schools, semesters, imports, settings] = await Promise.all([
    repo.db.schools.toArray(),
    repo.db.semesters.toArray(),
    repo.db.imports.toArray(),
    repo.db.settings.toArray(),
  ]);
  const coursesBySemester: Record<string, Course[]> = {};
  for (const semester of semesters) {
    coursesBySemester[semester.id] = await repo.getCourses(semester.id);
  }
  return {
    format: 'campusschedule-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { schools, semesters, coursesBySemester, imports, settings },
  };
}

/** 基本结构检查（信封字段）。 */
export function isValidBackupShape(input: unknown): input is BackupFile {
  if (typeof input !== 'object' || input === null) return false;
  const candidate = input as Partial<BackupFile>;
  return (
    candidate.format === 'campusschedule-backup' &&
    candidate.version === 1 &&
    typeof candidate.data === 'object' &&
    candidate.data !== null &&
    Array.isArray(candidate.data.semesters) &&
    typeof candidate.data.coursesBySemester === 'object'
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * 深度校验备份文件：结构、版本兼容、学期/课程 schema、引用完整性。
 * 全部通过才允许进入恢复（恢复会覆盖本地数据，必须 fail closed）。
 */
export function validateBackup(input: unknown): BackupValidation {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: '备份内容不是有效的 JSON 对象' };
  }
  const envelope = input as { format?: unknown; version?: unknown };
  if (envelope.format !== 'campusschedule-backup') {
    return { ok: false, error: '不是 CampusSchedule 备份文件（缺少格式标识）' };
  }
  if (envelope.version !== 1) {
    return {
      ok: false,
      error: '备份版本不兼容：v' + String(envelope.version) + '（当前应用支持 v1）',
    };
  }

  const data = (input as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: '备份数据主体缺失（data 字段）' };
  }
  const body = data as Record<string, unknown>;

  // 学校
  if (!Array.isArray(body.schools)) {
    return { ok: false, error: '备份中的学校列表（schools）不合法' };
  }
  for (const school of body.schools) {
    const record = school as Partial<SchoolRecord>;
    if (!isNonEmptyString(record.id) || !isNonEmptyString(record.displayName)) {
      return { ok: false, error: '备份中的学校记录缺少 id 或名称' };
    }
  }

  // 学期（复用 core schema）
  if (!Array.isArray(body.semesters) || body.semesters.length === 0) {
    return { ok: false, error: '备份中没有学期数据（semesters 为空）' };
  }
  const semesterIds = new Set<string>();
  for (const [index, semester] of body.semesters.entries()) {
    const check = semesterSchema.safeParse(semester);
    if (!check.success) {
      const issue = check.error.issues[0];
      return {
        ok: false,
        error: '第 ' + (index + 1) + ' 个学期数据不合法：' + (issue?.message ?? '结构错误'),
      };
    }
    if (semesterIds.has(check.data.id)) {
      return { ok: false, error: '备份中存在重复学期：' + check.data.displayName };
    }
    semesterIds.add(check.data.id);
  }

  // 课程（按学期分组 + 引用完整性）
  const coursesRaw = body.coursesBySemester;
  if (typeof coursesRaw !== 'object' || coursesRaw === null || Array.isArray(coursesRaw)) {
    return { ok: false, error: '备份中的课程数据（coursesBySemester）不合法' };
  }
  let courseCount = 0;
  let sessionCount = 0;
  for (const [semesterId, coursesOfSemester] of Object.entries(
    coursesRaw as Record<string, unknown>,
  )) {
    if (!semesterIds.has(semesterId)) {
      return { ok: false, error: '备份中的课程引用了不存在的学期：' + semesterId };
    }
    if (!Array.isArray(coursesOfSemester)) {
      return { ok: false, error: '学期 ' + semesterId + ' 的课程列表不合法' };
    }
    for (const [index, course] of coursesOfSemester.entries()) {
      const check = courseSchema.safeParse(course);
      if (!check.success) {
        const issue = check.error.issues[0];
        return {
          ok: false,
          error:
            '学期 ' + semesterId + ' 第 ' + (index + 1) + ' 门课程数据不合法：' +
            (issue?.message ?? '结构错误'),
        };
      }
      if (check.data.semesterId !== semesterId) {
        return {
          ok: false,
          error: '课程 ' + check.data.name + ' 的学期归属与分组不一致',
        };
      }
      courseCount += 1;
      sessionCount += check.data.sessions.length;
    }
  }

  // 导入记录（只校验基本形状，历史数据宽松处理）
  if (!Array.isArray(body.imports)) {
    return { ok: false, error: '备份中的导入历史（imports）不合法' };
  }
  for (const record of body.imports) {
    const candidate = record as Partial<ImportRecord>;
    if (
      !isNonEmptyString(candidate.id) ||
      !isNonEmptyString(candidate.semesterId) ||
      typeof candidate.isMock !== 'boolean'
    ) {
      return { ok: false, error: '导入历史记录不合法（缺少 id / semesterId / isMock）' };
    }
  }

  // 设置（键值对）
  if (!Array.isArray(body.settings)) {
    return { ok: false, error: '备份中的设置（settings）不合法' };
  }
  for (const setting of body.settings) {
    const candidate = setting as Partial<SettingRow>;
    if (!isNonEmptyString(candidate.key)) {
      return { ok: false, error: '设置记录不合法（缺少 key）' };
    }
  }

  const backup: BackupFile = {
    format: 'campusschedule-backup',
    version: 1,
    exportedAt:
      typeof (input as { exportedAt?: unknown }).exportedAt === 'string'
        ? ((input as { exportedAt: string }).exportedAt)
        : '',
    data: {
      schools: body.schools as SchoolRecord[],
      semesters: body.semesters as Semester[],
      coursesBySemester: coursesRaw as Record<string, Course[]>,
      imports: body.imports as ImportRecord[],
      settings: body.settings as SettingRow[],
    },
  };

  return {
    ok: true,
    backup,
    summary: {
      schoolCount: backup.data.schools.length,
      semesterCount: backup.data.semesters.length,
      courseCount,
      sessionCount,
      exportedAt: backup.exportedAt,
    },
  };
}

/**
 * 将备份 JSON 整体恢复到本地数据库。
 * 先完整校验，再在单个 Dexie 事务中“清空 + 写入”，
 * 任一步失败整体回滚，尽量保证旧数据不丢失。
 */
export async function importBackup(
  repo: TimetableRepository,
  backup: unknown,
): Promise<BackupSummary> {
  const validation = validateBackup(backup);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  const { data } = validation.backup;

  const courseRows: CourseRow[] = [];
  const sessionRows = [];
  for (const [semesterId, courses] of Object.entries(data.coursesBySemester)) {
    for (const course of courses) {
      const { sessions, ...rest } = course;
      courseRows.push({ ...rest, semesterId });
      for (const session of sessions) {
        sessionRows.push({ ...session, courseId: course.id });
      }
    }
  }

  const db = repo.db;
  await db.transaction(
    'rw',
    [db.schools, db.semesters, db.courses, db.sessions, db.imports, db.settings],
    async () => {
      await Promise.all([
        db.schools.clear(),
        db.semesters.clear(),
        db.courses.clear(),
        db.sessions.clear(),
        db.imports.clear(),
        db.settings.clear(),
      ]);
      await db.schools.bulkPut(data.schools);
      await db.semesters.bulkPut(data.semesters);
      await db.courses.bulkPut(courseRows);
      await db.sessions.bulkPut(sessionRows);
      await db.imports.bulkPut(data.imports);
      await db.settings.bulkPut(data.settings);
    },
  );

  return validation.summary;
}
