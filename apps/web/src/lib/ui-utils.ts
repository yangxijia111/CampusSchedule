import type { CourseSlot } from '@campusschedule/core';
import { weekdayName } from '@campusschedule/core';

/** 按课程 ID 分配稳定颜色（8 色板）。 */
export function courseColorIndex(courseId: string): number {
  let hash = 0;
  for (let i = 0; i < courseId.length; i += 1) {
    hash = (hash * 31 + courseId.charCodeAt(i)) >>> 0;
  }
  return hash % 8;
}

/** 当前时间距 0 点的分钟数。 */
export function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** "HH:mm" → 分钟数。 */
export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

/**
 * 按 12/24 小时制格式化 "HH:mm" 时间。
 * 24 小时制原样返回；12 小时制输出中文上午/下午格式（如"下午 2:00"）。
 */
export function formatTime(time: string, use24Hour: boolean): string {
  if (use24Hour) return time;
  const total = timeToMinutes(time);
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const period = hour24 < 12 ? '上午' : '下午';
  // 0 点与 12 点在 12 小时制下都显示为 12
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return period + ' ' + hour12 + ':' + String(minute).padStart(2, '0');
}

/** 系统今天的 ISO 日期（本地时区）。 */
export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + '-' + month + '-' + day;
}

/** 今天是星期几（1 周一 … 7 周日）。 */
export function todayWeekday(): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const day = new Date().getDay();
  return (day === 0 ? 7 : day) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

/** 课程块提示文本。 */
export function slotTooltip(slot: CourseSlot): string {
  const { course, session } = slot;
  const parts = [
    course.name,
    weekdayName(session.weekday) + ' ' + session.startPeriod + '-' + session.endPeriod + '节',
  ];
  if (session.location) parts.push(session.location);
  const teachers = session.teacherNames ?? course.teacherNames;
  if (teachers.length > 0) parts.push(teachers.join('、'));
  return parts.join(' · ');
}
