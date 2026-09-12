import { z } from 'zod';
import { courseSessionSchema } from './course-session';

/**
 * 课程。课程与上课时间分离：同一门课可以周一 1-2 节、周三 3-4 节，
 * 或不同周次在不同教室，均通过多个 CourseSession 表达。
 */
export const courseSchema = z
  .object({
    id: z.string().min(1),
    semesterId: z.string().min(1),
    name: z.string().min(1),
    courseCode: z.string().min(1).optional(),
    teacherNames: z.array(z.string().min(1)),
    credit: z.number().nonnegative().optional(),
    category: z.string().min(1).optional(),
    sessions: z.array(courseSessionSchema).min(1),
    note: z.string().optional(),
  })
  .strict();

export type Course = z.infer<typeof courseSchema>;
