import { z } from 'zod';

/**
 * 星期：1 = 周一 …… 7 = 周日。
 * 与课表列、日历计算保持同一编码，禁止出现 0。
 */
export const weekdaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

export type Weekday = z.infer<typeof weekdaySchema>;

/** 教学周次编号：从第 1 周开始，上限防御异常数据。 */
export const teachingWeekSchema = z.number().int().min(1).max(60);

/** 节次编号：从第 1 节开始，上限防御异常数据。 */
export const periodNumberSchema = z.number().int().min(1).max(30);

const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

export function weekdayName(weekday: Weekday): string {
  const name = WEEKDAY_NAMES[weekday - 1];
  if (!name) {
    throw new RangeError(`非法的星期编号: ${weekday}`);
  }
  return name;
}

export function isWeekday(value: unknown): value is Weekday {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7
  );
}
