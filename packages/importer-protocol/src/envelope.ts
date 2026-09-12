import { z } from 'zod';
import { courseSchema, semesterSchema, importWarningSchema } from '@campusschedule/core';

/**
 * 扩展 → Web 的标准导入协议（首版：JSON 文件 `.campusschedule.json`）。
 *
 * 安全要求：
 * - pageUrl 必须已经过脱敏（去除 token/ticket/session 等敏感参数），
 *   发送端负责调用 sanitizePageUrl，接收端 parse 时也会再校验一次。
 */
export const IMPORT_PROTOCOL_VERSION = 1;

export const importSourceSchema = z
  .object({
    schoolId: z.string().min(1),
    adapterVersion: z.string().min(1),
    pageUrl: z.string().min(1),
    importedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type ImportSource = z.infer<typeof importSourceSchema>;

export const importEnvelopeSchema = z
  .object({
    protocolVersion: z.literal(IMPORT_PROTOCOL_VERSION),
    source: importSourceSchema,
    semester: semesterSchema,
    courses: z.array(courseSchema),
    warnings: z.array(importWarningSchema),
  })
  .strict();

export type ImportEnvelope = z.infer<typeof importEnvelopeSchema>;

/** 校验外部 JSON：任何结构/类型错误都必须失败，不得静默吞掉。 */
export function parseImportEnvelope(input: unknown) {
  return importEnvelopeSchema.safeParse(input);
}
