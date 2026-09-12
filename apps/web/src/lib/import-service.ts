import type { Course } from '@campusschedule/core';
import { diffTimetables } from '@campusschedule/core';
import type { ImportEnvelope } from '@campusschedule/importer-protocol';
import { parseImportEnvelope, sanitizePageUrl } from '@campusschedule/importer-protocol';

/**
 * 导入文件解析与预览（Web 端导入中心的核心逻辑，纯函数便于测试）。
 */

export type ImportParseResult =
  | { ok: true; envelope: ImportEnvelope }
  | { ok: false; error: string };

/** 解析 .campusschedule.json 文件文本：JSON 语法错误与数据校验失败都必须显式报错。 */
export function parseImportFileContent(text: string): ImportParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: '文件不是合法的 JSON' };
  }
  const result = parseImportEnvelope(json);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.join('.');
    return {
      ok: false,
      error: '导入数据校验失败：' + (path ? '[' + path + '] ' : '') + (firstIssue?.message ?? '结构不合法'),
    };
  }
  // 接收端防御性脱敏：即使文件来源可信，也再清一次 URL 敏感参数
  result.data.source.pageUrl = sanitizePageUrl(result.data.source.pageUrl);
  return { ok: true, envelope: result.data };
}

export interface ImportAnomaly {
  suspicious: boolean;
  previousSessionCount: number;
  newSessionCount: number;
  message?: string;
}

export interface ImportDiffSummary {
  added: number;
  removed: number;
  changed: number;
  changedFields: string[];
}

export interface ImportPreview {
  schoolId: string;
  adapterVersion: string;
  importedAt: string;
  pageUrl: string;
  semesterDisplayName: string;
  academicYear: string;
  term: number;
  startDate?: string;
  totalWeeks?: number;
  courseCount: number;
  sessionCount: number;
  warningCount: number;
  warnings: ImportEnvelope['warnings'];
  anomaly: ImportAnomaly;
  /** 与本地已有课表的差异（同学期才有）。 */
  diff: ImportDiffSummary | null;
}

/**
 * 数据量异常检查（07 测试计划 §6）：
 * 旧课表 Session 数量健康（≥10）而新导入骤降一半以上时，
 * 判定为可疑（可能是教务页面结构变化），UI 必须阻止静默覆盖。
 */
export function buildImportPreview(
  envelope: ImportEnvelope,
  previousCourses?: Course[],
): ImportPreview {
  const sessionCount = envelope.courses.reduce((sum, course) => sum + course.sessions.length, 0);
  const previous = previousCourses ?? [];
  const previousSessionCount = previous.reduce((sum, course) => sum + course.sessions.length, 0);
  const suspicious = previousSessionCount >= 10 && sessionCount < previousSessionCount * 0.5;

  let diff: ImportDiffSummary | null = null;
  if (previous.length > 0) {
    const result = diffTimetables(previous, envelope.courses);
    diff = {
      added: result.added.length,
      removed: result.removed.length,
      changed: result.changed.length,
      changedFields: [...new Set(result.changed.flatMap((c) => c.fields))],
    };
  }

  return {
    schoolId: envelope.source.schoolId,
    adapterVersion: envelope.source.adapterVersion,
    importedAt: envelope.source.importedAt,
    pageUrl: envelope.source.pageUrl,
    semesterDisplayName: envelope.semester.displayName,
    academicYear: envelope.semester.academicYear,
    term: envelope.semester.term,
    startDate: envelope.semester.startDate,
    totalWeeks: envelope.semester.totalWeeks,
    courseCount: envelope.courses.length,
    sessionCount,
    warningCount: envelope.warnings.length,
    warnings: envelope.warnings,
    anomaly: {
      suspicious,
      previousSessionCount,
      newSessionCount: sessionCount,
      message: suspicious
        ? '新课表数据量异常（' + previousSessionCount + ' → ' + sessionCount + ' 个时段），可能是教务页面结构变化。请确认解析结果后再覆盖。'
        : undefined,
    },
    diff,
  };
}
