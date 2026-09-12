import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * 从空状态显式加载示例课表。
 * 等待 hydrate 完成（空状态按钮或已有课表二选一先出现），仅空状态时点击按钮。
 */
export async function loadDemoIfEmpty(page: Page): Promise<void> {
  const demoButton = page.getByRole('button', { name: '体验示例课表' });
  await Promise.race([
    demoButton.waitFor({ state: 'visible' }),
    page.locator('.timetable').waitFor({ state: 'visible' }),
  ]);
  if (await demoButton.isVisible()) {
    await demoButton.click();
  }
  await expect(page.locator('.timetable')).toBeVisible();
}
