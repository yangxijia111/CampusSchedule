import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** 桌面默认周表视图，移动端（<768px）默认当日时间轴视图。 */
function mainContentLocator(page: Page) {
  const width = page.viewportSize()?.width ?? 1280;
  return width < 768 ? page.getByTestId('daily-list') : page.locator('.timetable');
}

/**
 * 从空状态显式加载示例课表。
 * 等待 hydrate 完成（空状态按钮或已有课表二选一先出现），仅空状态时点击按钮。
 */
export async function loadDemoIfEmpty(page: Page): Promise<void> {
  const demoButton = page.getByRole('button', { name: '体验示例课表' });
  const mainContent = mainContentLocator(page);
  await Promise.race([
    demoButton.waitFor({ state: 'visible' }),
    mainContent.waitFor({ state: 'visible' }),
  ]);
  if (await demoButton.isVisible()) {
    await demoButton.click();
  }
  await expect(mainContent).toBeVisible();
}
