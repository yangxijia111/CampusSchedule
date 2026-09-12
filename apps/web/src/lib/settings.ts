/**
 * 应用设置：默认值定义与持久化合并逻辑（纯函数，便于单测）。
 */

export interface AppSettings {
  /** 上课前提醒分钟数。 */
  reminderMinutes: number;
  /** 是否显示周末列。 */
  showWeekend: boolean;
  /** 24 小时制。 */
  use24Hour: boolean;
  /** 每周起始日：1 周一 / 7 周日。 */
  weekStart: 1 | 7;
}

export const DEFAULT_SETTINGS: AppSettings = {
  reminderMinutes: 15,
  showWeekend: false,
  use24Hour: true,
  weekStart: 1,
};

/** IndexedDB 中应用设置的持久化键。 */
export const SETTINGS_KEY = 'settings.app';

/**
 * 将持久化的设置与默认值合并。
 * 整体结构非法时全部回落默认值；单个字段类型非法时仅该字段回落，
 * 避免旧版本或脏数据导致设置项整体丢失。
 */
export function mergeSettings(saved: unknown): AppSettings {
  const merged: AppSettings = { ...DEFAULT_SETTINGS };
  if (typeof saved !== 'object' || saved === null) return merged;
  const raw = saved as Record<string, unknown>;

  if (typeof raw.reminderMinutes === 'number' && Number.isFinite(raw.reminderMinutes)) {
    // 输入框可能产生越界值，落库前收敛到 0-120
    merged.reminderMinutes = Math.min(120, Math.max(0, Math.round(raw.reminderMinutes)));
  }
  if (typeof raw.showWeekend === 'boolean') merged.showWeekend = raw.showWeekend;
  if (typeof raw.use24Hour === 'boolean') merged.use24Hour = raw.use24Hour;
  if (raw.weekStart === 1 || raw.weekStart === 7) merged.weekStart = raw.weekStart;
  return merged;
}
