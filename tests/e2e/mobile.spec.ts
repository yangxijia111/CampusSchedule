import { expect, test } from '@playwright/test';
import { loadDemoIfEmpty } from './helpers';

/**
 * Issue #6：移动端 mobile-first 课表 E2E（375×667）。
 * 默认今日纵向时间轴、无横向滚动、可切换明天/本周、课程可点击。
 */

test.use({ viewport: { width: 375, height: 667 } });

test.describe('移动端课表', () => {
  test('默认显示今日时间轴，主要内容无横向滚动', async ({ page }) => {
    await page.goto('/');
    await loadDemoIfEmpty(page);

    // 今日 / 明天 / 本周 三个页签可见，默认"今天"激活
    const tabs = page.locator('.mobile-tab');
    await expect(tabs).toHaveCount(3);
    await expect(page.getByRole('tab', { name: '今天' })).toHaveAttribute('aria-selected', 'true');

    // 周视图在移动端默认隐藏，纵向时间轴可见
    await expect(page.getByTestId('daily-list')).toBeVisible();
    await expect(page.locator('.week-view')).toBeHidden();

    // 主要内容无需横向滚动
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('切换明天与本周，课程可点击进入详情', async ({ page }) => {
    await page.goto('/');
    await loadDemoIfEmpty(page);

    // 明天
    await page.getByRole('tab', { name: '明天' }).click();
    await expect(page.getByTestId('daily-list')).toBeVisible();
    await expect(page.getByTestId('daily-list').locator('.daily-heading')).toBeVisible();

    // 本周：完整周表可见（允许容器内横向滚动）
    await page.getByRole('tab', { name: '本周' }).click();
    await expect(page.locator('.week-view')).toBeVisible();
    await expect(page.locator('.timetable')).toBeVisible();

    // 回到今天，点击课程进入详情
    await page.getByRole('tab', { name: '今天' }).click();
    const firstItem = page.locator('.daily-item').first();
    if (await firstItem.isVisible()) {
      await firstItem.click();
      await expect(page.getByText('上课时间', { exact: false })).toBeVisible();
    }
  });

  test('周切换在移动端仍可用', async ({ page }) => {
    await page.goto('/');
    await loadDemoIfEmpty(page);

    await page.getByRole('tab', { name: '本周' }).click();
    const weekLabel = page.locator('.week-label');
    const initial = await weekLabel.textContent();
    await page.getByRole('button', { name: '下一周' }).click();
    await expect(weekLabel).not.toHaveText(initial ?? '');
  });
});
