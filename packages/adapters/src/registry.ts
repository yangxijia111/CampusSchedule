import type { SchoolAdapter } from './types';

/**
 * 适配器注册表。扩展启动时注册全部内置适配器；
 * resolveAdapter 只按 URL 域名筛选，页面语义检测由 detectPage 完成。
 */
const adapters: SchoolAdapter[] = [];

export function registerAdapter(adapter: SchoolAdapter): void {
  if (adapters.some((a) => a.id === adapter.id)) {
    throw new Error('适配器重复注册: ' + adapter.id);
  }
  adapters.push(adapter);
}

export function listAdapters(): readonly SchoolAdapter[] {
  return [...adapters];
}

/** 按 URL 找到匹配的适配器；无匹配返回 null（不猜学校）。 */
export function resolveAdapter(
  location: Location | URL,
): SchoolAdapter | null {
  return adapters.find((a) => a.matchLocation(location)) ?? null;
}

/** 仅测试用：清空注册表。 */
export function resetAdaptersForTest(): void {
  adapters.length = 0;
}
