import { z } from 'zod';

/**
 * 学期。
 * academicYear 形如 "2026-2027"；term：1 秋季 / 2 春季 / 3 短学期。
 * startDate 为第一教学周的周一（YYYY-MM-DD），缺失时日历相关功能需提示用户补全。
 */
export const semesterSchema = z
  .object({
    id: z.string().min(1),
    schoolId: z.string().min(1),
    academicYear: z.string().regex(/^\d{4}-\d{4}$/, '学年格式应为 YYYY-YYYY'),
    term: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    displayName: z.string().min(1),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD')
      .optional(),
    totalWeeks: z.number().int().min(1).max(60).optional(),
  })
  .strict();

export type Semester = z.infer<typeof semesterSchema>;
