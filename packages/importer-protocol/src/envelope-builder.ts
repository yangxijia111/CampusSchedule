import type { Course, ImportWarning, Semester } from '@campusschedule/core';
import { importEnvelopeSchema } from './envelope';
import type { ImportEnvelope } from './envelope';
import { IMPORT_PROTOCOL_VERSION } from './envelope';
import { sanitizePageUrl } from './url-sanitizer';

/**
 * 构造标准导入信封（扩展端导出 .campusschedule.json 时使用）。
 *
 * - pageUrl 自动脱敏（token/ticket/session/高熵参数）；
 * - 构造后立即用 schema 严格校验，任何字段非法都返回失败，不产出半成品。
 */
export function buildImportEnvelope(input: {
  schoolId: string;
  adapterVersion: string;
  pageUrl: string;
  semester: Semester;
  courses: Course[];
  warnings?: ImportWarning[];
}): { ok: true; envelope: ImportEnvelope } | { ok: false; error: string } {
  const candidate: ImportEnvelope = {
    protocolVersion: IMPORT_PROTOCOL_VERSION,
    source: {
      schoolId: input.schoolId,
      adapterVersion: input.adapterVersion,
      pageUrl: sanitizePageUrl(input.pageUrl),
      importedAt: new Date().toISOString(),
    },
    semester: input.semester,
    courses: input.courses,
    warnings: input.warnings ?? [],
  };

  const result = importEnvelopeSchema.safeParse(candidate);
  if (!result.success) {
    return { ok: false, error: '导入数据校验失败：' + result.error.message };
  }
  return { ok: true, envelope: result.data };
}

/** 信封保存为可下载文件的内容。 */
export function envelopeToFileContent(envelope: ImportEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

/** 标准导出文件名。 */
export function envelopeFileName(envelope: ImportEnvelope): string {
  const semesterKey =
    envelope.semester.academicYear.replace('/', '') + '-t' + envelope.semester.term;
  return envelope.source.schoolId + '-' + semesterKey + '.campusschedule.json';
}
