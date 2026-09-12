import { z } from 'zod';
import { teachingWeekSchema, periodNumberSchema, weekdaySchema } from './weekday';

/**
 * 课程的一次固定上课安排（同一课程可有多个 Session）。
 * 同一时间允许多个 Session 并存（冲突不丢弃，由 UI 标记）。
 */
export const courseSessionSchema = z
  .object({
    id: z.string().min(1),
    courseId: z.string().min(1),
    weekday: weekdaySchema,
    startPeriod: periodNumberSchema,
    endPeriod: periodNumberSchema,
    weeks: z.array(teachingWeekSchema).min(1),
    location: z.string().optional(),
    teacherNames: z.array(z.string().min(1)).optional(),
    rawText: z.string().optional(),
  })
  .strict()
  .refine((s) => s.endPeriod >= s.startPeriod, {
    message: 'endPeriod 不能小于 startPeriod',
    path: ['endPeriod'],
  });

export type CourseSession = z.infer<typeof courseSessionSchema>;
