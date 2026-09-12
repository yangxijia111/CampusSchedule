import type { Course } from './course';
import type { Semester } from './semester';

/**
 * Adapter 归一化输出：学期 + 课程列表。
 * Adapter 层的中间产物，进入存储前由导入协议再次校验。
 */
export interface NormalizedTimetable {
  semester: Semester;
  courses: Course[];
}
