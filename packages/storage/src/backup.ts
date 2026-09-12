import type { Course, Semester } from '@campusschedule/core';
import type { ImportRecord, SettingRow } from './db';
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

/** 基本结构校验（完整数据校验由 Zod schema 在 Web 端进行）。 */
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

/** 将备份 JSON 整体恢复到本地数据库（先清空再写入）。 */
export async function importBackup(
  repo: TimetableRepository,
  backup: BackupFile,
): Promise<void> {
  if (!isValidBackupShape(backup)) {
    throw new Error('备份文件结构不合法');
  }
  await repo.clearAll();
  const { schools, semesters, coursesBySemester, imports, settings } = backup.data;
  for (const school of schools) {
    await repo.saveSchool(school);
  }
  for (const semester of semesters) {
    await repo.saveSemester(semester);
    await repo.replaceSemesterCourses(
      semester.id,
      coursesBySemester[semester.id] ?? [],
    );
  }
  for (const record of imports) {
    await repo.saveImportRecord(record);
  }
  for (const setting of settings) {
    await repo.setSetting(setting.key, setting.value);
  }
}
