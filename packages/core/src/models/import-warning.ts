import { z } from 'zod';

/**
 * 导入警告：解析器无法确定字段时宁可产生 warning，也不能自行补值。
 */
export const importWarningCodes = [
  'UNKNOWN_WEEK_FORMAT',
  'UNKNOWN_PERIOD_FORMAT',
  'MISSING_LOCATION',
  'MISSING_TEACHER',
  'AMBIGUOUS_CELL',
  'ADAPTER_OUTDATED',
] as const;

export type ImportWarningCode = (typeof importWarningCodes)[number];

export const importWarningSchema = z
  .object({
    code: z.enum(importWarningCodes),
    message: z.string().min(1),
    raw: z.string().optional(),
  })
  .strict();

export type ImportWarning = z.infer<typeof importWarningSchema>;

/** 解析失败的错误信息（区别于 warning：错误表示整体解析不可信）。 */
export interface ParseError {
  code: string;
  message: string;
  raw?: string;
}

/** Adapter 解析结果：失败时必须显式失败，禁止“失败后返回空数据当作成功”。 */
export type ParseResult<T> =
  | { ok: true; data: T; warnings: ImportWarning[] }
  | { ok: false; error: ParseError };

export function parseSuccess<T>(data: T, warnings: ImportWarning[] = []): ParseResult<T> {
  return { ok: true, data, warnings };
}

export function parseFailure<T>(error: ParseError): ParseResult<T> {
  return { ok: false, error };
}
