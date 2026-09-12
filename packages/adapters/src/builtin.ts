import { gdipuAdapter } from './gdipu';
import { registerAdapter } from './registry';

/**
 * 内置适配器注册入口。
 * 课表解析器（Phase 7）在拿到真实脱敏快照之前保持 BLOCKED_BY_REAL_PAGE_FIXTURE。
 */
export function registerBuiltinAdapters(): void {
  registerAdapter(gdipuAdapter);
}
